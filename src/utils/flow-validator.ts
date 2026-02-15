import { nanoid } from 'nanoid';
import type {
  FlowDocument,
  DddFlowNode,
  AgentLoopSpec,
  OrchestratorSpec,
  SmartRouterSpec,
  HandoffSpec,
  AgentGroupSpec,
  TriggerSpec,
  InputSpec,
  DecisionSpec,
  ProcessSpec,
  DataStoreSpec,
  ServiceCallSpec,
  EventNodeSpec,
  LoopSpec,
  ParallelSpec,
  SubFlowSpec,
  LlmCallSpec,
  CollectionSpec,
  ParseSpec,
  CryptoSpec,
  BatchSpec,
  TransactionSpec,
  CacheSpec,
  TransformSpec,
  DelaySpec,
} from '../types/flow';
import type { DomainConfig } from '../types/domain';
import type {
  ValidationIssue,
  ValidationResult,
  ValidationScope,
  ValidationSeverity,
  ValidationCategory,
} from '../types/validation';

// --- Helpers ---

function issue(
  scope: ValidationScope,
  severity: ValidationSeverity,
  category: ValidationCategory,
  message: string,
  opts?: { suggestion?: string; nodeId?: string; flowId?: string; domainId?: string }
): ValidationIssue {
  return {
    id: nanoid(8),
    scope,
    severity,
    category,
    message,
    ...opts,
  };
}

function buildResult(scope: ValidationScope, targetId: string, issues: ValidationIssue[]): ValidationResult {
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;
  return {
    scope,
    targetId,
    issues,
    errorCount,
    warningCount,
    infoCount,
    isValid: errorCount === 0,
    validatedAt: new Date().toISOString(),
  };
}

function getAllNodes(flow: FlowDocument): DddFlowNode[] {
  return [...(flow.trigger ? [flow.trigger] : []), ...(flow.nodes ?? [])];
}

function buildAdjacencyMap(flow: FlowDocument): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const node of getAllNodes(flow)) {
    const targets = (node.connections ?? []).map((c) => c.targetNodeId);
    adj.set(node.id, targets);
  }
  return adj;
}

// --- Graph completeness checks ---

function checkTriggerExists(flow: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!flow.trigger) {
    issues.push(issue('flow', 'error', 'graph_completeness', 'Flow must have a trigger node'));
  }
  return issues;
}

function checkAllPathsReachTerminal(flow: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allNodes = getAllNodes(flow);
  const adj = buildAdjacencyMap(flow);
  const terminalIds = new Set(allNodes.filter((n) => n.type === 'terminal').map((n) => n.id));

  if (terminalIds.size === 0) {
    issues.push(issue('flow', 'error', 'graph_completeness', 'Flow has no terminal nodes — all paths must end at a terminal', {
      suggestion: 'Add a terminal node and connect your flow to it',
    }));
    return issues;
  }

  // For each non-terminal node that has no outgoing connections and is reachable from trigger
  const reachable = bfsReachable(flow.trigger.id, adj);
  for (const node of allNodes) {
    if (node.type === 'terminal') continue;
    // Loop and parallel nodes have special connection semantics — skip dead-end check
    if (node.type === 'loop' || node.type === 'parallel') continue;
    if (!reachable.has(node.id)) continue;
    const outgoing = adj.get(node.id) ?? [];
    if (outgoing.length === 0) {
      issues.push(issue('flow', 'error', 'graph_completeness',
        `Node "${node.label}" (${node.type}) is a dead end with no outgoing connections`,
        { nodeId: node.id, suggestion: 'Connect this node to a downstream node or terminal' }
      ));
    }
  }

  return issues;
}

function bfsReachable(startId: string, adj: Map<string, string[]>): Set<string> {
  const visited = new Set<string>();
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const neighbor of adj.get(current) ?? []) {
      if (!visited.has(neighbor)) queue.push(neighbor);
    }
  }
  return visited;
}

function checkOrphanedNodes(flow: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const adj = buildAdjacencyMap(flow);
  const reachable = bfsReachable(flow.trigger.id, adj);

  for (const node of flow.nodes) {
    if (!reachable.has(node.id)) {
      issues.push(issue('flow', 'error', 'graph_completeness',
        `Node "${node.label}" (${node.type}) is unreachable from the trigger`,
        { nodeId: node.id, suggestion: 'Connect this node to the flow graph or remove it' }
      ));
    }
  }

  return issues;
}

