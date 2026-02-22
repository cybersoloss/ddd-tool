import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { stringify, parse } from 'yaml';
import type { ChangeHistoryEntry, RecordSaveParams } from '../types/change-history';

async function sha256short(content: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 12);
}

function nextId(entries: ChangeHistoryEntry[]): string {
  const last = entries[entries.length - 1];
  const num = last ? parseInt(last.id.replace('chg-', ''), 10) : 0;
  return `chg-${String(num + 1).padStart(4, '0')}`;
}

interface ChangeHistoryState {
  entries: ChangeHistoryEntry[];
  lastChecksumByFile: Record<string, string>;
  // Accumulated entries since last explicit dismiss
  notification: ChangeHistoryEntry[];
  // Controls panel visibility independently from notification list.
  // Auto-close hides the panel but keeps notification entries so the
  // next save re-opens it showing all accumulated changes.
  notificationVisible: boolean;

  load: (projectPath: string) => Promise<void>;
  recordSave: (params: RecordSaveParams) => Promise<void>;
  hideNotification: () => void;    // called by auto-close timer — hides panel, keeps entries
  dismissNotification: () => void; // called by ✕ / Dismiss — clears entries + hides
  reset: () => void;
}

export const useChangeHistoryStore = create<ChangeHistoryState>((set, get) => ({
  entries: [],
  lastChecksumByFile: {},
  notification: [],
  notificationVisible: false,

  load: async (projectPath) => {
    try {
      const content: string = await invoke('read_file', {
        path: `${projectPath}/.ddd/change-history.yaml`,
      });
      const parsed = parse(content) as { changes?: ChangeHistoryEntry[] };
      const entries = parsed.changes ?? [];

      // Rebuild lastChecksumByFile from pending entries only.
      // Implemented entries don't block future saves of the same content.
      const lastChecksumByFile: Record<string, string> = {};
      for (const entry of entries) {
        if (entry.status === 'pending_implement') {
          lastChecksumByFile[entry.spec_file] = entry.spec_checksum;
        }
      }

      set({ entries, lastChecksumByFile, notification: [], notificationVisible: false });
    } catch {
      // File doesn't exist yet — that's fine
      set({ entries: [], lastChecksumByFile: {}, notification: [], notificationVisible: false });
    }
  },

  recordSave: async ({ projectPath, specFile, contents, level, domain, flow, pillar, action }) => {
    const { entries, lastChecksumByFile } = get();

    const isDeletion = action === 'deleted';
    // Deletions always get a unique checksum so they're never deduped
    const checksum = isDeletion
      ? await sha256short('__deleted__:' + new Date().toISOString())
      : await sha256short(contents);

    // Dedup: skip if content hasn't changed (deletions always record)
    if (!isDeletion && lastChecksumByFile[specFile] === checksum) return;

    const entry: ChangeHistoryEntry = {
      id: nextId(entries),
      timestamp: new Date().toISOString(),
      source: 'ddd-tool',
      scope: { level, domain, flow: flow ?? null, pillar },
      spec_file: specFile,
      spec_checksum: checksum,
      status: 'pending_implement',
      implemented_at: null,
      code_files: [],
      ...(action && action !== 'updated' ? { action } : {}),
    };

    const newEntries = [...entries, entry];
    const newLastChecksumByFile = { ...lastChecksumByFile, [specFile]: checksum };
    // Append to existing notification list (accumulated since last explicit dismiss)
    const newNotification = [...get().notification, entry];

    set({
      entries: newEntries,
      lastChecksumByFile: newLastChecksumByFile,
      notification: newNotification,
      notificationVisible: true, // always re-open panel on new save
    });

    // Persist to file (best effort)
    try {
      await invoke('create_directory', { path: `${projectPath}/.ddd` });
      await invoke('write_file', {
        path: `${projectPath}/.ddd/change-history.yaml`,
        contents: stringify({ changes: newEntries }),
      });
    } catch {
      // Silent — history is best-effort
    }
  },

  // Auto-close: hide panel but keep accumulated entries.
  // Next save will re-open the panel showing everything.
  hideNotification: () => {
    set({ notificationVisible: false });
  },

  // Explicit dismiss: clear accumulated entries and hide panel.
  dismissNotification: () => {
    set({ notification: [], notificationVisible: false });
  },

  reset: () => {
    set({ entries: [], lastChecksumByFile: {}, notification: [], notificationVisible: false });
  },
}));
