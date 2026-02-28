/**
 * DDD Round-Trip Test — Report
 *
 * Console output formatting and YAML report generation.
 */

import { writeFileSync } from 'node:fs';
import { stringify } from 'yaml';
import type {
  PhaseResult,
  RoundTripReport,
  ComparisonResult,
  ProjectSnapshot,
} from './types.ts';

// ─── Console Output ──────────────────────────────────────────────────────

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function statusColor(status: string): string {
  if (status === 'pass' || status === 'PASS') return COLORS.green;
  if (status === 'fail' || status === 'FAIL') return COLORS.red;
  return COLORS.yellow;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function printPhase(phase: PhaseResult, details?: string): void {
  const color = statusColor(phase.status);
  const status = `${color}${phase.status.toUpperCase()}${COLORS.reset}`;
  const duration = `${COLORS.dim}(${formatDuration(phase.durationMs)})${COLORS.reset}`;
  const dots = '.'.repeat(Math.max(1, 35 - phase.name.length));

  let line = `  ${phase.name} ${COLORS.dim}${dots}${COLORS.reset} ${status} ${duration}`;
  if (details) {
    line += `  ${COLORS.dim}[${details}]${COLORS.reset}`;
  }
  console.log(line);
}

export function printComparison(comparison: ComparisonResult): void {
  console.log('');

  // Table header
  const colWidths = { dim: 13, orig: 10, rev: 10, score: 7 };
  const sep = `    ${'─'.repeat(colWidths.dim + colWidths.orig + colWidths.rev + colWidths.score + 9)}`;

  console.log(sep);
  console.log(
    `    │ ${'Dimension'.padEnd(colWidths.dim)}│ ${'Original'.padEnd(colWidths.orig)}│ ${'Reversed'.padEnd(colWidths.rev)}│ ${'Score'.padEnd(colWidths.score)}│`
  );
  console.log(sep);

  for (const dim of comparison.dimensions) {
    const scoreColor = dim.score >= 80 ? COLORS.green : dim.score >= 50 ? COLORS.yellow : COLORS.red;
    const scoreStr = `${scoreColor}${(dim.score + '%').padEnd(colWidths.score)}${COLORS.reset}`;

    console.log(
      `    │ ${dim.dimension.padEnd(colWidths.dim)}│ ${String(dim.originalValue).padEnd(colWidths.orig)}│ ${String(dim.reversedValue).padEnd(colWidths.rev)}│ ${scoreStr}│`
    );
  }

  console.log(sep);

  // Overall
  const overallColor = comparison.passed ? COLORS.green : COLORS.red;
  console.log(
    `    ${COLORS.bold}Overall: ${overallColor}${comparison.overallScore}%${COLORS.reset} ${COLORS.dim}(threshold: ${comparison.threshold}%)${COLORS.reset}`
  );

  // Discrepancies
  if (comparison.discrepancies.length > 0) {
    console.log(`\n    ${COLORS.yellow}Discrepancies:${COLORS.reset}`);
    for (const d of comparison.discrepancies) {
      console.log(`      - ${d.description}`);
      console.log(`        ${COLORS.dim}Fix: ${d.recommendation}${COLORS.reset}`);
    }
  }
}

export function printVerdict(passed: boolean): void {
  const color = passed ? COLORS.green : COLORS.red;
  const text = passed ? 'PASS' : 'FAIL';
  console.log(`\n  ${COLORS.bold}Verdict: ${color}${text}${COLORS.reset}`);
}

export function printHeader(mode: 'online' | 'offline'): void {
  console.log(`\n  ${COLORS.bold}DDD Round-Trip Test${COLORS.reset} ${COLORS.dim}(${mode} mode)${COLORS.reset}\n`);
}

// ─── YAML Report ─────────────────────────────────────────────────────────

export function writeReport(
  reportPath: string,
  report: RoundTripReport
): void {
  // Flatten for YAML — strip large validation detail arrays
  const yamlData: Record<string, unknown> = {
    report: 'round-trip-report',
    mode: report.mode,
    started_at: report.startedAt,
    completed_at: report.completedAt,
    verdict: report.verdict,
    phases: report.phases.map((p) => ({
      name: p.name,
      status: p.status,
      duration_ms: p.durationMs,
      ...(p.details ? { details: p.details } : {}),
    })),
  };

  if (report.originalSnapshot) {
    yamlData.original = snapshotSummary(report.originalSnapshot);
  }

  if (report.reversedSnapshot) {
    yamlData.reversed = snapshotSummary(report.reversedSnapshot);
  }

  if (report.comparison) {
    yamlData.comparison = {
      overall_score: report.comparison.overallScore,
      threshold: report.comparison.threshold,
      passed: report.comparison.passed,
      dimensions: report.comparison.dimensions.map((d) => ({
        dimension: d.dimension,
        original: d.originalValue,
        reversed: d.reversedValue,
        score_pct: d.score,
      })),
      discrepancies: report.comparison.discrepancies.map((d) => ({
        category: d.category,
        description: d.description,
        recommendation: d.recommendation,
      })),
    };
  }

  writeFileSync(reportPath, stringify(yamlData, { lineWidth: 120 }), 'utf-8');
}

function snapshotSummary(snap: ProjectSnapshot): Record<string, unknown> {
  return {
    domains: snap.domainCount,
    flows: snap.totalFlowCount,
    nodes: snap.totalNodeCount,
    connections: snap.totalConnectionCount,
    schemas: snap.schemas.length,
    event_wiring: snap.eventWiring.length,
    validation_errors: snap.validation.totalErrors,
    validation_warnings: snap.validation.totalWarnings,
    quality_score: snap.qualityScore,
  };
}
