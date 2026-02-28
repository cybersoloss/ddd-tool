#!/usr/bin/env npx tsx
/**
 * DDD Round-Trip Test
 *
 * Validates the full DDD cycle: Spec → Code → Reverse → Spec.
 *
 * Two modes:
 *   --offline  Uses sample/todo-api as fixture. Tests snapshot/compare
 *              infrastructure only. Fast (<5s), free, CI-safe.
 *   (default)  Full end-to-end with `claude -p`. Slow (~15 min), costs tokens.
 *
 * Usage:
 *   npm run test:roundtrip           # online mode (full round-trip)
 *   npm run test:roundtrip:offline   # offline mode (fixture-based)
 */

import { existsSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { writeFixtureProject } from './spec-fixtures.ts';
import { takeSnapshot } from './snapshot.ts';
import { compareSnapshots } from './compare.ts';
import { checkClaudeCli, runScaffold, runImplement, runReverse } from './claude-runner.ts';
import { printHeader, printPhase, printComparison, printVerdict, writeReport } from './report.ts';
import type { PhaseResult, RoundTripReport } from './types.ts';

// ─── CLI Args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const offlineMode = args.includes('--offline');
const mode = offlineMode ? 'offline' : 'online';

// Paths
const rootDir = resolve(import.meta.dirname, '../../..');
const tmpDir = join(rootDir, '.ddd', 'test-roundtrip');
const reportPath = join(rootDir, 'tests', 'e2e', 'roundtrip', 'round-trip-report.yaml');
const samplePath = join(rootDir, 'sample', 'todo-api');

// ─── Helpers ─────────────────────────────────────────────────────────────

function phase(name: string, fn: () => string | undefined): PhaseResult {
  const start = Date.now();
  try {
    const details = fn();
    return { name, status: 'pass', durationMs: Date.now() - start, details: details ?? undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name, status: 'fail', durationMs: Date.now() - start, details: msg };
  }
}

function countSpecFiles(dir: string): number {
  const specsDir = join(dir, 'specs');
  if (!existsSync(specsDir)) return 0;
  let count = 0;
  function walk(d: string) {
    for (const name of readdirSync(d, { withFileTypes: true })) {
      if (name.isDirectory()) walk(join(d, name.name));
      else if (name.name.endsWith('.yaml') || name.name.endsWith('.yml')) count++;
    }
  }
  walk(specsDir);
  return count;
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  printHeader(mode);

  const report: RoundTripReport = {
    mode,
    startedAt: new Date().toISOString(),
    completedAt: '',
    phases: [],
    verdict: 'FAIL',
  };

  let projectPath: string;

  if (offlineMode) {
    // ── Offline: use sample/todo-api directly ──────────────────────────
    projectPath = samplePath;

    // Phase 1: Verify fixture exists
    const p1 = phase('Phase 1: Fixture Exists', () => {
      if (!existsSync(projectPath)) throw new Error(`Sample project not found: ${projectPath}`);
      if (!existsSync(join(projectPath, 'ddd-project.json'))) throw new Error('Missing ddd-project.json');
      const fileCount = countSpecFiles(projectPath);
      return `${fileCount} spec files`;
    });
    report.phases.push(p1);
    printPhase(p1, p1.details);
    if (p1.status === 'fail') return finish(report);

    // Phase 2: Snapshot original
    const p2 = phase('Phase 2: Original Snapshot', () => {
      report.originalSnapshot = takeSnapshot(projectPath);
      const snap = report.originalSnapshot;
      return `${snap.domainCount} domains, ${snap.totalFlowCount} flows, ${snap.validation.totalErrors} errors`;
    });
    report.phases.push(p2);
    printPhase(p2, p2.details);
    if (p2.status === 'fail') return finish(report);

    // Phase 3: Create a "reversed" copy (simulate by re-snapshotting the same project)
    // In offline mode, we snapshot the same project twice to test the infrastructure.
    // This tests that snapshot+compare produces 100% match for identical projects.
    const p3 = phase('Phase 3: Reversed Snapshot', () => {
      report.reversedSnapshot = takeSnapshot(projectPath);
      const snap = report.reversedSnapshot;
      return `${snap.domainCount} domains, ${snap.totalFlowCount} flows, ${snap.validation.totalErrors} errors`;
    });
    report.phases.push(p3);
    printPhase(p3, p3.details);
    if (p3.status === 'fail') return finish(report);

    // Phase 4: Compare
    const p4 = phase('Phase 4: Compare', () => {
      report.comparison = compareSnapshots(report.originalSnapshot!, report.reversedSnapshot!);
      return `${report.comparison.overallScore}%`;
    });
    report.phases.push(p4);
    printPhase(p4, p4.details);

    if (report.comparison) {
      printComparison(report.comparison);
      report.verdict = report.comparison.passed ? 'PASS' : 'FAIL';
    }

  } else {
    // ── Online: full round-trip ────────────────────────────────────────

    // Pre-check: claude CLI available
    if (!checkClaudeCli()) {
      console.error('\n  Error: `claude` CLI not found. Install Claude Code first.');
      console.error('  Or run with --offline for fixture-based testing.\n');
      process.exit(1);
    }

    // Clean tmp directory
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
    mkdirSync(tmpDir, { recursive: true });
    projectPath = join(tmpDir, 'task-tracker');

    // Phase 1: Write fixture project
    const p1 = phase('Phase 1: Fixture Setup', () => {
      writeFixtureProject(projectPath);
      const fileCount = countSpecFiles(projectPath);
      return `${fileCount} spec files`;
    });
    report.phases.push(p1);
    printPhase(p1, p1.details);
    if (p1.status === 'fail') return finish(report);

    // Phase 2: Snapshot + validate original
    const p2 = phase('Phase 2: Original Validation', () => {
      report.originalSnapshot = takeSnapshot(projectPath);
      const snap = report.originalSnapshot;
      return `${snap.domainCount} domains, ${snap.totalFlowCount} flows, ${snap.validation.totalErrors} errors`;
    });
    report.phases.push(p2);
    printPhase(p2, p2.details);
    if (p2.status === 'fail') return finish(report);

    // Phase 3: Scaffold
    const p3 = phase('Phase 3: Scaffold', () => {
      const result = runScaffold(projectPath);
      if (!result.success) throw new Error(`Scaffold failed: ${result.stderr}`);
      return undefined;
    });
    report.phases.push(p3);
    printPhase(p3, p3.details);
    if (p3.status === 'fail') return finish(report);

    // Phase 4: Implement
    const p4 = phase('Phase 4: Implement', () => {
      const result = runImplement(projectPath);
      if (!result.success) throw new Error(`Implement failed: ${result.stderr}`);
      return undefined;
    });
    report.phases.push(p4);
    printPhase(p4, p4.details);
    if (p4.status === 'fail') return finish(report);

    // Phase 5: Strip specs (keep code only)
    const specsBackupPath = join(tmpDir, 'task-tracker-specs-backup');
    const p5 = phase('Phase 5: Code Strip', () => {
      // Backup specs
      cpSync(join(projectPath, 'specs'), specsBackupPath, { recursive: true });
      // Remove specs dir
      rmSync(join(projectPath, 'specs'), { recursive: true });
      // Remove .ddd directory (mapping, etc.)
      if (existsSync(join(projectPath, '.ddd'))) {
        rmSync(join(projectPath, '.ddd'), { recursive: true });
      }
      return undefined;
    });
    report.phases.push(p5);
    printPhase(p5, p5.details);
    if (p5.status === 'fail') return finish(report);

    // Phase 6: Reverse
    const p6 = phase('Phase 6: Reverse', () => {
      const result = runReverse(projectPath);
      if (!result.success) throw new Error(`Reverse failed: ${result.stderr}`);
      const fileCount = countSpecFiles(projectPath);
      return `${fileCount} spec files`;
    });
    report.phases.push(p6);
    printPhase(p6, p6.details);
    if (p6.status === 'fail') return finish(report);

    // Phase 7: Snapshot reversed
    const p7 = phase('Phase 7: Reversed Validation', () => {
      report.reversedSnapshot = takeSnapshot(projectPath);
      const snap = report.reversedSnapshot;
      return `${snap.domainCount} domains, ${snap.totalFlowCount} flows, ${snap.validation.totalErrors} errors`;
    });
    report.phases.push(p7);
    printPhase(p7, p7.details);
    if (p7.status === 'fail') return finish(report);

    // Phase 8: Compare
    const p8 = phase('Phase 8: Compare', () => {
      report.comparison = compareSnapshots(report.originalSnapshot!, report.reversedSnapshot!);
      return `${report.comparison.overallScore}%`;
    });
    report.phases.push(p8);
    printPhase(p8, p8.details);

    if (report.comparison) {
      printComparison(report.comparison);
      report.verdict = report.comparison.passed ? 'PASS' : 'FAIL';
    }
  }

  return finish(report);
}

function finish(report: RoundTripReport): void {
  report.completedAt = new Date().toISOString();

  // If no explicit verdict set (e.g., early failure), check phases
  if (report.verdict === 'FAIL' && !report.comparison) {
    const anyFail = report.phases.some((p) => p.status === 'fail');
    if (!anyFail) report.verdict = 'PASS';
  }

  printVerdict(report.verdict === 'PASS');

  // Write report
  writeReport(reportPath, report);
  console.log(`  Report: ${reportPath}\n`);

  process.exit(report.verdict === 'PASS' ? 0 : 1);
}

main().catch((err) => {
  console.error('\n  Unexpected error:', err);
  process.exit(1);
});
