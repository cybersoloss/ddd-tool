/**
 * Mock for @tauri-apps/api/core
 * Replaces invoke() with VFS-backed operations.
 */
import {
  vfsRead, vfsWrite, vfsExists, vfsDelete,
  vfsDeleteDir, vfsListDir, vfsRename, seedVfs,
} from './vfs';
import { SEED_FILES } from '../data/seed-project';

// Seed VFS on first import (before any invoke calls)
seedVfs(SEED_FILES);

export async function invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
  switch (cmd) {
    // --- File operations ---
    case 'read_file':
      return vfsRead(args!.path as string);

    case 'write_file':
      vfsWrite(args!.path as string, args!.contents as string);
      return;

    case 'path_exists':
      return vfsExists(args!.path as string);

    case 'create_directory':
      // Directories are implicit in VFS
      return;

    case 'delete_file':
      vfsDelete(args!.path as string);
      return;

    case 'delete_directory':
      vfsDeleteDir(args!.path as string);
      return;

    case 'list_directory':
      return vfsListDir(args!.path as string);

    case 'append_log':
      // No-op: logging in demo mode
      return;

    case 'rename_path':
      vfsRename(args!.from as string, args!.to as string);
      return;

    case 'watch_directory':
      // No-op: no file watching in demo
      return;

    // --- Git operations (static returns) ---
    case 'git_status':
      return {
        branch: 'main',
        staged: [],
        unstaged: [],
        untracked: [],
      };

    case 'git_log':
      return [
        {
          oid: 'a1b2c3d',
          message: 'Initial DDD project setup',
          timestamp: Math.floor(Date.now() / 1000),
        },
      ];

    case 'git_stage_file':
    case 'git_unstage_file':
    case 'git_clone':
    case 'git_init':
    case 'git_add_all':
      return;

    case 'git_commit':
      return 'demo-' + Date.now().toString(36);

    // --- Implementation commands ---
    case 'compute_file_hash': {
      const content = vfsRead(args!.path as string);
      // Simple hash for demo
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
      }
      return Math.abs(hash).toString(16).padStart(64, '0');
    }

    case 'run_command':
      return { stdout: '', stderr: '', exit_code: 0 };

    default:
      console.warn(`[Demo] Unknown invoke command: ${cmd}`, args);
      return;
  }
}
