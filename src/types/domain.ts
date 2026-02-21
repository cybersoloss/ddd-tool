import type { Position } from './sheet';

export interface DomainFlowEntry {
  id: string;
  name: string;
  description?: string;
  type?: 'traditional' | 'agent';
  tags?: string[];
  group?: string;
  keyboard_shortcut?: string;
}

export interface EventWiring {
  event: string;
  schema?: string;
  from_flow?: string;
  handled_by_flow?: string;
  description?: string;
  payload?: Record<string, unknown>;
}

export interface DomainLayout {
  flows: Record<string, Position>;
  portals: Record<string, Position>;
}

export interface FlowGroup {
  id: string;
  name: string;
  flow_ids: string[];
}

export interface StoreDefinition {
  name: string;
  shape?: Record<string, string>;
  initial_state?: Record<string, unknown>;
  selectors?: string[];
  access_pattern?: 'read_write' | 'read_only';
}

export interface DomainOnError {
  emit_event?: string;
  description?: string;
}

export interface EventGroup {
  name: string;
  description?: string;
  events: string[];
}

export interface DomainConfig {
  name: string;
  description?: string;
  role?: 'entity' | 'process' | 'interface' | 'orchestration';
  owns_schemas?: string[];
  stores?: StoreDefinition[];
  on_error?: DomainOnError;
  event_groups?: EventGroup[];
  groups?: FlowGroup[];
  flows: DomainFlowEntry[];
  publishes_events: EventWiring[];
  consumes_events: EventWiring[];
  layout: DomainLayout;
}

export interface SystemZone {
  id: string;
  name: string;
  domain_ids: string[];
  color?: string;
}

export interface SystemLayout {
  domains: Record<string, Position>;
  zones?: SystemZone[];
}

// View models for rendering

export interface SystemMapDomain {
  id: string;
  name: string;
  description?: string;
  flowCount: number;
  position: Position;
  role?: 'entity' | 'process' | 'interface' | 'orchestration';
  hasHumanTouchpoint?: boolean;
  owns_schemas?: string[];
  storeCount?: number;
}

export interface SystemMapArrow {
  id: string;
  sourceDomainId: string;
  targetDomainId: string;
  events: string[];
}

export interface SystemMapData {
  domains: SystemMapDomain[];
  eventArrows: SystemMapArrow[];
  zones?: SystemZone[];
}

// L2 Orchestration visuals

export interface OrchestrationRelationship {
  type: 'supervisor' | 'handoff';
  sourceFlowId: string;
  targetFlowId: string;
  mode?: 'transfer' | 'consult' | 'collaborate';
}

export interface AgentGroupVisual {
  id: string;
  name: string;
  flowIds: string[];
}

export interface DomainOrchestration {
  relationships: OrchestrationRelationship[];
  agentGroups: AgentGroupVisual[];
}

// L2 Domain Map view models

export interface DomainMapFlow {
  id: string;
  name: string;
  description?: string;
  type: 'traditional' | 'agent';
  position: Position;
  tags?: string[];
  keyboard_shortcut?: string;
  group?: string;
  schedule?: string;
}

export interface DomainMapPortal {
  id: string; // target domain ID
  targetDomainName: string;
  position: Position;
}

export interface DomainMapArrow {
  id: string;
  sourceId: string;
  targetId: string;
  sourceType: 'flow' | 'portal';
  targetType: 'flow' | 'portal';
  events: string[];
}

export interface DomainMapData {
  flows: DomainMapFlow[];
  portals: DomainMapPortal[];
  eventArrows: DomainMapArrow[];
}
