/**
 * Pure normalization utilities for FlowDocument.
 * Extracted from flow-store.ts so they can be used without Tauri dependencies
 * (e.g., in the auto-test runner, CLI tools).
 */

import type {
  FlowDocument,
  DddFlowNode,
  DddNodeType,
  NodeSpec,
  DataStoreSpec,
  ServiceCallSpec,
  IpcCallSpec,
  EventNodeSpec,
  LoopSpec,
  ParallelSpec,
  SubFlowSpec,
  LlmCallSpec,
  DelaySpec,
  CacheSpec,
  TransformSpec,
  CollectionSpec,
  ParseSpec,
  CryptoSpec,
  BatchSpec,
  TransactionSpec,
  AgentLoopSpec,
  GuardrailSpec,
  HumanGateSpec,
  OrchestratorSpec,
  SmartRouterSpec,
  HandoffSpec,
  AgentGroupSpec,
} from '../types/flow';

export function defaultSpec(type: DddNodeType): NodeSpec {
  switch (type) {
    case 'trigger':
      return { event: '', source: '', description: '' };
    case 'input':
      return { fields: [], validation: '', description: '' };
    case 'process':
      return { action: '', service: '', description: '' };
    case 'decision':
      return { condition: '', trueLabel: 'Yes', falseLabel: 'No', description: '' };
    case 'terminal':
      return { outcome: '', description: '' };
    case 'agent_loop':
      return {
        model: 'claude-sonnet',
        system_prompt: '',
        max_iterations: 10,
        temperature: 0.7,
        stop_conditions: [],
        tools: [],
        memory: [],
        on_max_iterations: 'respond',
      } satisfies AgentLoopSpec;
    case 'guardrail':
      return {
        position: 'input',
        checks: [],
        on_block: 'reject',
      } satisfies GuardrailSpec;
    case 'human_gate':
      return {
        notification_channels: [],
        approval_options: [
          { id: 'approve', label: 'Approve' },
          { id: 'reject', label: 'Reject' },
        ],
        timeout: { duration: 3600, action: 'escalate' },
        context_for_human: [],
      } satisfies HumanGateSpec;
    case 'orchestrator':
      return {
        strategy: 'supervisor',
        model: 'claude-sonnet',
        supervisor_prompt: '',
        agents: [],
        fallback_chain: [],
        shared_memory: [],
        supervision: { monitor_iterations: 5, intervene_on: [] },
        result_merge_strategy: 'last_wins',
      } satisfies OrchestratorSpec;
    case 'smart_router':
      return {
        rules: [],
        llm_routing: { enabled: false, model: 'claude-haiku', routing_prompt: '', confidence_threshold: 0.8, routes: {} },
        fallback_chain: [],
        policies: {
          retry: { max_attempts: 3, on_failure: 'fallback' },
          timeout: { per_route: 30, total: 120 },
          circuit_breaker: { enabled: false, failure_threshold: 5, timeout_seconds: 60 },
        },
      } satisfies SmartRouterSpec;
    case 'handoff':
      return {
        mode: 'transfer',
        target: { flow: '', domain: '' },
        context_transfer: { include_types: [], max_context_tokens: 4000 },
        on_complete: { return_to: '', merge_strategy: 'replace' },
        on_failure: { action: 'escalate', timeout: 30 },
        notify_customer: false,
      } satisfies HandoffSpec;
    case 'agent_group':
      return {
        name: '',
        description: '',
        members: [],
        shared_memory: [],
        coordination: {
          communication: 'via_orchestrator',
          max_active_agents: 3,
          selection_strategy: 'round_robin',
          sticky_session: false,
        },
      } satisfies AgentGroupSpec;
    case 'data_store':
      return {
        operation: 'read',
        model: '',
        data: {},
        query: {},
        description: '',
      } satisfies DataStoreSpec;
    case 'service_call':
      return {
        method: 'GET',
        url: '',
        headers: {},
        body: {},
        timeout_ms: 5000,
        retry: { max_attempts: 3, backoff_ms: 1000 },
        error_mapping: {},
        description: '',
      } satisfies ServiceCallSpec;
    case 'event':
      return {
        direction: 'emit',
        event_name: '',
        payload: {},
        async: true,
        description: '',
      } satisfies EventNodeSpec;
    case 'loop':
      return {
        collection: '',
        iterator: 'item',
        break_condition: '',
        description: '',
      } satisfies LoopSpec;
    case 'parallel':
      return {
        branches: [],
        join: 'all',
        timeout_ms: 30000,
        description: '',
      } satisfies ParallelSpec;
    case 'sub_flow':
      return {
        flow_ref: '',
        input_mapping: {},
        output_mapping: {},
        description: '',
      } satisfies SubFlowSpec;
    case 'llm_call':
      return {
        model: 'claude-sonnet',
        system_prompt: '',
        prompt_template: '',
        temperature: 0.7,
        max_tokens: 4096,
        structured_output: {},
        retry: { max_attempts: 3, backoff_ms: 1000 },
        description: '',
      } satisfies LlmCallSpec;
    case 'delay':
      return {
        min_ms: 1000,
        max_ms: 5000,
        strategy: 'random',
        description: '',
      } satisfies DelaySpec;
    case 'cache':
      return {
        key: '',
        ttl_ms: 3600000,
        store: 'redis',
        description: '',
      } satisfies CacheSpec;
    case 'transform':
      return {
        input_schema: '',
        output_schema: '',
        field_mappings: {},
        description: '',
      } satisfies TransformSpec;
    case 'collection':
      return {
        operation: 'filter',
        input: '',
        output: '',
        description: '',
      } satisfies CollectionSpec;
    case 'parse':
      return {
        format: 'json',
        input: '',
        output: '',
        description: '',
      } satisfies ParseSpec;
    case 'crypto':
      return {
        operation: 'encrypt',
        algorithm: 'aes-256-gcm',
        key_source: { env: '' },
        input_fields: [],
        output_field: '',
        description: '',
      } satisfies CryptoSpec;
    case 'batch':
      return {
        input: '',
        operation_template: { type: 'service_call', dispatch_field: '', configs: {} },
        concurrency: 3,
        on_error: 'continue',
        output: '',
        description: '',
      } satisfies BatchSpec;
    case 'transaction':
      return {
        isolation: 'read_committed',
        steps: [],
        rollback_on_error: true,
        description: '',
      } satisfies TransactionSpec;
    case 'ipc_call':
      return {
        command: '',
        args: {},
        return_type: '',
        description: '',
      } satisfies IpcCallSpec;
    default:
      return { description: '' };
  }
}

