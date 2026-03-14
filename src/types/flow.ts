import type { Position } from './sheet';
import type { ValidationIssue } from './validation';
import type { ObservabilityConfig, SecurityConfig } from './crosscutting';

// --- Node types ---

export type DddNodeType =
  | 'trigger' | 'input' | 'process' | 'decision' | 'terminal'
  | 'data_store' | 'service_call' | 'event' | 'loop' | 'parallel' | 'sub_flow' | 'llm_call'
  | 'delay' | 'cache' | 'transform'
  | 'collection' | 'parse' | 'crypto' | 'batch' | 'transaction'
  | 'ipc_call'
  | 'agent_loop' | 'guardrail' | 'human_gate'
  | 'orchestrator' | 'smart_router' | 'handoff' | 'agent_group'
  | 'websocket_broadcast'
  | 'text_split';

// --- Per-node spec shapes ---

export interface JobRetryConfig {
  max_attempts?: number;
  backoff_ms?: number;
  strategy?: 'fixed' | 'linear' | 'exponential';
  jitter?: boolean;
}

export interface JobConfig {
  queue?: string;
  concurrency?: number;
  timeout_ms?: number;
  retry?: JobRetryConfig;
  dead_letter?: boolean;
  lock_ttl_ms?: number;
  jitter_ms?: number;
  priority?: number;
  dedup_key?: string;
}

export interface TriggerPattern {
  event?: string;
  group_by?: string;
  threshold?: number;
  window?: string;
}

export interface TriggerSpec {
  event?: string | string[];
  source?: string;
  filter?: Record<string, unknown>;
  debounce_ms?: number;
  description?: string;
  method?: string;
  path?: string;
  job_config?: JobConfig;
  pattern?: TriggerPattern;
  rate_limit?: {
    window_ms: number;
    max_requests: number;
    key_by?: 'ip' | 'user' | 'api_key';
    on_exceeded?: 'reject' | 'queue' | 'delay';
  };
  signature?: {
    algorithm: 'hmac-sha256' | 'hmac-sha1';
    key_source: { env: string };
    header: string;
  };
  connection_config?: {
    auth_required: boolean;
    auth_strategy?: 'jwt' | 'api_key' | 'none';
    heartbeat_ms?: number;
    max_connections_per_client?: number;
    reconnect?: boolean;
  };
  tier_limits?: Array<{ role: string; max_requests: number; window_ms: number }>;
  [key: string]: unknown;
}

