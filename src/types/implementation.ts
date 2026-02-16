// Sync state classification for bidirectional drift detection
export type SyncState = 'synced' | 'spec_ahead' | 'code_ahead' | 'diverged';

// Annotation from .ddd/annotations/
export interface FlowAnnotation {
  id: string;
  type: string; // pattern category: stealth_http, api_key_resolution, encryption, soft_delete, content_hashing, error_handling, custom
  description: string;
  appliesToNodes: string[];
  status: 'candidate' | 'approved' | 'promoted' | 'dismissed';
  codeEvidence?: {
    file: string;
    lines: string;
    snippet?: string;
  };
}

export interface AnnotationFile {
  flow: string;
  capturedAt: string;
  capturedFrom: 'reflect' | 'reverse' | 'sync';
  patterns: FlowAnnotation[];
  implementationDetails?: Array<{
    nodeId: string;
    detail: string;
    codeEvidence?: { file: string; lines: string };
  }>;
}

export interface FlowMapping {
  spec: string;
  specHash: string;
  files: string[];
  fileHashes?: Record<string, string>;
  implementedAt: string;
  mode: 'new' | 'update';
  syncState?: SyncState;
  annotationCount?: number;
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
  driftType?: 'metadata' | 'spec_enriched' | 'code_ahead' | 'new_logic';
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
  annotated: number;
}