export function defaultLabel(type: DddNodeType): string {
  switch (type) {
    case 'trigger': return 'Trigger';
    case 'input': return 'Input';
    case 'process': return 'Process';
    case 'decision': return 'Decision';
    case 'terminal': return 'Terminal';
    case 'agent_loop': return 'Agent Loop';
    case 'guardrail': return 'Guardrail';
    case 'human_gate': return 'Human Gate';
    case 'orchestrator': return 'Orchestrator';
    case 'smart_router': return 'Smart Router';
    case 'handoff': return 'Handoff';
    case 'agent_group': return 'Agent Group';
    case 'data_store': return 'Data Store';
    case 'service_call': return 'Service Call';
    case 'event': return 'Event';
    case 'loop': return 'Loop';
    case 'parallel': return 'Parallel';
    case 'sub_flow': return 'Sub-Flow';
    case 'llm_call': return 'LLM Call';
    case 'delay': return 'Delay';
    case 'cache': return 'Cache';
    case 'transform': return 'Transform';
    case 'collection': return 'Collection';
    case 'parse': return 'Parse';
    case 'crypto': return 'Crypto';
    case 'batch': return 'Batch';
    case 'transaction': return 'Transaction';
    case 'ipc_call': return 'IPC Call';
    case 'websocket_broadcast': return 'WebSocket Broadcast';
  }
}

/**
 * Normalize a raw YAML-parsed document into the internal FlowDocument shape.
 * Handles external YAML conventions:
 *   - connections using `target` or `targetId` instead of `targetNodeId`
 *   - spec fields inlined on the node instead of nested under `spec:`
 *   - trigger embedded inside `nodes:` array (older format)
 *   - `properties:` used instead of `spec:` (older format)
 */