function checkCircularPaths(flow: FlowDocument): ValidationIssue[] {
  // Skip cycle detection for agent flows (loops are expected)
  if (flow.flow?.type === 'agent') return [];

  const issues: ValidationIssue[] = [];
  const adj = buildAdjacencyMap(flow);
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    inStack.add(nodeId);

    for (const neighbor of adj.get(nodeId) ?? []) {
      if (dfs(neighbor)) {
        return true;
      }
    }

    inStack.delete(nodeId);
    return false;
  }

  if (dfs(flow.trigger.id)) {
    issues.push(issue('flow', 'error', 'graph_completeness',
      'Flow contains a circular path (cycle detected)',
      { suggestion: 'Remove the cycle or convert to an agent flow if loops are intentional' }
    ));
  }

  return issues;
}

function checkDecisionBranches(flow: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allNodes = getAllNodes(flow);

  for (const node of allNodes) {
    if (node.type !== 'decision') continue;

    const handles = new Set(node.connections.map((c) => c.sourceHandle));
    if (!handles.has('true')) {
      issues.push(issue('flow', 'error', 'graph_completeness',
        `Decision "${node.label}" is missing a "Yes" (true) branch connection`,
        { nodeId: node.id, suggestion: 'Connect the "Yes" handle to a downstream node' }
      ));
    }
    if (!handles.has('false')) {
      issues.push(issue('flow', 'error', 'graph_completeness',
        `Decision "${node.label}" is missing a "No" (false) branch connection`,
        { nodeId: node.id, suggestion: 'Connect the "No" handle to a downstream node' }
      ));
    }
  }

  return issues;
}

function checkTerminalNoOutgoing(flow: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allNodes = getAllNodes(flow);

  for (const node of allNodes) {
    if (node.type !== 'terminal') continue;
    if (node.connections.length > 0) {
      issues.push(issue('flow', 'warning', 'graph_completeness',
        `Terminal "${node.label}" has outgoing connections — terminals should be endpoints`,
        { nodeId: node.id, suggestion: 'Remove outgoing connections from this terminal node' }
      ));
    }
  }

  return issues;
}

// --- Spec completeness checks ---

function checkTriggerEvent(flow: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const spec = (flow.trigger.spec ?? {}) as TriggerSpec;
  const event = spec.event;
  const isEmpty = !event || (typeof event === 'string' ? event.trim() === '' : event.length === 0);
  if (isEmpty) {
    issues.push(issue('flow', 'error', 'spec_completeness',
      'Trigger must have an event defined',
      { nodeId: flow.trigger.id, suggestion: 'Set the trigger event in the spec panel' }
    ));
  }
  return issues;
}

function checkInputFieldTypes(flow: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allNodes = getAllNodes(flow);

  for (const node of allNodes) {
    if (node.type !== 'input') continue;
    const spec = (node.spec ?? {}) as InputSpec;
    const fields = spec.fields ?? [];
    for (const field of fields) {
      if (!field.type || field.type.trim() === '') {
        issues.push(issue('flow', 'error', 'spec_completeness',
          `Input "${node.label}" field "${field.name}" is missing a type`,
          { nodeId: node.id, suggestion: 'Set a type for each input field (e.g., string, number)' }
        ));
      }
    }
  }

  return issues;
}

function checkDecisionCondition(flow: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allNodes = getAllNodes(flow);

  for (const node of allNodes) {
    if (node.type !== 'decision') continue;
    const spec = (node.spec ?? {}) as DecisionSpec;
    if (!spec.condition || spec.condition.trim() === '') {
      issues.push(issue('flow', 'error', 'spec_completeness',
        `Decision "${node.label}" must have a condition defined`,
        { nodeId: node.id, suggestion: 'Set the condition expression in the spec panel' }
      ));
    }
  }

  return issues;
}

function checkProcessDescription(flow: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allNodes = getAllNodes(flow);

  for (const node of allNodes) {
    if (node.type !== 'process') continue;
    const spec = (node.spec ?? {}) as ProcessSpec;
    if ((!spec.description || spec.description.trim() === '') && (!spec.action || spec.action.trim() === '')) {
      issues.push(issue('flow', 'warning', 'spec_completeness',
        `Process "${node.label}" has no description or action defined`,
        { nodeId: node.id, suggestion: 'Add a description or action to clarify what this process does' }
      ));
    }
  }

  return issues;
}

