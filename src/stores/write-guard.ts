/**
 * Write guard to prevent self-triggered file-watcher reloads.
 * Uses guardedWriteFile() instead of invoke('write_file', ...) in stores.
 * The file watcher listener checks isOwnWrite() to skip reloads
 * caused by the tool's own writes.
 */

import { invoke } from '@tauri-apps/api/core';

let writeGuardUntil = 0;

export function markWriting() {
  writeGuardUntil = Date.now() + 2000; // ignore changes for 2s after our own write
}

export function isOwnWrite(): boolean {
  return Date.now() < writeGuardUntil;
}

/**
 * Write a file and mark the write guard so the file watcher
 * won't trigger a self-reload.
 */
export async function guardedWriteFile(path: string, contents: string): Promise<void> {
  markWriting();
  await invoke('write_file', { path, contents });
}
