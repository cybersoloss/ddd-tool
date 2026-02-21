#!/usr/bin/env npx tsx
/**
 * DDD Tool — Auto-Test Runner
 *
 * Validates a DDD project's spec files programmatically:
 *   1. Parse — reads every YAML file, reports parse errors
 *   2. Normalize — runs normalizeFlowDocument on flows, reports issues
 *   3. Validate — runs flow/domain/system validators, aggregates issues
 *   4. Coverage — measures node-type, spec-field, and branch coverage
 *
 * Produces two reports:
 *   - tool-compatibility-report.yaml  (can the tool handle these files?)
 *   - spec-quality-report.yaml        (how good are the specs?)
 *
 * Usage:
 *   npx tsx tests/e2e/auto-test-runner.ts <project-path>
 *   npm run test:specs -- <project-path>
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename, extname } from 'node:path';
import { parse, stringify } from 'yaml';
import { normalizeFlowDocument } from '../../src/utils/flow-normalizer.ts';
import { validateFlow, validateDomain, validateSystem } from '../../src/utils/flow-validator.ts';
import type { FlowDocument, DddNodeType, DddFlowNode } from '../../src/types/flow.ts';
import type { DomainConfig, DomainFlowEntry, EventWiring } from '../../src/types/domain.ts';
import type { SchemaSpec } from '../../src/types/specs.ts';
import type { ValidationResult, ValidationIssue } from '../../src/types/validation.ts';

// ─── CLI ────────────────────────────────────────────────────────────────

const projectPath = process.argv[2];
if (!projectPath) {
  console.error('Usage: npx tsx tests/e2e/auto-test-runner.ts <project-path>');
  process.exit(1);
}

const absPath = projectPath.startsWith('/') ? projectPath : join(process.cwd(), projectPath);
if (!existsSync(absPath)) {
  console.error(`Project path does not exist: ${absPath}`);
  process.exit(1);
}

console.log(`\n  DDD Tool Auto-Test Runner`);
console.log(`  Project: ${absPath}\n`);

// ─── File discovery ─────────────────────────────────────────────────────

interface FileEntry {
  path: string;
  relPath: string;
  category: 'flow' | 'domain' | 'schema' | 'system' | 'config' | 'ui' | 'infrastructure' | 'shared' | 'other';
  domainId?: string;
  flowId?: string;
}

function discoverYamlFiles(root: string): FileEntry[] {
  const entries: FileEntry[] = [];

  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        // Skip hidden dirs and node_modules
        if (!name.startsWith('.') && name !== 'node_modules') walk(full);
      } else if (extname(name) === '.yaml' || extname(name) === '.yml') {
        const rel = relative(root, full);
        entries.push({ path: full, relPath: rel, category: categorize(rel) });
      }
    }
  }

  function categorize(rel: string): FileEntry['category'] {
    if (rel.match(/^specs\/domains\/[^/]+\/flows\//)) return 'flow';
    if (rel.match(/^specs\/domains\/[^/]+\/domain\.yaml$/)) return 'domain';
    if (rel.match(/^specs\/schemas\//)) return 'schema';
    if (rel.match(/^specs\/system\.yaml$/)) return 'system';
    if (rel.match(/^specs\/config\.yaml$/) || rel.match(/^specs\/architecture\.yaml$/)) return 'config';
    if (rel.match(/^specs\/ui\//)) return 'ui';
    if (rel.match(/^specs\/infrastructure\.yaml$/)) return 'infrastructure';
    if (rel.match(/^specs\/shared\//)) return 'shared';
    return 'other';
  }

  walk(join(root, 'specs'));

  // Enrich flow/domain entries with IDs
  for (const entry of entries) {
    const parts = entry.relPath.split('/');
    if (entry.category === 'flow') {
      // specs/domains/{domainId}/flows/{flowId}.yaml
      entry.domainId = parts[2];
      entry.flowId = basename(parts[parts.length - 1], extname(parts[parts.length - 1]));
    } else if (entry.category === 'domain') {
      entry.domainId = parts[2];
    }
  }

  return entries;
}

// ─── Phase 1: Parse ─────────────────────────────────────────────────────

interface ParseResult {
  file: string;
  success: boolean;
  error?: string;
  raw?: Record<string, unknown>;
}

function parseAll(files: FileEntry[]): ParseResult[] {
  return files.map((f) => {
    try {
      const content = readFileSync(f.path, 'utf-8');
      const raw = parse(content) as Record<string, unknown>;
      if (raw === null || raw === undefined) {
        return { file: f.relPath, success: false, error: 'YAML parsed to null/undefined' };
      }
      return { file: f.relPath, success: true, raw };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { file: f.relPath, success: false, error: msg };
    }
  });
}

// ─── Phase 2: Normalize ─────────────────────────────────────────────────

interface NormalizeResult {
  file: string;
  domainId: string;
  flowId: string;
  success: boolean;
  error?: string;
  doc?: FlowDocument;
  nodeCount: number;
  connectionCount: number;
  nodeTypes: string[];
}

function normalizeFlows(files: FileEntry[], parseResults: ParseResult[]): NormalizeResult[] {
  const results: NormalizeResult[] = [];
  const flowFiles = files.filter((f) => f.category === 'flow');

  for (const file of flowFiles) {
    const pr = parseResults.find((p) => p.file === file.relPath);
    if (!pr?.success || !pr.raw) {
      results.push({
        file: file.relPath,
        domainId: file.domainId ?? '',
        flowId: file.flowId ?? '',
        success: false,
        error: 'Parse failed — skipped',
        nodeCount: 0,
        connectionCount: 0,
        nodeTypes: [],
      });
      continue;
    }

    try {
      const flowType = pr.raw.flow
        ? ((pr.raw.flow as Record<string, unknown>).type as string) ?? 'traditional'
        : 'traditional';

      const doc = normalizeFlowDocument(pr.raw, file.domainId!, file.flowId!, flowType);
      const allNodes = [doc.trigger, ...doc.nodes];
      const connCount = allNodes.reduce((acc, n) => acc + (n.connections?.length ?? 0), 0);
      const types = [...new Set(allNodes.map((n) => n.type))];

      results.push({
        file: file.relPath,
        domainId: file.domainId!,
        flowId: file.flowId!,
        success: true,
        doc,
        nodeCount: allNodes.length,
        connectionCount: connCount,
        nodeTypes: types,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        file: file.relPath,
        domainId: file.domainId ?? '',
        flowId: file.flowId ?? '',
        success: false,
        error: msg,
        nodeCount: 0,
        connectionCount: 0,
        nodeTypes: [],
      });
    }
  }

  return results;
}

// ─── Phase 3: Validate ──────────────────────────────────────────────────

interface DomainInfo {
  domainId: string;
  config: DomainConfig;
  flowDocs: FlowDocument[];
}

function loadDomainConfigs(
  files: FileEntry[],
  parseResults: ParseResult[],
  normalizeResults: NormalizeResult[]
): DomainInfo[] {
  const domainFiles = files.filter((f) => f.category === 'domain');
  const domains: DomainInfo[] = [];

  for (const df of domainFiles) {
    const pr = parseResults.find((p) => p.file === df.relPath);
    if (!pr?.success || !pr.raw) continue;

    const raw = pr.raw as Record<string, unknown>;
    const domainId = df.domainId!;

    // Build DomainConfig from raw YAML
    const config: DomainConfig = {
      name: (raw.name as string) ?? domainId,
      description: raw.description as string | undefined,
      role: raw.role as DomainConfig['role'],
      owns_schemas: raw.owns_schemas as string[] | undefined,
      flows: ((raw.flows as Array<Record<string, unknown>>) ?? []).map((f): DomainFlowEntry => ({
        id: (f.id as string) ?? '',
        name: (f.name as string) ?? '',
        description: f.description as string | undefined,
        type: (f.type as 'traditional' | 'agent') ?? 'traditional',
        tags: f.tags as string[] | undefined,
        group: f.group as string | undefined,
      })),
      publishes_events: ((raw.publishes_events as Array<Record<string, unknown>>) ?? []).map((e): EventWiring => ({
        event: (e.event as string) ?? '',
        payload: e.payload as Record<string, unknown> | undefined,
        from_flow: e.from_flow as string | undefined,
        description: e.description as string | undefined,
      })),
      consumes_events: ((raw.consumes_events as Array<Record<string, unknown>>) ?? []).map((e): EventWiring => ({
        event: (e.event as string) ?? '',
        payload: e.payload as Record<string, unknown> | undefined,
        handled_by_flow: e.handled_by_flow as string | undefined,
        description: e.description as string | undefined,
      })),
      layout: { flows: {}, portals: {} },
      event_groups: raw.event_groups as DomainConfig['event_groups'],
      stores: raw.stores as DomainConfig['stores'],
    };

    // Collect flow docs for this domain
    const flowDocs = normalizeResults
      .filter((nr) => nr.domainId === domainId && nr.success && nr.doc)
      .map((nr) => nr.doc!);

    domains.push({ domainId, config, flowDocs });
  }

  return domains;
}

function loadSchemas(files: FileEntry[], parseResults: ParseResult[]): Record<string, SchemaSpec> {
  const schemas: Record<string, SchemaSpec> = {};
  for (const f of files.filter((f) => f.category === 'schema')) {
    const pr = parseResults.find((p) => p.file === f.relPath);
    if (!pr?.success || !pr.raw) continue;
    const name = basename(f.relPath, extname(f.relPath));
    schemas[name] = pr.raw as unknown as SchemaSpec;
  }
  return schemas;
}

function runValidation(
  domains: DomainInfo[],
  schemas: Record<string, SchemaSpec>
): {
  flowResults: ValidationResult[];
  domainResults: ValidationResult[];
  systemResult: ValidationResult;
} {
  const allDomainConfigs: Record<string, DomainConfig> = {};
  for (const d of domains) allDomainConfigs[d.domainId] = d.config;

  const flowResults: ValidationResult[] = [];
  const domainResults: ValidationResult[] = [];

  for (const domain of domains) {
    // Validate each flow
    for (const doc of domain.flowDocs) {
      flowResults.push(validateFlow(doc, allDomainConfigs));
    }

    // Validate domain
    domainResults.push(
      validateDomain(domain.domainId, domain.config, allDomainConfigs, domain.flowDocs)
    );
  }

  // Validate system
  const allFlowDocs = domains.flatMap((d) => d.flowDocs);
  const systemResult = validateSystem(allDomainConfigs, {
    schemas,
    flowDocs: allFlowDocs,
  });

  return { flowResults, domainResults, systemResult };
}

// ─── Phase 4: Coverage ──────────────────────────────────────────────────

const ALL_NODE_TYPES: DddNodeType[] = [
  'trigger', 'input', 'process', 'decision', 'terminal',
  'data_store', 'service_call', 'event', 'loop', 'parallel', 'sub_flow', 'llm_call',
  'delay', 'cache', 'transform', 'collection', 'parse', 'crypto', 'batch', 'transaction',
  'ipc_call',
  'agent_loop', 'guardrail', 'human_gate',
  'orchestrator', 'smart_router', 'handoff', 'agent_group',
];

interface CoverageReport {
  node_types: {
    total_defined: number;
    total_used: number;
    coverage_pct: number | null;
    coverage_note: string;
    used: string[];
    unused: string[];
    usage_counts: Record<string, number>;
  };
  spec_fields: {
    total_nodes: number;
    nodes_with_description: number;
    description_pct: number;
    triggers_with_event: number;
    triggers_total: number;
    decisions_with_condition: number;
    decisions_total: number;
  };
  connections: {
    total_connections: number;
    total_nodes: number;
    avg_connections_per_node: number;
    dead_end_nodes: number;
    orphaned_nodes: number;
  };
  flows: {
    total: number;
    traditional: number;
    agent: number;
    with_errors: number;
    with_warnings: number;
    clean: number;
  };
}

function computeCoverage(
  normalizeResults: NormalizeResult[],
  flowResults: ValidationResult[]
): CoverageReport {
  const usageCounts: Record<string, number> = {};
  let totalNodes = 0;
  let totalConnections = 0;
  let nodesWithDescription = 0;
  let triggersWithEvent = 0;
  let triggersTotal = 0;
  let decisionsWithCondition = 0;
  let decisionsTotal = 0;
  let deadEndNodes = 0;
  let orphanedCount = 0;
  let traditional = 0;
  let agent = 0;

  for (const nr of normalizeResults) {
    if (!nr.success || !nr.doc) continue;
    const doc = nr.doc;
    const allNodes: DddFlowNode[] = [doc.trigger, ...doc.nodes];

    if (doc.flow?.type === 'agent') agent++;
    else traditional++;

    for (const node of allNodes) {
      totalNodes++;
      usageCounts[node.type] = (usageCounts[node.type] ?? 0) + 1;

      const spec = (node.spec ?? {}) as Record<string, unknown>;
      if (spec.description && typeof spec.description === 'string' && spec.description.trim()) {
        nodesWithDescription++;
      }

      if (node.type === 'trigger') {
        triggersTotal++;
        const event = spec.event;
        if (event && (typeof event === 'string' ? event.trim() !== '' : Array.isArray(event) && event.length > 0)) {
          triggersWithEvent++;
        }
      }

      if (node.type === 'decision') {
        decisionsTotal++;
        if (spec.condition && typeof spec.condition === 'string' && spec.condition.trim()) {
          decisionsWithCondition++;
        }
      }

      totalConnections += node.connections?.length ?? 0;

      // Dead-end: non-terminal with no outgoing
      if (node.type !== 'terminal' && node.type !== 'loop' && node.type !== 'parallel') {
        if ((node.connections?.length ?? 0) === 0 && node.type !== 'trigger') {
          deadEndNodes++;
        }
      }
    }

    // Count orphaned from validation
    // (we'll count from validation results instead)
  }

  // Count orphaned from flow validation results
  for (const fr of flowResults) {
    orphanedCount += fr.issues.filter((i) =>
      i.message.includes('unreachable from the trigger')
    ).length;
  }

  const usedTypes = Object.keys(usageCounts).sort();
  const unusedTypes = ALL_NODE_TYPES.filter((t) => !usageCounts[t]);

  const withErrors = flowResults.filter((r) => r.errorCount > 0).length;
  const withWarnings = flowResults.filter((r) => r.warningCount > 0 && r.errorCount === 0).length;
  const clean = flowResults.filter((r) => r.errorCount === 0 && r.warningCount === 0).length;

  const flowCount = normalizeResults.filter((r) => r.success).length;
  const COVERAGE_THRESHOLD = 5;
  const coverageMeaningful = flowCount >= COVERAGE_THRESHOLD;

  return {
    node_types: {
      total_defined: ALL_NODE_TYPES.length,
      total_used: usedTypes.length,
      coverage_pct: coverageMeaningful
        ? Math.round((usedTypes.length / ALL_NODE_TYPES.length) * 100)
        : null,
      coverage_note: coverageMeaningful
        ? `${usedTypes.length}/${ALL_NODE_TYPES.length} catalog node types used across ${flowCount} flows`
        : `Insufficient flows (${flowCount} < ${COVERAGE_THRESHOLD}) to measure catalog coverage`,
      used: usedTypes,
      unused: unusedTypes,
      usage_counts: usageCounts,
    },
    spec_fields: {
      total_nodes: totalNodes,
      nodes_with_description: nodesWithDescription,
      description_pct: totalNodes > 0 ? Math.round((nodesWithDescription / totalNodes) * 100) : 0,
      triggers_with_event: triggersWithEvent,
      triggers_total: triggersTotal,
      decisions_with_condition: decisionsWithCondition,
      decisions_total: decisionsTotal,
    },
    connections: {
      total_connections: totalConnections,
      total_nodes: totalNodes,
      avg_connections_per_node: totalNodes > 0 ? Math.round((totalConnections / totalNodes) * 100) / 100 : 0,
      dead_end_nodes: deadEndNodes,
      orphaned_nodes: orphanedCount,
    },
    flows: {
      total: normalizeResults.filter((r) => r.success).length,
      traditional,
      agent,
      with_errors: withErrors,
      with_warnings: withWarnings,
      clean,
    },
  };
}

// ─── Report generation ──────────────────────────────────────────────────

function issueToPlain(i: ValidationIssue) {
  const out: Record<string, unknown> = {
    severity: i.severity,
    category: i.category,
    message: i.message,
  };
  if (i.suggestion) out.suggestion = i.suggestion;
  if (i.nodeId) out.node_id = i.nodeId;
  if (i.flowId) out.flow_id = i.flowId;
  if (i.domainId) out.domain_id = i.domainId;
  return out;
}

function generateCompatibilityReport(
  files: FileEntry[],
  parseResults: ParseResult[],
  normalizeResults: NormalizeResult[]
) {
  const filesByCategory: Record<string, number> = {};
  for (const f of files) {
    filesByCategory[f.category] = (filesByCategory[f.category] ?? 0) + 1;
  }

  const parseSuccessCount = parseResults.filter((p) => p.success).length;
  const parseFailCount = parseResults.filter((p) => !p.success).length;
  const normSuccessCount = normalizeResults.filter((n) => n.success).length;
  const normFailCount = normalizeResults.filter((n) => !n.success).length;

  return {
    report: 'tool-compatibility-report',
    generated_at: new Date().toISOString(),
    project: absPath,

    summary: {
      total_files: files.length,
      files_by_category: filesByCategory,
      parse: {
        success: parseSuccessCount,
        failed: parseFailCount,
        success_rate_pct: Math.round((parseSuccessCount / files.length) * 100),
      },
      normalize: {
        total_flows: normalizeResults.length,
        success: normSuccessCount,
        failed: normFailCount,
        success_rate_pct: normalizeResults.length > 0
          ? Math.round((normSuccessCount / normalizeResults.length) * 100)
          : 100,
      },
    },

    parse_failures: parseResults
      .filter((p) => !p.success)
      .map((p) => ({ file: p.file, error: p.error })),

    normalize_failures: normalizeResults
      .filter((n) => !n.success)
      .map((n) => ({ file: n.file, domain: n.domainId, flow: n.flowId, error: n.error })),

    normalize_details: normalizeResults
      .filter((n) => n.success)
      .map((n) => ({
        file: n.file,
        domain: n.domainId,
        flow: n.flowId,
        nodes: n.nodeCount,
        connections: n.connectionCount,
        node_types: n.nodeTypes,
      })),

    compatibility_verdict: parseFailCount === 0 && normFailCount === 0
      ? 'FULLY_COMPATIBLE'
      : normFailCount === 0
        ? 'COMPATIBLE_WITH_PARSE_ISSUES'
        : 'PARTIAL_COMPATIBILITY',
  };
}

function generateQualityReport(
  flowResults: ValidationResult[],
  domainResults: ValidationResult[],
  systemResult: ValidationResult,
  coverage: CoverageReport
) {
  const allIssues = [
    ...flowResults.flatMap((r) => r.issues),
    ...domainResults.flatMap((r) => r.issues),
    ...systemResult.issues,
  ];

  const totalErrors = allIssues.filter((i) => i.severity === 'error').length;
  const totalWarnings = allIssues.filter((i) => i.severity === 'warning').length;
  const totalInfo = allIssues.filter((i) => i.severity === 'info').length;

  // Aggregate by category
  const byCategory: Record<string, { errors: number; warnings: number; info: number }> = {};
  for (const i of allIssues) {
    if (!byCategory[i.category]) byCategory[i.category] = { errors: 0, warnings: 0, info: 0 };
    if (i.severity === 'error') byCategory[i.category].errors++;
    else if (i.severity === 'warning') byCategory[i.category].warnings++;
    else byCategory[i.category].info++;
  }

  // Quality score: per-flow penalty normalized by flow count.
  // 0 flows → 0 score (nothing to validate). Otherwise:
  // deduct (errors * 5 + warnings * 1) / max(flowCount, 5) from 100.
  // The floor of 5 prevents tiny projects from being overly penalized.
  const flowCount = coverage.flows.total;
  const denominator = Math.max(flowCount, 5);
  const rawScore = flowCount === 0
    ? 0
    : 100 - ((totalErrors * 5 + totalWarnings * 1) / denominator) * 10;
  const qualityScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    report: 'spec-quality-report',
    generated_at: new Date().toISOString(),
    project: absPath,

    summary: {
      quality_score: qualityScore,
      total_issues: allIssues.length,
      errors: totalErrors,
      warnings: totalWarnings,
      info: totalInfo,
      issues_by_category: byCategory,
    },

    coverage,

    flow_validation: flowResults.map((r) => ({
      flow: r.targetId,
      valid: r.isValid,
      errors: r.errorCount,
      warnings: r.warningCount,
      issues: r.issues.map(issueToPlain),
    })),

    domain_validation: domainResults.map((r) => ({
      domain: r.targetId,
      valid: r.isValid,
      errors: r.errorCount,
      warnings: r.warningCount,
      issues: r.issues.map(issueToPlain),
    })),

    system_validation: {
      valid: systemResult.isValid,
      errors: systemResult.errorCount,
      warnings: systemResult.warningCount,
      issues: systemResult.issues.map(issueToPlain),
    },

    quality_verdict: qualityScore >= 90
      ? 'EXCELLENT'
      : qualityScore >= 70
        ? 'GOOD'
        : qualityScore >= 50
          ? 'NEEDS_IMPROVEMENT'
          : 'POOR',
  };
}

// ─── Main ───────────────────────────────────────────────────────────────

const startTime = Date.now();

// 1. Discover files
console.log('  [1/4] Discovering YAML files...');
const files = discoverYamlFiles(absPath);
console.log(`        Found ${files.length} YAML files`);

// 2. Parse
console.log('  [2/4] Parsing YAML...');
const parseResults = parseAll(files);
const parseFailed = parseResults.filter((p) => !p.success);
console.log(`        Parsed: ${parseResults.filter((p) => p.success).length} OK, ${parseFailed.length} failed`);
if (parseFailed.length > 0) {
  for (const f of parseFailed) console.log(`        FAIL: ${f.file} — ${f.error}`);
}

// 3. Normalize flows
console.log('  [3/4] Normalizing flow documents...');
const normalizeResults = normalizeFlows(files, parseResults);
const normFailed = normalizeResults.filter((n) => !n.success);
console.log(`        Normalized: ${normalizeResults.filter((n) => n.success).length} OK, ${normFailed.length} failed`);
if (normFailed.length > 0) {
  for (const f of normFailed) console.log(`        FAIL: ${f.file} — ${f.error}`);
}

// 4. Validate
console.log('  [4/4] Running validation...');
const domains = loadDomainConfigs(files, parseResults, normalizeResults);
const schemas = loadSchemas(files, parseResults);
const { flowResults, domainResults, systemResult } = runValidation(domains, schemas);
const coverage = computeCoverage(normalizeResults, flowResults);

const totalErrors = flowResults.reduce((a, r) => a + r.errorCount, 0)
  + domainResults.reduce((a, r) => a + r.errorCount, 0)
  + systemResult.errorCount;
const totalWarnings = flowResults.reduce((a, r) => a + r.warningCount, 0)
  + domainResults.reduce((a, r) => a + r.warningCount, 0)
  + systemResult.warningCount;

console.log(`        Flows: ${flowResults.length} validated (${flowResults.filter((r) => r.isValid).length} clean)`);
console.log(`        Domains: ${domainResults.length} validated`);
console.log(`        Issues: ${totalErrors} errors, ${totalWarnings} warnings`);
console.log(`        Node type coverage: ${coverage.node_types.coverage_note}`);

// Generate reports
const compatReport = generateCompatibilityReport(files, parseResults, normalizeResults);
const qualityReport = generateQualityReport(flowResults, domainResults, systemResult, coverage);

const compatPath = join(absPath, 'tool-compatibility-report.yaml');
const qualityPath = join(absPath, 'spec-quality-report.yaml');

writeFileSync(compatPath, stringify(compatReport, { lineWidth: 120 }));
writeFileSync(qualityPath, stringify(qualityReport, { lineWidth: 120 }));

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

console.log(`\n  Reports written:`);
console.log(`    ${compatPath}`);
console.log(`    ${qualityPath}`);
console.log(`\n  Compatibility: ${compatReport.compatibility_verdict}`);
console.log(`  Quality: ${qualityReport.quality_verdict} (score: ${qualityReport.summary.quality_score}/100)`);
console.log(`  Completed in ${elapsed}s\n`);