// --- Agent flow checks ---

function checkAgentFlow(flow: FlowDocument): ValidationIssue[] {
  if (flow.flow?.type !== 'agent') return [];

  const issues: ValidationIssue[] = [];
  const allNodes = getAllNodes(flow);
  const agentLoops = allNodes.filter((n) => n.type === 'agent_loop');

  if (agentLoops.length === 0) {
    issues.push(issue('flow', 'error', 'agent_validation',
      'Agent flow must have exactly one agent_loop node',
      { suggestion: 'Add an agent_loop node from the toolbar' }
    ));
    return issues;
  }

  if (agentLoops.length > 1) {
    issues.push(issue('flow', 'warning', 'agent_validation',
      `Agent flow has ${agentLoops.length} agent_loop nodes — typically only one is expected`
    ));
  }

  for (const agentLoop of agentLoops) {
    const spec = (agentLoop.spec ?? {}) as AgentLoopSpec;
    const tools = spec.tools ?? [];

    if (tools.length === 0) {
      issues.push(issue('flow', 'error', 'agent_validation',
        `Agent loop "${agentLoop.label}" has no tools defined`,
        { nodeId: agentLoop.id, suggestion: 'Add at least one tool to the agent loop' }
      ));
    } else {
      const hasTerminal = tools.some((t) => t.is_terminal);
      if (!hasTerminal) {
        issues.push(issue('flow', 'error', 'agent_validation',
          `Agent loop "${agentLoop.label}" has no terminal tool — the agent needs a way to finish`,
          { nodeId: agentLoop.id, suggestion: 'Mark at least one tool as terminal (is_terminal: true)' }
        ));
      }
    }

    if (!spec.max_iterations) {
      issues.push(issue('flow', 'warning', 'agent_validation',
        `Agent loop "${agentLoop.label}" has no max_iterations set`,
        { nodeId: agentLoop.id, suggestion: 'Set max_iterations to prevent infinite loops' }
      ));
    }

    if (!spec.model || spec.model.trim() === '') {
      issues.push(issue('flow', 'warning', 'agent_validation',
        `Agent loop "${agentLoop.label}" has no LLM model specified`,
        { nodeId: agentLoop.id, suggestion: 'Set the model (e.g., claude-sonnet) in the spec panel' }
      ));
    }
  }

  return issues;
}

// --- Orchestration checks ---

function checkOrchestrationNodes(flow: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allNodes = getAllNodes(flow);

  for (const node of allNodes) {
    switch (node.type) {
      case 'orchestrator': {
        const spec = (node.spec ?? {}) as OrchestratorSpec;
        const agents = spec.agents ?? [];
        if (agents.length < 2) {
          issues.push(issue('flow', 'error', 'orchestration_validation',
            `Orchestrator "${node.label}" must have at least 2 agents`,
            { nodeId: node.id, suggestion: 'Add agents to the orchestrator in the spec panel' }
          ));
        }
        if (!spec.strategy) {
          issues.push(issue('flow', 'error', 'orchestration_validation',
            `Orchestrator "${node.label}" must have a strategy defined`,
            { nodeId: node.id, suggestion: 'Set the strategy (supervisor, round_robin, broadcast, or consensus)' }
          ));
        }
        break;
      }
      case 'smart_router': {
        const spec = (node.spec ?? {}) as SmartRouterSpec;
        const rules = spec.rules ?? [];
        if (rules.length === 0 && !spec.llm_routing?.enabled) {
          issues.push(issue('flow', 'error', 'orchestration_validation',
            `Smart router "${node.label}" has no rules defined`,
            { nodeId: node.id, suggestion: 'Add routing rules or enable LLM routing' }
          ));
        }
        break;
      }
      case 'handoff': {
        const spec = (node.spec ?? {}) as HandoffSpec;
        if (!spec.target?.flow || spec.target.flow.trim() === '') {
          issues.push(issue('flow', 'error', 'orchestration_validation',
            `Handoff "${node.label}" must have a target flow`,
            { nodeId: node.id, suggestion: 'Set the target flow in the spec panel' }
          ));
        }
        break;
      }
      case 'agent_group': {
        const spec = (node.spec ?? {}) as AgentGroupSpec;
        const members = spec.members ?? [];
        if (members.length < 2) {
          issues.push(issue('flow', 'error', 'orchestration_validation',
            `Agent group "${node.label}" must have at least 2 members`,
            { nodeId: node.id, suggestion: 'Add members to the agent group in the spec panel' }
          ));
        }
        break;
      }
    }
  }

  return issues;
}

