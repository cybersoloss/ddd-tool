export interface ChangeHistoryEntry {
  id: string;              // "chg-0001"
  timestamp: string;       // ISO 8601
  source: 'ddd-tool';
  scope: {
    level: 'L1' | 'L2' | 'L3';
    domain: string | null;
    flow: string | null;
    pillar: 'logic' | 'data' | 'interface' | 'infrastructure' | null;
  };
  spec_file: string;       // relative path from project root
  spec_checksum: string;   // SHA-256 first 12 chars
  status: 'pending_implement';
  implemented_at: null;
  code_files: [];
}

export interface RecordSaveParams {
  projectPath: string;
  specFile: string;
  contents: string;
  level: 'L1' | 'L2' | 'L3';
  domain: string | null;
  flow?: string;
  pillar: 'logic' | 'data' | 'interface' | 'infrastructure' | null;
}
