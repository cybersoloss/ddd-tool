import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { stringify, parse } from 'yaml';
import { nanoid } from 'nanoid';
import { useProjectStore } from './project-store';
import type {
  FlowMapping,
  DriftInfo,
  ReconciliationAction,
  ReconciliationEntry,
  ReconciliationReport,
  SyncScore,
} from '../types/implementation';

interface ImplementationState {
  mappings: Record<string, FlowMapping>;
  driftItems: DriftInfo[];
  syncScore: SyncScore | null;
  ignoredDrifts: Set<string>;

  loadMappings: () => Promise<void>;
  saveMappings: () => Promise<void>;
  detectDrift: () => Promise<void>;
  computeSyncScore: () => SyncScore;
  resolveFlow: (flowKey: string, action: ReconciliationAction) => Promise<void>;
  resolveAll: (action: ReconciliationAction) => Promise<void>;
  saveReconciliationReport: (entries: ReconciliationEntry[]) => Promise<void>;
  reset: () => void;
}

export const useImplementationStore = create<ImplementationState>((set, get) => ({
  mappings: {},
  driftItems: [],
  syncScore: null,
  ignoredDrifts: new Set<string>(),

  loadMappings: async () => {
    const projectPath = useProjectStore.getState().projectPath;
    if (!projectPath) return;

    try {
      const content: string = await invoke('read_file', {
        path: `${projectPath}/.ddd/mapping.yaml`,
      });
      const parsed = parse(content) as { flows?: Record<string, FlowMapping> };
      set({ mappings: parsed.flows ?? {} });
    } catch {
      // File doesn't exist yet — that's fine
      set({ mappings: {} });
    }

    // Auto-detect drift after loading mappings
    get().detectDrift();
  },

  saveMappings: async () => {
    const projectPath = useProjectStore.getState().projectPath;
    if (!projectPath) return;

    const { mappings } = get();
    const content = stringify({ flows: mappings });

    try {
      await invoke('create_directory', {
        path: `${projectPath}/.ddd`,
      });
    } catch {
      // Directory may already exist
    }

    await invoke('write_file', {
      path: `${projectPath}/.ddd/mapping.yaml`,
      contents: content,
    });
  },

  detectDrift: async () => {
    const projectPath = useProjectStore.getState().projectPath;
    const domainConfigs = useProjectStore.getState().domainConfigs;
    if (!projectPath) return;

    const { mappings } = get();
    const driftItems: DriftInfo[] = [];
    const now = new Date().toISOString();

    for (const [domainId, config] of Object.entries(domainConfigs)) {
      for (const flow of config.flows) {
        const flowKey = `${domainId}/${flow.id}`;
        const mapping = mappings[flowKey];
        if (!mapping) continue;

        // Forward drift: spec file changed since last implementation
        let currentSpecHash = '';
        try {
          currentSpecHash = await invoke<string>('compute_file_hash', {
            path: `${projectPath}/${mapping.spec}`,
          });
        } catch {
          continue;
        }

        if (currentSpecHash && currentSpecHash !== mapping.specHash) {
          driftItems.push({
            flowKey,
            flowName: flow.name,
            domainId,
            specPath: mapping.spec,
            previousHash: mapping.specHash,
            currentHash: currentSpecHash,
            implementedAt: mapping.implementedAt,
            detectedAt: now,
            direction: 'forward',
          });
          continue; // Don't check reverse if forward drift already detected
        }

        // Reverse drift: implementation files changed since last implementation
        if (mapping.fileHashes && Object.keys(mapping.fileHashes).length > 0) {
          for (const [file, storedHash] of Object.entries(mapping.fileHashes)) {
            let currentFileHash = '';
            try {
              currentFileHash = await invoke<string>('compute_file_hash', {
                path: `${projectPath}/${file}`,
              });
            } catch {
              continue;
            }

            if (currentFileHash && currentFileHash !== storedHash) {
              driftItems.push({
                flowKey,
                flowName: flow.name,
                domainId,
                specPath: mapping.spec,
                previousHash: storedHash,
                currentHash: currentFileHash,
                implementedAt: mapping.implementedAt,
                detectedAt: now,
                direction: 'reverse',
              });
              break; // One changed file is enough to flag the flow
            }
          }
        }
      }
    }

    set({ driftItems });
    const syncScore = get().computeSyncScore();
    set({ syncScore });
  },

  computeSyncScore: () => {
    const { mappings, driftItems } = get();
    const domainConfigs = useProjectStore.getState().domainConfigs;

    let total = 0;
    for (const config of Object.values(domainConfigs)) {
      total += config.flows.length;
    }

    const staleKeys = new Set(driftItems.map((d) => d.flowKey));
    const implementedCount = Object.keys(mappings).filter((k) => !staleKeys.has(k)).length;
    const stale = staleKeys.size;
    const pending = total - implementedCount - stale;
    const score = total > 0 ? Math.round((implementedCount / total) * 100) : 0;

    return { total, implemented: implementedCount, stale, pending, score };
  },

  resolveFlow: async (flowKey, action) => {
    const projectPath = useProjectStore.getState().projectPath;
    if (!projectPath) return;

    const { driftItems, mappings } = get();
    const drift = driftItems.find((d) => d.flowKey === flowKey);
    if (!drift) return;

    if (action === 'accept') {
      // Update mapping hash to current hash
      const mapping = mappings[flowKey];
      if (mapping) {
        const updated: FlowMapping = { ...mapping, specHash: drift.currentHash };
        const newMappings = { ...mappings, [flowKey]: updated };
        set({ mappings: newMappings });
        // Remove from drift items
        set((s) => ({
          driftItems: s.driftItems.filter((d) => d.flowKey !== flowKey),
        }));
        // Persist
        const content = stringify({ flows: newMappings });
        try {
          await invoke('write_file', {
            path: `${projectPath}/.ddd/mapping.yaml`,
            contents: content,
          });
        } catch { /* best effort */ }
      }
    } else if (action === 'reimpl') {
      // Copy /ddd-implement command to clipboard
      navigator.clipboard.writeText(`/ddd-implement ${flowKey}`);
    } else if (action === 'ignore') {
      set((s) => {
        const newIgnored = new Set(s.ignoredDrifts);
        newIgnored.add(flowKey);
        return {
          ignoredDrifts: newIgnored,
          driftItems: s.driftItems.filter((d) => d.flowKey !== flowKey),
        };
      });
    }

    // Update sync score
    const syncScore = get().computeSyncScore();
    set({ syncScore });

    // Save reconciliation report entry
    if (drift && (action === 'accept' || action === 'ignore')) {
      const entry: ReconciliationEntry = {
        flowKey,
        action,
        previousHash: drift.previousHash,
        newHash: drift.currentHash,
        resolvedAt: new Date().toISOString(),
      };
      get().saveReconciliationReport([entry]);
    }
  },

  resolveAll: async (action) => {
    const { driftItems } = get();
    if (driftItems.length === 0) return;

    const scoreBefore = get().computeSyncScore();
    const entries: ReconciliationEntry[] = [];

    // Process all drift items
    const items = [...driftItems];
    for (const drift of items) {
      if (action === 'accept') {
        const { mappings } = get();
        const mapping = mappings[drift.flowKey];
        if (mapping) {
          const updated: FlowMapping = { ...mapping, specHash: drift.currentHash };
          set((s) => ({
            mappings: { ...s.mappings, [drift.flowKey]: updated },
          }));
        }
        entries.push({
          flowKey: drift.flowKey,
          action,
          previousHash: drift.previousHash,
          newHash: drift.currentHash,
          resolvedAt: new Date().toISOString(),
        });
      } else if (action === 'ignore') {
        set((s) => {
          const newIgnored = new Set(s.ignoredDrifts);
          newIgnored.add(drift.flowKey);
          return { ignoredDrifts: newIgnored };
        });
        entries.push({
          flowKey: drift.flowKey,
          action,
          previousHash: drift.previousHash,
          newHash: drift.currentHash,
          resolvedAt: new Date().toISOString(),
        });
      }
    }

    // Clear drift items and persist mappings
    set({ driftItems: [] });

    if (action === 'accept') {
      get().saveMappings();
    }

    const scoreAfter = get().computeSyncScore();
    set({ syncScore: scoreAfter });

    // Save report with before/after scores
    if (entries.length > 0) {
      const report: ReconciliationReport = {
        id: nanoid(),
        timestamp: new Date().toISOString(),
        entries,
        syncScoreBefore: scoreBefore.score,
        syncScoreAfter: scoreAfter.score,
      };

      const projectPath = useProjectStore.getState().projectPath;
      if (projectPath) {
        const dir = `${projectPath}/.ddd/reconciliations`;
        try {
          await invoke('create_directory', { path: dir });
        } catch { /* may exist */ }
        const filename = new Date().toISOString().replace(/[:.]/g, '-');
        await invoke('write_file', {
          path: `${dir}/${filename}.yaml`,
          contents: stringify(report),
        }).catch(() => {});
      }
    }
  },

  saveReconciliationReport: async (entries) => {
    const projectPath = useProjectStore.getState().projectPath;
    if (!projectPath || entries.length === 0) return;

    const syncScore = get().computeSyncScore();
    const report: ReconciliationReport = {
      id: nanoid(),
      timestamp: new Date().toISOString(),
      entries,
      syncScoreBefore: syncScore.score,
      syncScoreAfter: syncScore.score,
    };

    const dir = `${projectPath}/.ddd/reconciliations`;
    try {
      await invoke('create_directory', { path: dir });
    } catch { /* may exist */ }

    const filename = new Date().toISOString().replace(/[:.]/g, '-');
    await invoke('write_file', {
      path: `${dir}/${filename}.yaml`,
      contents: stringify(report),
    }).catch(() => {});
  },

  reset: () => {
    set({
      mappings: {},
      driftItems: [],
      syncScore: null,
      ignoredDrifts: new Set<string>(),
    });
  },
}));