// --- Extended node checks ---

function checkExtendedNodes(flow: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allNodes = getAllNodes(flow);

  for (const node of allNodes) {
    switch (node.type) {
      case 'data_store': {
        const spec = (node.spec ?? {}) as DataStoreSpec;
        if (!spec.operation) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Data store "${node.label}" must have an operation set`,
            { nodeId: node.id, suggestion: 'Set the operation (create, read, update, or delete)' }
          ));
        }
        if (!spec.model || spec.model.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Data store "${node.label}" must have a model defined`,
            { nodeId: node.id, suggestion: 'Set the model name (e.g., User, Order)' }
          ));
        }
        break;
      }
      case 'service_call': {
        const spec = (node.spec ?? {}) as ServiceCallSpec;
        if (!spec.method) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Service call "${node.label}" must have a method set`,
            { nodeId: node.id, suggestion: 'Set the HTTP method (GET, POST, PUT, PATCH, DELETE)' }
          ));
        }
        if (!spec.url || spec.url.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Service call "${node.label}" must have a URL defined`,
            { nodeId: node.id, suggestion: 'Set the service URL' }
          ));
        }
        break;
      }
      case 'event': {
        const spec = (node.spec ?? {}) as EventNodeSpec;
        if (!spec.direction) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Event "${node.label}" must have a direction set`,
            { nodeId: node.id, suggestion: 'Set the direction (emit or consume)' }
          ));
        }
        if (!spec.event_name || spec.event_name.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Event "${node.label}" must have an event name defined`,
            { nodeId: node.id, suggestion: 'Set the event name' }
          ));
        }
        break;
      }
      case 'loop': {
        const spec = (node.spec ?? {}) as LoopSpec;
        if (!spec.collection || spec.collection.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Loop "${node.label}" must have a collection defined`,
            { nodeId: node.id, suggestion: 'Set the collection to iterate over' }
          ));
        }
        if (!spec.iterator || spec.iterator.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Loop "${node.label}" must have an iterator variable defined`,
            { nodeId: node.id, suggestion: 'Set the iterator variable name' }
          ));
        }
        break;
      }
      case 'parallel': {
        const spec = (node.spec ?? {}) as ParallelSpec;
        const branches = spec.branches ?? [];
        if (branches.length < 2) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Parallel "${node.label}" must have at least 2 branches`,
            { nodeId: node.id, suggestion: 'Add at least 2 branches to the parallel node' }
          ));
        }
        if (spec.join === 'n_of' && (!spec.join_count || spec.join_count < 1)) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Parallel "${node.label}" uses n_of join but join_count is not set`,
            { nodeId: node.id, suggestion: 'Set join_count to specify how many branches must complete' }
          ));
        }
        break;
      }
      case 'sub_flow': {
        const spec = (node.spec ?? {}) as SubFlowSpec;
        if (!spec.flow_ref || spec.flow_ref.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Sub-flow "${node.label}" must have a flow reference defined`,
            { nodeId: node.id, suggestion: 'Set the flow_ref (e.g., domain/flow-id)' }
          ));
        } else if (!spec.flow_ref.includes('/')) {
          issues.push(issue('flow', 'warning', 'spec_completeness',
            `Sub-flow "${node.label}" flow_ref should be in domain/flow-id format`,
            { nodeId: node.id, suggestion: 'Use the format domain/flow-id for the flow reference' }
          ));
        }
        break;
      }
      case 'llm_call': {
        const spec = (node.spec ?? {}) as LlmCallSpec;
        if (!spec.model || spec.model.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `LLM call "${node.label}" must have a model specified`,
            { nodeId: node.id, suggestion: 'Set the model (e.g., claude-sonnet, gpt-4o)' }
          ));
        }
        if (!spec.prompt_template || spec.prompt_template.trim() === '') {
          issues.push(issue('flow', 'warning', 'spec_completeness',
            `LLM call "${node.label}" has no prompt template defined`,
            { nodeId: node.id, suggestion: 'Set the prompt template with {{variables}} for dynamic content' }
          ));
        }
        break;
      }
      case 'collection': {
        const spec = (node.spec ?? {}) as CollectionSpec;
        if (!spec.operation) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Collection "${node.label}" must have an operation set`,
            { nodeId: node.id, suggestion: 'Set the operation (filter, map, reduce, sort, group_by, unique, flatten)' }
          ));
        }
        if (!spec.input || spec.input.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Collection "${node.label}" must have an input defined`,
            { nodeId: node.id, suggestion: 'Set the input collection to operate on' }
          ));
        }
        break;
      }
      case 'parse': {
        const spec = (node.spec ?? {}) as ParseSpec;
        if (!spec.format) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Parse "${node.label}" must have a format set`,
            { nodeId: node.id, suggestion: 'Set the format (json, csv, xml, yaml, html, markdown, regex)' }
          ));
        }
        if (!spec.input || spec.input.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Parse "${node.label}" must have an input defined`,
            { nodeId: node.id, suggestion: 'Set the input to parse' }
          ));
        }
        break;
      }
      case 'crypto': {
        const spec = (node.spec ?? {}) as CryptoSpec;
        if (!spec.operation) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Crypto "${node.label}" must have an operation set`,
            { nodeId: node.id, suggestion: 'Set the operation (encrypt, decrypt, hash, sign, verify, hmac)' }
          ));
        }
        if (!spec.algorithm || spec.algorithm.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Crypto "${node.label}" must have an algorithm defined`,
            { nodeId: node.id, suggestion: 'Set the algorithm (e.g., aes-256-gcm, sha256)' }
          ));
        }
        if (!spec.key_source || (!spec.key_source.env && !spec.key_source.vault)) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Crypto "${node.label}" must have a key source defined`,
            { nodeId: node.id, suggestion: 'Set the key source (env variable or vault path)' }
          ));
        }
        break;
      }
      case 'batch': {
        const spec = (node.spec ?? {}) as BatchSpec;
        if (!spec.input || spec.input.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Batch "${node.label}" must have an input defined`,
            { nodeId: node.id, suggestion: 'Set the input collection to process in batch' }
          ));
        }
        if (!spec.operation_template || !spec.operation_template.type) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Batch "${node.label}" must have an operation template defined`,
            { nodeId: node.id, suggestion: 'Set the operation template with a type' }
          ));
        }
        break;
      }
      case 'transaction': {
        const spec = (node.spec ?? {}) as TransactionSpec;
        const steps = spec.steps ?? [];
        if (steps.length < 2) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Transaction "${node.label}" must have at least 2 steps`,
            { nodeId: node.id, suggestion: 'Add at least 2 steps to the transaction' }
          ));
        }
        break;
      }
      case 'cache': {
        const spec = (node.spec ?? {}) as CacheSpec;
        if (!spec.key || spec.key.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Cache "${node.label}" must have a key defined`,
            { nodeId: node.id, suggestion: 'Set the cache key template (e.g. "search:{query}")' }
          ));
        }
        if (!spec.store) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Cache "${node.label}" must have a store defined`,
            { nodeId: node.id, suggestion: 'Set the cache store (redis or memory)' }
          ));
        }
        break;
      }
      case 'transform': {
        const spec = (node.spec ?? {}) as TransformSpec;
        if (!spec.input_schema || spec.input_schema.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Transform "${node.label}" must have an input_schema defined`,
            { nodeId: node.id, suggestion: 'Set the input schema name' }
          ));
        }
        if (!spec.output_schema || spec.output_schema.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Transform "${node.label}" must have an output_schema defined`,
            { nodeId: node.id, suggestion: 'Set the output schema name' }
          ));
        }
        break;
      }
      case 'delay': {
        const spec = (node.spec ?? {}) as DelaySpec;
        if (spec.min_ms == null) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Delay "${node.label}" must have min_ms defined`,
            { nodeId: node.id, suggestion: 'Set the minimum delay in milliseconds' }
          ));
        }
        break;
      }
    }
  }

  return issues;
}

