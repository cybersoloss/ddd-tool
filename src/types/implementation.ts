export interface FlowMapping {
  spec: string;
  specHash: string;
  files: string[];
  fileHashes?: Record<string, string>;
  implementedAt: string;
  mode: 'new' | 'update';
}

export interface DriftInfo {
  flowKey: string;
  flowName: string;
  domainId: string;
  specPath: string;
  previousHash: string;
  currentHash: string;
  implementedAt: string;
  detectedAt: string;
  direction: 'forward' | 'reverse';
}

export type ReconciliationAction = 'accept' | 'reimpl' | 'ignore';

export interface ReconciliationEntry {
  flowKey: string;
  action: ReconciliationAction;
  previousHash: string;
  newHash: string;
  resolvedAt: string;
}

export interface ReconciliationReport {
  id: string;
  timestamp: string;
  entries: ReconciliationEntry[];
  syncScoreBefore: number;
  syncScoreAfter: number;
}

export interface SyncScore {
  total: number;
  implemented: number;
  stale: number;
  pending: number;
  score: number;
}
