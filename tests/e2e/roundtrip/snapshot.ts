/**
 * DDD Round-Trip Test — Snapshot
 *
 * Parse → normalize → validate → fingerprint a DDD project spec set.
 * Produces a ProjectSnapshot for comparison.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename, extname } from 'node:path';
import { parse } from 'yaml';
import { normalizeFlowDocument } from '../../../src/utils/flow-normalizer.ts';
import { validateFlow, validateDomain, validateSystem } from '../../../src/utils/flow-validator.ts';
import type { FlowDocument, DddFlowNode } from '../../../src/types/flow.ts';
import type { DomainConfig, DomainFlowEntry, EventWiring } from '../../../src/types/domain.ts';
import type { SchemaSpec } from '../../../src/types/specs.ts';
import type { ValidationResult } from '../../../src/types/validation.ts';
import type {
  ProjectSnapshot,
  DomainSnapshot,
  FlowSnapshot,
  SchemaSnapshot,
  EventWiringEntry,
} from './types.ts';

// ─── File Discovery ──────────────────────────────────────────────────────

interface FileEntry {
  path: string;
  relPath: string;
  category: 'flow' | 'domain' | 'schema' | 'system' | 'config' | 'shared' | 'other';
  domainId?: string;
  flowId?: string;
}

function discoverYamlFiles(root: string): FileEntry[] {
  const specsDir = join(root, 'specs');
  if (!existsSync(specsDir)) return [];

  const entries: FileEntry[] = [];

  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) {
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
    if (rel.match(/^specs\/shared\//)) return 'shared';
    return 'other';
  }

  walk(specsDir);

  // Enrich with domain/flow IDs
  for (const entry of entries) {
    const parts = entry.relPath.split('/');
    if (entry.category === 'flow') {
      entry.domainId = parts[2];
      entry.flowId = basename(parts[parts.length - 1], extname(parts[parts.length - 1]));
    } else if (entry.category === 'domain') {
      entry.domainId = parts[2];
    }
  }

  return entries;
}

// ─── Parse & Normalize ───────────────────────────────────────────────────

interface ParsedFile {
  entry: FileEntry;
  raw: Record<string, unknown>;
}

function parseYamlFiles(files: FileEntry[]): { parsed: ParsedFile[]; errors: string[] } {
  const parsed: ParsedFile[] = [];
  const errors: string[] = [];

  for (const entry of files) {
    try {
      const content = readFileSync(entry.path, 'utf-8');
      const raw = parse(content) as Record<string, unknown>;
      if (raw === null || raw === undefined) {
        errors.push(`${entry.relPath}: parsed to null`);
        continue;
      }
      parsed.push({ entry, raw });
    } catch (err) {
      errors.push(`${entry.relPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { parsed, errors };
}

interface NormalizedFlow {
  domainId: string;
  flowId: string;
  doc: FlowDocument;
}

function normalizeFlows(parsed: ParsedFile[]): { flows: NormalizedFlow[]; errors: string[] } {
  const flows: NormalizedFlow[] = [];
  const errors: string[] = [];

  for (const { entry, raw } of parsed.filter((p) => p.entry.category === 'flow')) {
    try {
      const flowType = raw.flow
        ? ((raw.flow as Record<string, unknown>).type as string) ?? 'traditional'
        : 'traditional';

      const doc = normalizeFlowDocument(raw, entry.domainId!, entry.flowId!, flowType);
      flows.push({ domainId: entry.domainId!, flowId: entry.flowId!, doc });
    } catch (err) {
      errors.push(`${entry.relPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { flows, errors };
}

// ─── Build Domain Configs ────────────────────────────────────────────────

function buildDomainConfigs(
  parsed: ParsedFile[]
): Record<string, DomainConfig> {
  const configs: Record<string, DomainConfig> = {};

  for (const { entry, raw } of parsed.filter((p) => p.entry.category === 'domain')) {
    const domainId = entry.domainId!;

    configs[domainId] = {
      name: (raw.name as string) ?? domainId,
      description: raw.description as string | undefined,
      role: raw.role as DomainConfig['role'],
      owns_schemas: raw.owns_schemas as string[] | undefined,
      flows: ((raw.flows as Array<Record<string, unknown>>) ?? []).map(
        (f): DomainFlowEntry => ({
          id: (f.id as string) ?? '',
          name: (f.name as string) ?? '',
          description: f.description as string | undefined,
          type: (f.type as 'traditional' | 'agent') ?? 'traditional',
          tags: f.tags as string[] | undefined,
          group: f.group as string | undefined,
        })
      ),
      publishes_events: ((raw.publishes_events as Array<Record<string, unknown>>) ?? []).map(
        (e): EventWiring => ({
          event: (e.event as string) ?? '',
          payload: e.payload as Record<string, unknown> | undefined,
          from_flow: e.from_flow as string | undefined,
          description: e.description as string | undefined,
        })
      ),
      consumes_events: ((raw.consumes_events as Array<Record<string, unknown>>) ?? []).map(
        (e): EventWiring => ({
          event: (e.event as string) ?? '',
          payload: e.payload as Record<string, unknown> | undefined,
          handled_by_flow: e.handled_by_flow as string | undefined,
          description: e.description as string | undefined,
        })
      ),
      layout: { flows: {}, portals: {} },
    };
  }

  return configs;
}

// ─── Build Schemas ───────────────────────────────────────────────────────

function buildSchemas(parsed: ParsedFile[]): Record<string, SchemaSpec> {
  const schemas: Record<string, SchemaSpec> = {};
  for (const { entry, raw } of parsed.filter((p) => p.entry.category === 'schema')) {
    const name = basename(entry.relPath, extname(entry.relPath));
    // Skip base schemas
    if (name.startsWith('_')) continue;
    schemas[name] = raw as unknown as SchemaSpec;
  }
  return schemas;
}

// ─── Flow Snapshot ───────────────────────────────────────────────────────

function snapshotFlow(domainId: string, flowId: string, doc: FlowDocument): FlowSnapshot {
  const allNodes: DddFlowNode[] = [doc.trigger, ...doc.nodes];
  const connCount = allNodes.reduce((acc, n) => acc + (n.connections?.length ?? 0), 0);
  const nodeTypes = [...new Set(allNodes.map((n) => n.type))].sort();

  const triggerSpec = (doc.trigger.spec ?? {}) as Record<string, unknown>;
  const triggerEvent = triggerSpec.event as string | undefined;

  let triggerMethod: string | undefined;
  let triggerPath: string | undefined;
  if (triggerEvent && typeof triggerEvent === 'string' && triggerEvent.startsWith('HTTP')) {
    const parts = triggerEvent.split(' ');
    triggerMethod = parts[1];
    triggerPath = parts[2];
  }

  const terminalOutcomes = doc.nodes
    .filter((n) => n.type === 'terminal')
    .map((n) => {
      const spec = (n.spec ?? {}) as Record<string, unknown>;
      return (spec.outcome as string) ?? 'unknown';
    })
    .sort();

  return {
    flowId,
    domainId,
    nodeCount: allNodes.length,
    connectionCount: connCount,
    nodeTypes,
    triggerEvent,
    triggerMethod,
    triggerPath,
    terminalOutcomes,
  };
}

// ─── Take Snapshot ───────────────────────────────────────────────────────

export function takeSnapshot(projectPath: string): ProjectSnapshot {
  // 1. Discover
  const files = discoverYamlFiles(projectPath);

  // 2. Parse
  const { parsed, errors: parseErrors } = parseYamlFiles(files);
  if (parseErrors.length > 0) {
    console.warn(`  Parse warnings: ${parseErrors.join(', ')}`);
  }

  // 3. Normalize flows
  const { flows: normalizedFlows, errors: normErrors } = normalizeFlows(parsed);
  if (normErrors.length > 0) {
    console.warn(`  Normalize warnings: ${normErrors.join(', ')}`);
  }

  // 4. Build domain configs and schemas
  const domainConfigs = buildDomainConfigs(parsed);
  const schemas = buildSchemas(parsed);

  // 5. Validate
  const flowResults: ValidationResult[] = [];
  const domainResults: ValidationResult[] = [];

  for (const [domainId, config] of Object.entries(domainConfigs)) {
    const domainFlowDocs = normalizedFlows
      .filter((f) => f.domainId === domainId)
      .map((f) => f.doc);

    for (const doc of domainFlowDocs) {
      flowResults.push(validateFlow(doc, domainConfigs));
    }

    domainResults.push(validateDomain(domainId, config, domainConfigs, domainFlowDocs));
  }

  const allFlowDocs = normalizedFlows.map((f) => f.doc);
  const systemResult = validateSystem(domainConfigs, { schemas, flowDocs: allFlowDocs });

  const totalErrors =
    flowResults.reduce((a, r) => a + r.errorCount, 0) +
    domainResults.reduce((a, r) => a + r.errorCount, 0) +
    systemResult.errorCount;

  const totalWarnings =
    flowResults.reduce((a, r) => a + r.warningCount, 0) +
    domainResults.reduce((a, r) => a + r.warningCount, 0) +
    systemResult.warningCount;

  // 6. Build domain snapshots
  const domainSnapshots: DomainSnapshot[] = [];
  for (const [domainId, config] of Object.entries(domainConfigs)) {
    const domainFlows = normalizedFlows.filter((f) => f.domainId === domainId);

    domainSnapshots.push({
      domainId,
      name: config.name,
      role: config.role,
      flowCount: domainFlows.length,
      flows: domainFlows.map((f) => snapshotFlow(domainId, f.flowId, f.doc)),
      publishedEvents: config.publishes_events.map((e) => e.event),
      consumedEvents: config.consumes_events.map((e) => e.event),
      ownedSchemas: config.owns_schemas ?? [],
    });
  }

  // 7. Build schema snapshots
  const schemaSnapshots: SchemaSnapshot[] = Object.entries(schemas).map(
    ([name, spec]) => ({
      name: spec.name ?? name,
      fieldNames: ((spec.fields ?? []) as Array<{ name: string }>).map((f) => f.name).sort(),
      fieldCount: (spec.fields ?? []).length,
    })
  );

  // 8. Build event wiring
  const eventWiring: EventWiringEntry[] = [];
  for (const [domainId, config] of Object.entries(domainConfigs)) {
    for (const evt of config.publishes_events) {
      // Find consumers
      for (const [consumerId, consumerConfig] of Object.entries(domainConfigs)) {
        for (const consumed of consumerConfig.consumes_events) {
          if (consumed.event === evt.event) {
            eventWiring.push({
              event: evt.event,
              publisher: domainId,
              consumer: consumerId,
            });
          }
        }
      }
    }
  }

  // 9. Quality score
  const flowCount = normalizedFlows.length;
  const denominator = Math.max(flowCount, 5);
  const rawScore = flowCount === 0
    ? 0
    : 100 - ((totalErrors * 5 + totalWarnings * 1) / denominator) * 10;
  const qualityScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  // 10. Aggregates
  const totalNodeCount = normalizedFlows.reduce((acc, f) => {
    const allNodes = [f.doc.trigger, ...f.doc.nodes];
    return acc + allNodes.length;
  }, 0);

  const totalConnectionCount = normalizedFlows.reduce((acc, f) => {
    const allNodes = [f.doc.trigger, ...f.doc.nodes];
    return acc + allNodes.reduce((a, n) => a + (n.connections?.length ?? 0), 0);
  }, 0);

  return {
    domainCount: domainSnapshots.length,
    totalFlowCount: normalizedFlows.length,
    totalNodeCount,
    totalConnectionCount,
    domains: domainSnapshots,
    schemas: schemaSnapshots,
    eventWiring,
    validation: {
      flowResults,
      domainResults,
      systemResult,
      totalErrors,
      totalWarnings,
    },
    qualityScore,
  };
}