// --- Public: Flow validation ---

export function validateFlow(flow: FlowDocument): ValidationResult {
  const flowMeta = flow.flow ?? { id: 'unknown', domain: 'unknown', name: 'unknown', type: 'traditional' as const };
  const flowId = `${flowMeta.domain}/${flowMeta.id}`;

  // If trigger is missing, report it and skip graph-based checks that depend on it
  if (!flow.trigger) {
    const issues = [issue('flow', 'error', 'graph_completeness', 'Flow must have a trigger node')];
    for (const i of issues) { i.flowId = flowMeta.id; i.domainId = flowMeta.domain; }
    return buildResult('flow', flowId, issues);
  }

  const issues: ValidationIssue[] = [
    ...checkTriggerExists(flow),
    ...checkAllPathsReachTerminal(flow),
    ...checkOrphanedNodes(flow),
    ...checkCircularPaths(flow),
    ...checkDecisionBranches(flow),
    ...checkTerminalNoOutgoing(flow),
    ...checkTriggerEvent(flow),
    ...checkInputFieldTypes(flow),
    ...checkDecisionCondition(flow),
    ...checkProcessDescription(flow),
    ...checkAgentFlow(flow),
    ...checkOrchestrationNodes(flow),
    ...checkExtendedNodes(flow),
  ];

  // Tag all issues with flowId
  for (const i of issues) {
    i.flowId = flowMeta.id;
    i.domainId = flowMeta.domain;
  }

  return buildResult('flow', flowId, issues);
}

