/**
 * DDD Round-Trip Test — Claude Runner
 *
 * Wrapper for invoking `claude -p` to run DDD commands
 * (scaffold, implement, reverse) against a project directory.
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export interface ClaudeRunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
}

/**
 * Run a prompt through `claude -p` in the given working directory.
 * Times out after `timeoutMs` (default: 5 minutes).
 */
export function runClaude(
  prompt: string,
  cwd: string,
  timeoutMs: number = 300_000
): ClaudeRunResult {
  const start = Date.now();

  // Unset CLAUDECODE so nested claude -p invocations aren't blocked
  const env = { ...process.env };
  delete env.CLAUDECODE;

  try {
    const stdout = execSync(`claude -p --dangerously-skip-permissions "${prompt.replace(/"/g, '\\"')}"`, {
      cwd,
      timeout: timeoutMs,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: '',
      durationMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; status?: number };
    return {
      success: false,
      stdout: execErr.stdout?.trim() ?? '',
      stderr: execErr.stderr?.trim() ?? String(err),
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Check that `claude` CLI is available.
 */
export function checkClaudeCli(): boolean {
  try {
    execSync('which claude', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run `/ddd-scaffold` on the project.
 */
export function runScaffold(projectPath: string): ClaudeRunResult {
  return runClaude(
    '/ddd-scaffold',
    projectPath,
    600_000 // 10 min
  );
}

/**
 * Run `/ddd-implement --all` on the project.
 */
export function runImplement(projectPath: string): ClaudeRunResult {
  return runClaude(
    '/ddd-implement --all',
    projectPath,
    600_000 // 10 min
  );
}

/**
 * Run `/ddd-reverse` on the project.
 */
export function runReverse(projectPath: string): ClaudeRunResult {
  return runClaude(
    '/ddd-reverse',
    projectPath,
    600_000 // 10 min
  );
}

/**
 * Run TypeScript type-check on the project.
 */
export function runTypeCheck(projectPath: string): ClaudeRunResult {
  const start = Date.now();
  const env = { ...process.env };
  delete env.CLAUDECODE;
  try {
    const stdout = execSync('npx tsc --noEmit', {
      cwd: projectPath,
      timeout: 60_000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });
    return { success: true, stdout: stdout.trim(), stderr: '', durationMs: Date.now() - start };
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string };
    return {
      success: false,
      stdout: execErr.stdout?.trim() ?? '',
      stderr: execErr.stderr?.trim() ?? String(err),
      durationMs: Date.now() - start,
    };
  }
}
