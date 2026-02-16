export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidationScope = 'flow' | 'domain' | 'system';
export type ValidationCategory =
  | 'graph_completeness'
  | 'spec_completeness'
  | 'agent_validation'
  | 'orchestration_validation'
  | 'domain_consistency'
  | 'event_wiring'
  | 'reference_integrity';

export interface ValidationIssue {
  id: string;
  scope: ValidationScope;
  severity: ValidationSeverity;
  category: ValidationCategory;
  message: string;
  suggestion?: string;
  nodeId?: string;
  flowId?: string;
  domainId?: string;
}

export interface ValidationResult {
  scope: ValidationScope;
  targetId: string;
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  isValid: boolean;
  validatedAt: string;
}

export interface ImplementGateState {
  flowValidation: ValidationResult | null;
  domainValidation: ValidationResult | null;
  systemValidation: ValidationResult | null;
  canImplement: boolean;
  hasWarnings: boolean;
}
