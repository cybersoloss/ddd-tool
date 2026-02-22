export interface ChangeHistoryEntry {
  id: string;              // "chg-0001"
  timestamp: string;       // ISO 8601
  source: 'ddd-tool' | 'ddd-update' | 'ddd-create' | 'ddd-sync';
  scope: {
    level: 'L1' | 'L2' | 'L3';
    domain: string | null;
    flow: string | null;
    pillar: 'logic' | 'data' | 'interface' | 'infrastructure' | null;
  };
  spec_file: string;       // relative path from project root
  spec_checksum: string;   // SHA-256 first 12 chars
  status: 'pending_implement' | 'implemented';
  implemented_at: string | null;
  code_files: string[];
  action?: 'created' | 'updated' | 'deleted';
}

export interface RecordSaveParams {
  projectPath: string;
  specFile: string;
  contents: string;
  level: 'L1' | 'L2' | 'L3';
  domain: string | null;
  flow?: string;
  pillar: 'logic' | 'data' | 'interface' | 'infrastructure' | null;
  action?: 'created' | 'updated' | 'deleted';
}