// --- Public: Domain validation ---

export function validateDomain(
  domainId: string,
  domainConfig: DomainConfig,
  _allDomainConfigs: Record<string, DomainConfig>
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check for duplicate flow IDs
  const flowIds = domainConfig.flows.map((f) => f.id);
  const seen = new Set<string>();
  for (const fid of flowIds) {
    if (seen.has(fid)) {
      issues.push(issue('domain', 'error', 'domain_consistency',
        `Duplicate flow ID "${fid}" in domain "${domainConfig.name}"`,
        { domainId }
      ));
    }
    seen.add(fid);
  }

  // Check internal event consumers matched
  const published = new Set(domainConfig.publishes_events.map((e) => e.event));
  const consumed = new Set(domainConfig.consumes_events.map((e) => e.event));

  for (const event of consumed) {
    if (!published.has(event)) {
      // This is internal check — consumed within domain but not published within domain
      // Only warn if this looks like an internal event (not cross-domain)
      // Skip this for now as cross-domain events are checked at system level
    }
  }

  // Tag all issues
  for (const i of issues) {
    i.domainId = domainId;
  }

  return buildResult('domain', domainId, issues);
}

// --- Public: System validation ---

export function validateSystem(domainConfigs: Record<string, DomainConfig>): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Collect all published and consumed events across domains
  const allPublished = new Map<string, string[]>(); // event -> domainIds
  const allConsumed = new Map<string, string[]>(); // event -> domainIds

  for (const [domainId, config] of Object.entries(domainConfigs)) {
    for (const e of config.publishes_events) {
      const list = allPublished.get(e.event) ?? [];
      list.push(domainId);
      allPublished.set(e.event, list);
    }
    for (const e of config.consumes_events) {
      const list = allConsumed.get(e.event) ?? [];
      list.push(domainId);
      allConsumed.set(e.event, list);
    }
  }

  // Consumed events should have publishers
  for (const [event, consumers] of allConsumed) {
    if (!allPublished.has(event)) {
      issues.push(issue('system', 'error', 'event_wiring',
        `Event "${event}" is consumed by ${consumers.join(', ')} but no domain publishes it`,
        { suggestion: 'Add this event to the publishing domain or remove the consumer' }
      ));
    }
  }

  // Published events should have consumers
  for (const [event, publishers] of allPublished) {
    if (!allConsumed.has(event)) {
      issues.push(issue('system', 'warning', 'event_wiring',
        `Event "${event}" is published by ${publishers.join(', ')} but no domain consumes it`,
        { suggestion: 'This event may be unused — consider adding a consumer or removing it' }
      ));
    }
  }

  // Event naming consistency
  const allEventNames = [...allPublished.keys(), ...allConsumed.keys()];
  if (allEventNames.length > 1) {
    const dotNotation = allEventNames.filter((n) => n.includes('.'));
    const camelCase = allEventNames.filter((n) => /[a-z][A-Z]/.test(n) && !n.includes('.'));
    if (dotNotation.length > 0 && camelCase.length > 0) {
      issues.push(issue('system', 'warning', 'event_wiring',
        `Inconsistent event naming: ${dotNotation.length} use dot notation, ${camelCase.length} use camelCase`,
        { suggestion: 'Standardize event naming across domains (prefer dot notation: domain.event.action)' }
      ));
    }
  }

  return buildResult('system', 'system', issues);
}
