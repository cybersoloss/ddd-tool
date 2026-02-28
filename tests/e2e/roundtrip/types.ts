/**
 * DDD Round-Trip Test — Shared Types
 */

import type { ValidationResult } from '../../../src/types/validation.ts';

// ─── Snapshot ────────────────────────────────────────────────────────────

export interface FlowSnapshot {
  flowId: string;
  domainId: string;
  nodeCount: number;
  connectionCount: number;
  nodeTypes: string[];
  triggerEvent?: string;
  triggerMethod?: string;
  triggerPath?: string;
  terminalOutcomes: string[];
}

export interface DomainSnapshot {
  domainId: string;
  name: string;
  role?: string;
  flowCount: number;
  flows: FlowSnapshot[];
  publishedEvents: string[];
  consumedEvents: string[];
  ownedSchemas: string[];
}

export interface SchemaSnapshot {
  name: string;
  fieldNames: string[];
  fieldCount: number;
}

export interface ProjectSnapshot {
  domainCount: number;
  totalFlowCount: number;
  totalNodeCount: number;
  totalConnectionCount: number;
  domains: DomainSnapshot[];
  schemas: SchemaSnapshot[];
  eventWiring: EventWiringEntry[];
  validation: {
    flowResults: ValidationResult[];
    domainResults: ValidationResult[];
    systemResult: ValidationResult;
    totalErrors: number;
    totalWarnings: number;
  };
  qualityScore: number;
}

export interface EventWiringEntry {
  event: string;
  publisher: string;
  consumer: string;
}

// ─── Comparison ──────────────────────────────────────────────────────────

export interface DimensionScore {
  dimension: string;
  originalValue: number;
  reversedValue: number;
  score: number;
}

export interface Discrepancy {
  category: 'missing_domain' | 'missing_flow' | 'extra_flow' | 'node_mismatch'
    | 'connection_mismatch' | 'schema_mismatch' | 'event_mismatch'
    | 'validation_regression';
  description: string;
  recommendation: string;
}

export interface ComparisonResult {
  dimensions: DimensionScore[];
  overallScore: number;
  passed: boolean;
  threshold: number;
  discrepancies: Discrepancy[];
}

// ─── Test Phases ─────────────────────────────────────────────────────────

export type PhaseStatus = 'pass' | 'fail' | 'skip';

export interface PhaseResult {
  name: string;
  status: PhaseStatus;
  durationMs: number;
  details?: string;
}

export interface RoundTripReport {
  mode: 'online' | 'offline';
  startedAt: string;
  completedAt: string;
  phases: PhaseResult[];
  originalSnapshot?: ProjectSnapshot;
  reversedSnapshot?: ProjectSnapshot;
  comparison?: ComparisonResult;
  verdict: 'PASS' | 'FAIL';
}
