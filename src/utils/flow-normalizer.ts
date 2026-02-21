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
    const connections = rawConns.map((c: Record<string, unknown>) => {
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

    // Normalize data_store: entity/schema → model
    if (n.type === 'data_store' && !spec.model) {
      if (spec.entity) spec.model = spec.entity;
      else if (spec.schema) spec.model = spec.schema;
    }

    // Normalize event: event_type → event_name, infer direction from label
    if (n.type === 'event') {
      if (!spec.event_name && spec.event_type) {
        spec.event_name = spec.event_type;
      }
      if (!spec.direction) {
        const label = (n.label ?? n.name ?? '') as string;
        if (/^(emit|publish)\b/i.test(label)) {
          spec.direction = 'emit';
        } else if (/^(consume|handle|listen|receive)\b/i.test(label)) {
          spec.direction = 'consume';
        }
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

    return {
      id: n.id ?? `${n.type ?? 'node'}-auto-${Math.random().toString(36).slice(2, 8)}`,
      type: n.type ?? 'process',
      position: n.position ?? { x: 0, y: 0 },
      connections,
      spec,
      label: n.label ?? n.name ?? n.id,
      parentId: n.parentId,
      observability: n.observability,
      security: n.security,
    };
  };

  // Handle older format: trigger at top level or inside nodes[]
  let trigger = doc.trigger;
  let nodes: unknown[] = (doc.nodes as unknown[]) ?? [];

  if (!trigger || !trigger.id) {
    const triggerIdx = (nodes as Array<Record<string, unknown>>).findIndex(
      (n) => n.type === 'trigger'
    );
    if (triggerIdx >= 0) {
      trigger = (nodes as Array<Record<string, unknown>>)[triggerIdx] as unknown as typeof trigger;
      nodes = [...(nodes as unknown[]).slice(0, triggerIdx), ...(nodes as unknown[]).slice(triggerIdx + 1)];
    }
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
