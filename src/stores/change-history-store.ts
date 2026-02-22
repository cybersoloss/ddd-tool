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
  notification: ChangeHistoryEntry[];

  load: (projectPath: string) => Promise<void>;
  recordSave: (params: RecordSaveParams) => Promise<void>;
  dismissNotification: () => void;
  reset: () => void;
}

export const useChangeHistoryStore = create<ChangeHistoryState>((set, get) => ({
  entries: [],
  lastChecksumByFile: {},
  notification: [],

  load: async (projectPath) => {
    try {
      const content: string = await invoke('read_file', {
        path: `${projectPath}/.ddd/change-history.yaml`,
      });
      const parsed = parse(content) as { changes?: ChangeHistoryEntry[] };
      const entries = parsed.changes ?? [];

      // Rebuild lastChecksumByFile from all entries (last write wins)
      const lastChecksumByFile: Record<string, string> = {};
      for (const entry of entries) {
        lastChecksumByFile[entry.spec_file] = entry.spec_checksum;
      }

      set({ entries, lastChecksumByFile, notification: [] });
    } catch {
      // File doesn't exist yet — that's fine
      set({ entries: [], lastChecksumByFile: {}, notification: [] });
    }
  },

  recordSave: async ({ projectPath, specFile, contents, level, domain, flow, pillar }) => {
    const { entries, lastChecksumByFile } = get();

    const checksum = await sha256short(contents);

    // Dedup: skip if content hasn't changed
    if (lastChecksumByFile[specFile] === checksum) return;

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
    };

    const newEntries = [...entries, entry];
    const newLastChecksumByFile = { ...lastChecksumByFile, [specFile]: checksum };
    const newNotification = [...get().notification, entry];

    set({
      entries: newEntries,
      lastChecksumByFile: newLastChecksumByFile,
      notification: newNotification,
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

  dismissNotification: () => {
    set({ notification: [] });
  },

  reset: () => {
    set({ entries: [], lastChecksumByFile: {}, notification: [] });
  },
}));