export function normalizeFlowDocument(raw: Record<string, unknown>, domainId: string, flowId: string, flowType?: string): FlowDocument {
  const doc = raw as unknown as FlowDocument;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizeNode = (n: any): DddFlowNode => {
    // Normalize connections: target / targetId → targetNodeId
    const rawConns: Array<Record<string, unknown>> = n.connections ?? [];
    let connections = rawConns.map((c: Record<string, unknown>) => {
      const sh = c.sourceHandle as string | undefined;
      const th = c.targetHandle as string | undefined;
      return {
        targetNodeId: (c.targetNodeId ?? c.target ?? c.targetId ?? '') as string,
        sourceHandle: sh === 'default' ? undefined : sh,
        targetHandle: th === 'default' ? undefined : th,
        label: c.label as string | undefined,
        data: c.data as Array<{ name: string; type: string }> | undefined,
        behavior: c.behavior as 'continue' | 'stop' | 'retry' | 'circuit_break' | undefined,
      };
    });

    // Normalize spec: pull from `spec:`, `properties:`, `config:`, or inlined fields
    let spec = n.spec ?? n.properties ?? n.config ?? {};
    if (typeof spec !== 'object' || spec === null) spec = {};

    // Collect inlined spec-like fields (anything not structural)
    const STRUCTURAL_KEYS = new Set([
      'id', 'type', 'label', 'name', 'position', 'connections', 'parentId',
      'spec', 'properties', 'config', 'observability', 'security',
    ]);
    const inlined: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(n)) {
      if (!STRUCTURAL_KEYS.has(k)) inlined[k] = v;
    }
    if (Object.keys(inlined).length > 0) {
      spec = { ...inlined, ...spec };
    }

    // Normalize smart_router: routes[].id → rules[].route
    if (n.type === 'smart_router' && spec.routes && !spec.rules) {
      spec.rules = (spec.routes as Array<Record<string, unknown>>).map(
        (r: Record<string, unknown>) => ({ ...r, route: r.route ?? r.id })
      );
    }

    // Normalize data_store: entity/schema/models → model
    if (n.type === 'data_store' && !spec.model) {
      if (spec.entity) spec.model = spec.entity;
      else if (spec.schema) spec.model = spec.schema;
      else if (Array.isArray(spec.models) && (spec.models as string[]).length > 0) {
        spec.model = (spec.models as string[])[0]; // use first model for validation
      }
    }

    // Normalize event: event_type → event_name, action → direction, infer from label
    if (n.type === 'event') {
      if (!spec.event_name && spec.event_type) spec.event_name = spec.event_type;
      // External YAML uses `event: "name"` at config level for event name
      if (!spec.event_name && spec.event && typeof spec.event === 'string') spec.event_name = spec.event;
      // External YAML uses `action: emit/consume` instead of `direction`
      if (!spec.direction && spec.action) {
        spec.direction = String(spec.action) === 'emit' || String(spec.action) === 'publish' ? 'emit' : 'consume';
      }
      if (!spec.direction) {
        const label = (n.label ?? n.name ?? '') as string;
        if (/^(emit|publish)\b/i.test(label)) {
          spec.direction = 'emit';
        } else if (/^(consume|handle|listen|receive)\b/i.test(label)) {
          spec.direction = 'consume';
        } else {
          // Default to emit when we can infer from event name in label
          spec.direction = 'emit';
        }
      }
      // Last-resort: infer event_name from label ("Emit alert.triggered" → "alert.triggered")
      if (!spec.event_name) {
        const label = (n.label ?? n.name ?? '') as string;
        const match = label.match(/^(?:emit|publish|consume|handle|listen|receive)\s+(.+)$/i);
        if (match) spec.event_name = match[1].trim();
        else if (label.trim()) spec.event_name = label.trim();
      }
    }

    // Normalize service_call: endpoint → url
    if (n.type === 'service_call' && !spec.url && spec.endpoint) {
      spec.url = spec.endpoint;
    }

    // Normalize sub_flow: flow → flow_ref
    if (n.type === 'sub_flow' && !spec.flow_ref && spec.flow) {
      spec.flow_ref = spec.flow;
    }

    // Normalize llm_call: prompt → prompt_template
    if (n.type === 'llm_call' && !spec.prompt_template && spec.prompt) {
      spec.prompt_template = spec.prompt;
    }

    // Normalize parallel: coerce numeric branches to ParallelBranch[]
    if (n.type === 'parallel' && typeof spec.branches === 'number') {
      const count = spec.branches as number;
      spec.branches = Array.from({ length: count }, (_, i) => ({
        id: `branch-${i}`,
        label: `Branch ${i + 1}`,
      }));
    }

    // Normalize trigger: infer spec.event from label if missing
    if (n.type === 'trigger') {
      const event = spec.event;
      const eventEmpty = !event || (typeof event === 'string' ? event.trim() === '' : (Array.isArray(event) && event.length === 0));
      if (eventEmpty) {
        const label = (n.label ?? n.name ?? '') as string;
        if (label.trim()) {
          spec.event = label.trim();
        }
      }
    }

    const nodeId = (n.id ?? `${n.type ?? 'node'}-auto-${Math.random().toString(36).slice(2, 8)}`) as string;
    // Map unknown node types from /ddd-create to nearest known DDD node type
    const TYPE_MAP: Record<string, string> = {
      http: 'service_call',
      rest: 'service_call',
      manual: 'process',
      webhook: 'trigger',
    };
    const rawType = (n.type ?? 'process') as string;
    const nodeType = (TYPE_MAP[rawType] ?? rawType) as DddNodeType;

    // --- Post-process connections and spec based on node type ---

    // Batch: external YAML uses `operation: {type, ...}` instead of `operation_template`,
    // and may not have an explicit `input` field (data is implicit from context).
    if (nodeType === 'batch') {
      if (!spec.operation_template && spec.operation && typeof spec.operation === 'object') {
        spec.operation_template = spec.operation as Record<string, unknown>;
      }
      if (!spec.input && (spec.chunk_size || spec.max_concurrency || spec.operation_template)) {
        spec.input = '$.data';
      }
    }

    // Parse: external YAML may not have an explicit `input` field.
    if (nodeType === 'parse') {
      if (!spec.input && (spec.format || spec.strategy)) {
        spec.input = '$.data';
      }
    }

    // Transaction: external YAML uses individual operation nodes (begin/rollback/commit)
    // rather than the internal multi-step format. Normalize for validator compatibility:
    // - commit: remap success→committed, error→rolled_back
    // - begin/rollback: single-exit nodes; mark with _transactionOp for validator
    if (nodeType === 'transaction') {
      const op = spec.operation as string | undefined;
      if (op) spec._transactionOp = op;
      if (op === 'commit') {
        connections = connections.map((conn) => {
          if (conn.sourceHandle === 'success') return { ...conn, sourceHandle: 'committed' };
          if (conn.sourceHandle === 'error') return { ...conn, sourceHandle: 'rolled_back' };
          return conn;
        });
      }
    }

    // Event: normalize operation → direction (some external YAML uses operation instead of action)
    if (nodeType === 'event' && !spec.direction && spec.operation) {
      const op = String(spec.operation);
      spec.direction = (op === 'emit' || op === 'publish') ? 'emit' : 'consume';
    }

    // Decision: normalize true_label/false_label → trueLabel/falseLabel,
    // remap semantic handle names to canonical "true"/"false",
    // and normalize `expression` → `condition` (external YAML alias).
    if (nodeType === 'decision') {
      if (!spec.condition && spec.expression) spec.condition = spec.expression;
      const trueLabel = spec.true_label as string | undefined;
      const falseLabel = spec.false_label as string | undefined;
      if (trueLabel && !spec.trueLabel) spec.trueLabel = trueLabel;
      if (falseLabel && !spec.falseLabel) spec.falseLabel = falseLabel;
      // Remap semantic handles (e.g. "can_escalate") → "true"/"false"
      if (trueLabel || falseLabel) {
        connections = connections.map((conn) => {
          if (trueLabel && conn.sourceHandle === trueLabel) return { ...conn, sourceHandle: 'true' };
          if (falseLabel && conn.sourceHandle === falseLabel) return { ...conn, sourceHandle: 'false' };
          return conn;
        });
      }
      // Remap common yes/no aliases
      connections = connections.map((conn) => {
        if (conn.sourceHandle === 'yes') return { ...conn, sourceHandle: 'true' };
        if (conn.sourceHandle === 'no') return { ...conn, sourceHandle: 'false' };
        return conn;
      });
    }

    // Collection: infer operation/input from external query-builder format
    // and remap "valid"/"output"/undefined handles → "result".
    if (nodeType === 'collection') {
      if (!spec.operation) {
        if (spec.filters || spec.filter) spec.operation = 'filter';
        else if (spec.aggregate) spec.operation = 'aggregate';
        else if (spec.group_by) spec.operation = 'group_by';
        else spec.operation = 'filter';
      }
      if (!spec.input && (spec.filters || spec.filter || spec.aggregate || spec.group_by || spec.sort || spec.pagination)) {
        spec.input = '$.data';
      }
      // Remap "valid", "output", and unnamed handles → "result" when no explicit "result" exists
      const hasResult = connections.some((c) => c.sourceHandle === 'result');
      if (!hasResult) {
        connections = connections.map((conn) => {
          if (conn.sourceHandle === 'valid' || conn.sourceHandle === 'output' || conn.sourceHandle === undefined) {
            return { ...conn, sourceHandle: 'result' };
          }
          return conn;
        });
      }
    }

    // Guardrail: external YAML uses "passed"/"blocked" instead of "pass"/"block".
    // Normalize to the canonical handle names used by the validator.
    if (nodeType === 'guardrail') {
      connections = connections.map((conn) => {
        if (conn.sourceHandle === 'passed') return { ...conn, sourceHandle: 'pass' };
        if (conn.sourceHandle === 'blocked') return { ...conn, sourceHandle: 'block' };
        return conn;
      });
    }

    // Transform: external YAML uses mode:expression + output:{} instead of
    // input_schema/output_schema. Set placeholder schema names so the validator passes.
    if (nodeType === 'transform') {
      if (spec.mode && !spec.input_schema) spec.input_schema = 'Expression';
      if (spec.mode && !spec.output_schema) spec.output_schema = 'Expression';
      if (!spec.field_mappings && spec.output && typeof spec.output === 'object') {
        spec.field_mappings = spec.output;
      }
    }

    // Parallel: normalize external branch formats to the internal branch-N sourceHandle convention.
    if (nodeType === 'parallel' && Array.isArray(spec.branches)) {
      const branches = spec.branches as Array<Record<string, unknown>>;

      // Format A — Inline branches: branches embed full node configs (node_type or node field).
      // These run internally; the parallel only emits done/error with no branch-N connections.
      // Mark with _inlineBranches so the validator skips branch-N handle checks.
      const hasInlineBranches = branches.some(
        (b) => 'node_type' in b || 'node' in b
      );
      if (hasInlineBranches) {
        spec._inlineBranches = true;
      } else {
        // Format B — Fan-out branches: branches have id/output_key only; separate nodes are
        // connected via branch ID as sourceHandle (e.g., "email", "sms").
        // Remap branch ID handles → branch-N so getParallelBranchChildIds can detect them.
        const idToIdx = new Map<string, number>();
        branches.forEach((b, idx) => {
          const id = b.id as string | undefined;
          const label = b.label as string | undefined;
          if (id) idToIdx.set(id, idx);
          if (label) idToIdx.set(label, idx);
        });
        const hasBranchN = connections.some((c) => c.sourceHandle?.startsWith('branch-'));
        if (!hasBranchN && idToIdx.size > 0) {
          connections = connections.map((conn) => {
            if (conn.sourceHandle !== undefined && conn.sourceHandle !== 'done' && conn.sourceHandle !== 'error') {
              const idx = idToIdx.get(conn.sourceHandle);
              if (idx !== undefined) {
                return { ...conn, sourceHandle: `branch-${idx}` };
              }
            }
            return conn;
          });
        }
      }
    }

    return {
      id: nodeId,
      type: nodeType,
      position: n.position ?? { x: 0, y: 0 },
      connections,
      spec,
      label: ((n.label ?? n.name ?? n.id ?? nodeId) as string | undefined) ?? nodeId,
      parentId: n.parentId,
      observability: n.observability,
      security: n.security,
    };
  };

  // Handle older format: trigger at top level or inside nodes[]
  let trigger = doc.trigger;
  let nodes: unknown[] = (doc.nodes as unknown[]) ?? [];

  // Coerce API trigger types (http, timer, cron, webhook, etc.) to DDD trigger type.
  // These appear in the trigger: section as type: http/timer — they are trigger specs,
  // not node types. Always use type: 'trigger' for the node.
  const NON_NODE_TRIGGER_TYPES = new Set([
    'http', 'timer', 'cron', 'webhook', 'event', 'schedule', 'queue',
    'graphql', 'grpc', 'manual', 'interval',
    // Additional trigger types from /ddd-create that are not DDD node types:
    'sub_flow', 'pattern', 'ipc', 'message', 'stream', 'pubsub', 'job', 'signal',
  ]);

  if (!trigger || !trigger.id) {
    const triggerIdx = (nodes as Array<Record<string, unknown>>).findIndex(
      (n) => n.type === 'trigger'
    );
    if (triggerIdx >= 0) {
      trigger = (nodes as Array<Record<string, unknown>>)[triggerIdx] as unknown as typeof trigger;
      nodes = [...(nodes as unknown[]).slice(0, triggerIdx), ...(nodes as unknown[]).slice(triggerIdx + 1)];
    } else if (trigger && NON_NODE_TRIGGER_TYPES.has((trigger as unknown as Record<string, unknown>).type as string)) {
      // Top-level trigger block with API type (e.g. type: http) — synthesize a trigger node from it.
      // Auto-connect to the first node since the dispatch is implicit in API-triggered flows.
      const rawTrigger = trigger as unknown as Record<string, unknown>;
      const firstNodeId = (nodes as Array<Record<string, unknown>>)[0]?.id as string | undefined;
      trigger = {
        id: 'trigger-default',
        type: 'trigger',
        label: (rawTrigger.label ?? rawTrigger.name ?? String(rawTrigger.type ?? 'Trigger')) as string,
        position: { x: 250, y: 50 },
        connections: firstNodeId ? [{ targetNodeId: firstNodeId }] : (rawTrigger.connections ?? []),
        spec: { event: rawTrigger.path ?? rawTrigger.event ?? rawTrigger.type, method: rawTrigger.method, ...rawTrigger },
      } as unknown as typeof trigger;
    }
  }

  // Handle top-level connections array (external /ddd-create format):
  //   connections: [{from: nodeId, to: nodeId, sourceHandle?, targetHandle?, label?}]
  // Distribute them into each source node's connections array before normalization.
  const topLevelConns = (raw as Record<string, unknown>).connections;
  if (Array.isArray(topLevelConns) && topLevelConns.length > 0) {
    const connsBySource = new Map<string, Array<{ targetNodeId: string; sourceHandle?: string; targetHandle?: string; label?: string }>>();
    for (const conn of topLevelConns as Array<Record<string, unknown>>) {
      const from = (conn.from ?? conn.source) as string;
      const to = (conn.to ?? conn.target) as string;
      if (!from || !to) continue;
      if (!connsBySource.has(from)) connsBySource.set(from, []);
      const sh = conn.sourceHandle as string | undefined;
      const th = conn.targetHandle as string | undefined;
      connsBySource.get(from)!.push({
        targetNodeId: to,
        sourceHandle: !sh || sh === 'default' ? undefined : sh,
        targetHandle: !th || th === 'default' ? undefined : th,
        label: conn.label as string | undefined,
      });
    }

    // Inject into trigger
    const triggerObj = trigger as unknown as Record<string, unknown>;
    const triggerId = triggerObj?.id as string;
    if (triggerId && connsBySource.has(triggerId)) {
      const existing = (triggerObj.connections as unknown[] | undefined) ?? [];
      triggerObj.connections = [...existing, ...connsBySource.get(triggerId)!];
    }

    // Inject into regular nodes
    nodes = (nodes as Array<Record<string, unknown>>).map((n) => {
      const nodeId = n.id as string;
      if (!nodeId || !connsBySource.has(nodeId)) return n;
      const existing = (n.connections as unknown[] | undefined) ?? [];
      return { ...n, connections: [...existing, ...connsBySource.get(nodeId)!] };
    });
  }

  const normalizedTrigger = trigger ? normalizeNode(trigger) : {
    id: 'trigger-default',
    type: 'trigger' as const,
    position: { x: 250, y: 50 },
    connections: [],
    spec: {},
    label: 'Trigger',
  };

  const normalizedNodes = (nodes as Array<Record<string, unknown>>).map(normalizeNode);

  // Preserve flow-level fields
  const flowObj = doc.flow ?? {
    id: (raw as Record<string, unknown>).name as string ?? flowId,
    name: (raw as Record<string, unknown>).name as string ?? flowId,
    type: (flowType as 'traditional' | 'agent') ?? 'traditional',
    domain: (raw as Record<string, unknown>).domain as string ?? domainId,
    description: (raw as Record<string, unknown>).description as string,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawFlow = doc.flow as any;
  if (rawFlow) {
    if (rawFlow.template !== undefined) flowObj.template = rawFlow.template;
    if (rawFlow.parameters !== undefined) flowObj.parameters = rawFlow.parameters;
    if (rawFlow.contract !== undefined) flowObj.contract = rawFlow.contract;
    if (rawFlow.emits !== undefined) flowObj.emits = rawFlow.emits;
    if (rawFlow.listens_to !== undefined) flowObj.listens_to = rawFlow.listens_to;
  }

  return {
    flow: flowObj,
    trigger: normalizedTrigger,
    nodes: normalizedNodes,
    metadata: doc.metadata ?? {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  };
}