export interface InputSpec {
  fields?: Array<{ name: string; type: string; required?: boolean }>;
  validation?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ProcessSpec {
  action?: string;
  service?: string;
  category?: 'security' | 'transform' | 'integration' | 'business_logic' | 'infrastructure';
  inputs?: string[];
  outputs?: string[];
  description?: string;
  [key: string]: unknown;
}

export interface DecisionSpec {
  condition?: string;
  trueLabel?: string;
  falseLabel?: string;
  description?: string;
  [key: string]: unknown;
}

export interface TerminalSpec {
  outcome?: string;
  description?: string;
  status?: number;
  body?: Record<string, unknown>;
  response_type?: 'json' | 'stream' | 'sse' | 'empty';
  headers?: Record<string, string>;
  [key: string]: unknown;
}

// --- Agent-specific spec shapes ---

export interface ToolDefinition {
  id: string;
  name: string;
  description?: string;
  parameters?: string;
  implementation?: string;
  is_terminal?: boolean;
  requires_confirmation?: boolean;
}

export interface MemoryStoreDefinition {
  name: string;
  type: 'conversation_history' | 'vector_store' | 'key_value';
  max_tokens?: number;
  strategy?: string;
  embedding_model?: string;
  similarity_threshold?: number;
  max_results?: number;
  namespace?: string;
}

export interface AgentLoopSpec {
  model?: string;
  system_prompt?: string;
  max_iterations?: number;
  temperature?: number;
  stop_conditions?: string[];
  tools?: ToolDefinition[];
  memory?: MemoryStoreDefinition[];
  on_max_iterations?: 'escalate' | 'respond' | 'error';
  streaming?: { enabled: boolean; format: 'sse' | 'websocket'; chunk_field?: string };
  [key: string]: unknown;
}

export interface GuardrailCheck {
  type: string;
  action: 'block' | 'warn' | 'log';
  rule?: string;
}

export interface GuardrailSpec {
  position?: 'input' | 'output';
  checks?: GuardrailCheck[];
  on_block?: string;
  [key: string]: unknown;
}

export interface ApprovalOption {
  id: string;
  label: string;
  description?: string;
  requires_input?: boolean;
}

export interface HumanGateSpec {
  notification_channels?: string[];
  approval_options?: ApprovalOption[];
  timeout?: {
    duration?: number;
    action?: 'escalate' | 'auto_approve' | 'auto_reject';
  };
  context_for_human?: string[];
  [key: string]: unknown;
}

// --- Orchestration spec shapes ---

export interface OrchestratorAgent {
  id: string;
  flow: string;
  specialization?: string;
  priority?: number;
  model_override?: string;
}

export interface SupervisionRule {
  condition: string;
  threshold?: number;
  action: string;
}

export interface SharedMemoryEntry {
  name: string;
  type: string;
  access: 'read_write' | 'read_only';
}

export interface OrchestratorSpec {
  strategy?: 'supervisor' | 'round_robin' | 'broadcast' | 'consensus';
  model?: string;
  supervisor_prompt?: string;
  agents?: OrchestratorAgent[];
  fallback_chain?: string[];
  shared_memory?: SharedMemoryEntry[];
  supervision?: {
    monitor_iterations?: number;
    intervene_on?: SupervisionRule[];
  };
  result_merge_strategy?: 'last_wins' | 'best_of' | 'combine' | 'supervisor_picks';
  [key: string]: unknown;
}

export interface SmartRouterRule {
  id: string;
  condition: string;
  route: string;
  priority?: number;
}

export interface SmartRouterSpec {
  rules?: SmartRouterRule[];
  llm_routing?: {
    enabled?: boolean;
    model?: string;
    routing_prompt?: string;
    confidence_threshold?: number;
    routes?: Record<string, string>;
  };
  fallback_chain?: string[] | 'skip';
  fallback_note?: string;
  policies?: {
    retry?: { max_attempts?: number; on_failure?: string };
    timeout?: { per_route?: number; total?: number };
    circuit_breaker?: { enabled?: boolean; failure_threshold?: number; timeout_seconds?: number; runtime_state?: 'closed' | 'open' | 'half_open' };
  };
  [key: string]: unknown;
}

export interface HandoffSpec {
  mode?: 'transfer' | 'consult' | 'collaborate';
  target?: { flow?: string; domain?: string };
  context_transfer?: { include_types?: string[]; max_context_tokens?: number };
  on_complete?: { return_to?: string; merge_strategy?: string };
  on_failure?: { action?: string; timeout?: number; flow?: string };
  notify_customer?: boolean;
  [key: string]: unknown;
}

export interface AgentGroupMember {
  flow: string;
  domain?: string;
}

export interface AgentGroupSpec {
  name?: string;
  description?: string;
  members?: AgentGroupMember[];
  shared_memory?: SharedMemoryEntry[];
  coordination?: {
    communication?: 'via_orchestrator' | 'direct' | 'blackboard';
    max_active_agents?: number;
    selection_strategy?: string;
    sticky_session?: boolean;
  };
  [key: string]: unknown;
}

// --- Extended traditional node spec shapes ---

export interface DataStoreFilter {
  field: string;
  value: string;
  required?: boolean;
}

export interface DataStoreSpec {
  store_type?: 'database' | 'filesystem' | 'memory';
  operation?: 'create' | 'read' | 'update' | 'delete' | 'upsert' | 'create_many' | 'update_many' | 'delete_many'
    | 'get' | 'set' | 'merge' | 'reset' | 'subscribe' | 'update_where' | 'aggregate';
  model?: string;
  data?: Record<string, string>;
  query?: Record<string, string>;
  filters?: DataStoreFilter[];
  pagination?: Record<string, unknown>;
  sort?: Record<string, unknown>;
  batch?: boolean;
  upsert_key?: string[];
  include?: Record<string, unknown>;
  returning?: boolean;
  // filesystem fields (when store_type = 'filesystem')
  path?: string;
  content?: string;
  create_parents?: boolean;
  // memory fields (when store_type = 'memory')
  store?: string;
  selector?: string;
  // memory update_where fields
  predicate?: string;
  patch?: Record<string, unknown>;
  // safety mode for null handling
  safety?: 'strict' | 'lenient';
  // aggregate fields (when operation = 'aggregate')
  aggregate_fields?: Array<{
    function: 'count' | 'sum' | 'avg' | 'min' | 'max';
    field?: string;
    alias: string;
  }>;
  group_by?: string[];
  description?: string;
  [key: string]: unknown;
}

export interface Oauth1aConfig {
  api_key_field: string;
  api_key_secret_field: string;
  access_token_field: string;
  access_token_secret_field: string;
}

export interface ServiceCallSpec {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url?: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  timeout_ms?: number;
  retry?: { max_attempts?: number; backoff_ms?: number; strategy?: 'fixed' | 'linear' | 'exponential'; jitter?: boolean };
  error_mapping?: Record<string, string>;
  request_config?: {
    user_agent?: 'rotate' | 'browser' | 'custom';
    delay?: { min_ms?: number; max_ms?: number; strategy?: 'random' | 'fixed' };
    cookie_jar?: 'per_domain' | 'shared' | 'none';
    proxy?: 'pool' | 'direct' | 'tor';
    tls_fingerprint?: 'randomize' | 'chrome' | 'firefox' | 'default';
    fallback?: 'headless_browser' | 'none';
  };
  integration?: string;
  oauth_config?: {
    token_store: string;
    refresh_url: string;
    client_id_env: string;
    client_secret_env: string;
  };
  oauth1a_config?: Oauth1aConfig;
  capture_headers?: string[];
  fallback?: {
    value: unknown;
    log?: boolean;
  };
  description?: string;
  [key: string]: unknown;
}

export interface IpcCallSpec {
  command?: string;
  args?: Record<string, unknown>;
  return_type?: string;
  timeout_ms?: number;
  bridge?: string;
  result_condition?: string;
  description?: string;
  [key: string]: unknown;
}

export interface EventNodeSpec {
  direction?: 'emit' | 'consume';
  event_name?: string;
  payload?: Record<string, unknown>;
  payload_source?: string;
  async?: boolean;
  target_queue?: string;
  priority?: number;
  delay_ms?: number;
  dedup_key?: string;
  correlation_id?: string;
  schema_ref?: string;
  description?: string;
  [key: string]: unknown;
}

export interface LoopSpec {
  collection?: string;
  iterator?: string;
  break_condition?: string;
  on_error?: 'continue' | 'break' | 'fail';
  accumulate?: { field?: string; strategy?: 'append' | 'merge' | 'sum' | 'last'; output?: string };
  body_start?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ParallelMergeStrategy {
  type: 'keyed_by_output_key' | 'collect_success' | 'collect_all' | 'first_success';
}

export interface ParallelSpec {
  branches?: (string | { label: string; condition?: string; id?: string; output_key?: string })[];
  join?: 'all' | 'any' | 'n_of';
  join_count?: number;
  failure_policy?: 'all_required' | 'any_required' | 'best_effort';
  merge_strategy?: ParallelMergeStrategy;
  timeout_ms?: number;
  description?: string;
  [key: string]: unknown;
}

export interface SubFlowSpec {
  flow_ref?: string;
  input_mapping?: Record<string, string>;
  output_mapping?: Record<string, string>;
  description?: string;
  [key: string]: unknown;
}

export interface ModelFallback {
  model: string;
  on_error: string[];
}

export interface LlmCallSpec {
  model?: string;
  system_prompt?: string;
  prompt_template?: string;
  temperature?: number;
  max_tokens?: number;
  structured_output?: Record<string, unknown>;
  context_sources?: Record<string, { from: string; transform?: string }>;
  retry?: { max_attempts?: number; backoff_ms?: number; strategy?: 'fixed' | 'linear' | 'exponential'; jitter?: boolean };
  model_fallback?: ModelFallback[];
  prompt_files?: string[];
  description?: string;
  [key: string]: unknown;
}

export interface DelaySpec {
  min_ms?: number;
  max_ms?: number;
  strategy?: 'random' | 'fixed';
  description?: string;
  [key: string]: unknown;
}

export interface CacheSpec {
  operation?: 'check' | 'set' | 'invalidate';
  key?: string;
  ttl_ms?: number;
  ttl_jitter_ms?: number;
  value?: string;
  store?: 'redis' | 'memory';
  description?: string;
  [key: string]: unknown;
}

export interface TransformSpec {
  mode?: 'schema' | 'expression';
  input_schema?: string;
  output_schema?: string;
  field_mappings?: Record<string, string>;
  description?: string;
  [key: string]: unknown;
}

export interface CollectionSpec {
  operation?: 'filter' | 'sort' | 'deduplicate' | 'merge' | 'group_by' | 'aggregate' | 'reduce' | 'flatten' | 'first' | 'last' | 'join';
  input?: string;
  predicate?: string;
  key?: string;
  direction?: 'asc' | 'desc';
  accumulator?: { init?: unknown; expression?: string } | string;
  output?: string;
  count?: number;
  right?: string;
  on?: string;
  join_type?: 'inner' | 'left' | 'right' | 'full';
  description?: string;
  [key: string]: unknown;
}

export interface ParseSelectorDef {
  name: string;
  css: string;
  extract?: string;
  multiple?: boolean;
}

export interface ParseSpec {
  format?: 'rss' | 'atom' | 'html' | 'xml' | 'json' | 'csv' | 'markdown';
  input?: string;
  strategy?: 'strict' | 'lenient' | 'streaming' | { selectors: ParseSelectorDef[] };
  library?: string;
  output?: string;
  description?: string;
  [key: string]: unknown;
}

export interface CryptoSpec {
  operation?: 'encrypt' | 'decrypt' | 'hash' | 'sign' | 'verify' | 'jwt_sign' | 'jwt_verify' | 'generate_key' | 'generate_token';
  algorithm?: string;
  key_source?: { env?: string; vault?: string };
  input_fields?: string[];
  output_field?: string;
  payload?: Record<string, unknown>;
  expires_in?: string;
  encoding?: 'base64' | 'hex' | 'base64url' | 'uuid';
  length?: number;
  description?: string;
  [key: string]: unknown;
}

export interface WebSocketBroadcastSpec {
  channel?: string;
  event_name?: string;
  payload?: string | Record<string, unknown>;
  include_sender?: boolean;
  description?: string;
  [key: string]: unknown;
}

export interface BatchSpec {
  input?: string;
  operation_template?: { type?: string; dispatch_field?: string; configs?: Record<string, unknown> };
  sub_flow_ref?: string;
  concurrency?: number;
  on_error?: 'continue' | 'stop';
  output?: string;
  description?: string;
  [key: string]: unknown;
}

export interface TransactionSpec {
  isolation?: 'read_committed' | 'repeatable_read' | 'serializable';
  steps?: Array<{ action: string; rollback?: string }>;
  rollback_on_error?: boolean;
  description?: string;
  [key: string]: unknown;
}

export interface TextSplitSpec {
  input?: string;
  max_length?: number;
  split_strategy?: 'word' | 'sentence' | 'paragraph' | 'character';
  prefix_template?: string;
  suffix_template?: string;
  output?: string;
  description?: string;
  [key: string]: unknown;
}

export type NodeSpec =
  | TriggerSpec
  | InputSpec
  | ProcessSpec
  | DecisionSpec
  | TerminalSpec
  | DataStoreSpec
  | ServiceCallSpec
  | IpcCallSpec
  | EventNodeSpec
  | LoopSpec
  | ParallelSpec
  | SubFlowSpec
  | LlmCallSpec
  | DelaySpec
  | CacheSpec
  | TransformSpec
  | CollectionSpec
  | ParseSpec
  | CryptoSpec
  | BatchSpec
  | TransactionSpec
  | AgentLoopSpec
  | GuardrailSpec
  | HumanGateSpec
  | OrchestratorSpec
  | SmartRouterSpec
  | HandoffSpec
  | AgentGroupSpec
  | WebSocketBroadcastSpec
  | TextSplitSpec;

// --- Flow node (persisted) ---

export interface NodeLogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  fields: string[];
  condition?: string;
}

export interface DddFlowNode {
  id: string;
  type: DddNodeType;
  position: Position;
  connections: Array<{
    targetNodeId: string;
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
    data?: Array<{ name: string; type: string }>;
    behavior?: 'continue' | 'stop' | 'retry' | 'circuit_break';
  }>;
  spec: NodeSpec;
  label: string;
  parentId?: string;
  pattern_governed?: string;
  observability?: ObservabilityConfig;
  security?: SecurityConfig;
  log?: NodeLogConfig;
}

// --- Flow document (YAML shape) ---

export interface FlowDocument {
  flow: {
    id: string;
    name: string;
    type: 'traditional' | 'agent';
    domain: string;
    description?: string;
    keyboard_shortcut?: string;
    template?: boolean;
    parameters?: Record<string, { type: string; values?: string[] }>;
    contract?: {
      inputs?: Array<{ name: string; type: string; required?: boolean; ref?: string }>;
      outputs?: Array<{ name: string; type: string }>;
    };
    emits?: string[];
    listens_to?: string[];
    auth?: { required: boolean; roles?: string[]; strategy?: 'jwt' | 'api_key' | 'none' };
    metrics?: Array<{ name: string; type: 'counter' | 'gauge' | 'histogram'; labels?: string[] }>;
  };
  trigger: DddFlowNode;
  nodes: DddFlowNode[];
  metadata: {
    created: string;
    modified: string;
  };
}

// --- React Flow data prop ---

export interface DddNodeData extends Record<string, unknown> {
  label: string;
  spec: NodeSpec;
  dddType: DddNodeType;
  validationIssues?: ValidationIssue[];
  observability?: ObservabilityConfig;
  security?: SecurityConfig;
  pattern_governed?: string;
  log?: NodeLogConfig;
}
