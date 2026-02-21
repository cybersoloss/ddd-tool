import { nanoid } from 'nanoid';
import type {
  FlowDocument,
  DddFlowNode,
  AgentLoopSpec,
  OrchestratorSpec,
  SmartRouterSpec,
  HandoffSpec,
  AgentGroupSpec,
  HumanGateSpec,
  TriggerSpec,
  InputSpec,
  DecisionSpec,
  ProcessSpec,
  DataStoreSpec,
  ServiceCallSpec,
  IpcCallSpec,
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
import type { SchemaSpec, PagesConfig, UIPageSpec, InfrastructureSpec } from '../types/specs';

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

function nodeTypeLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
  const allNodes = getAllNodes(flow);
  // Nodes that legitimately receive back-edges (loop body, parallel branches)
  const loopLikeIds = new Set(
    allNodes.filter((n) => n.type === 'loop' || n.type === 'parallel').map((n) => n.id)
  );
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    inStack.add(nodeId);

    for (const neighbor of adj.get(nodeId) ?? []) {
      // Skip back-edges to loop/parallel nodes — these are legitimate cycles
      if (loopLikeIds.has(neighbor) && inStack.has(neighbor)) continue;
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

    const handles = new Set((node.connections ?? []).map((c) => c.sourceHandle));
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
    if ((node.connections ?? []).length > 0) {
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
    const fields = Array.isArray(spec.fields) ? spec.fields : [];
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

  // agent_group and orchestrator are valid top-level coordination nodes for agent flows;
  // agent_loop is only required when neither of those is present.
  const hasAgentGroup = allNodes.some((n) => n.type === 'agent_group');
  const hasOrchestrator = allNodes.some((n) => n.type === 'orchestrator');
  if (agentLoops.length === 0 && !hasAgentGroup && !hasOrchestrator) {
    issues.push(issue('flow', 'error', 'agent_validation',
      'Agent flow must have an agent_loop, agent_group, or orchestrator node',
      { suggestion: 'Add an agent_loop, agent_group, or orchestrator node from the toolbar' }
    ));
    return issues;
  }
  // If coordinated by agent_group or orchestrator without agent_loop, skip agent_loop-specific checks
  if (agentLoops.length === 0) return issues;

  if (agentLoops.length > 1) {
    issues.push(issue('flow', 'warning', 'agent_validation',
      `Agent flow has ${agentLoops.length} agent_loop nodes — typically only one is expected`
    ));
  }

  for (const agentLoop of agentLoops) {
    const spec = (agentLoop.spec ?? {}) as AgentLoopSpec;
    const tools = Array.isArray(spec.tools) ? spec.tools : [];

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
      issues.push(issue('flow', 'error', 'agent_validation',
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
        const agents = Array.isArray(spec.agents) ? spec.agents : [];
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
        const rules = Array.isArray(spec.rules) ? spec.rules : [];
        if (rules.length === 0 && !spec.llm_routing?.enabled) {
          issues.push(issue('flow', 'error', 'orchestration_validation',
            `Smart router "${node.label}" has no rules defined`,
            { nodeId: node.id, suggestion: 'Add routing rules or enable LLM routing' }
          ));
        }
        // Warn if no fallback chain and no LLM routing — routing may fail silently
        const fallbackChain = Array.isArray(spec.fallback_chain) ? spec.fallback_chain : [];
        if (fallbackChain.length === 0 && !spec.llm_routing?.enabled) {
          issues.push(issue('flow', 'warning', 'orchestration_validation',
            `Smart router "${node.label}" has no fallback chain and no LLM routing — unmatched requests may fail silently`,
            { nodeId: node.id, suggestion: 'Add a fallback_chain or enable LLM routing for resilience' }
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
        const members = Array.isArray(spec.members) ? spec.members : [];
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
        const storeType = spec.store_type ?? 'database';
        const memoryOps = new Set(['get', 'set', 'merge', 'reset', 'subscribe', 'update_where']);
        if (!spec.operation) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Data store "${node.label}" must have an operation set`,
            { nodeId: node.id, suggestion: 'Set the operation (create, read, update, or delete)' }
          ));
        }
        // Warn if memory-only operations are used with non-memory store_type
        if (spec.operation && memoryOps.has(spec.operation) && storeType !== 'memory') {
          issues.push(issue('flow', 'warning', 'spec_completeness',
            `Data store "${node.label}" uses memory operation "${spec.operation}" but store_type is "${storeType}"`,
            { nodeId: node.id, suggestion: 'Set store_type to "memory" or use CRUD operations for database/filesystem' }
          ));
        }
        if (storeType === 'database') {
          if (!spec.model || spec.model.trim() === '') {
            issues.push(issue('flow', 'error', 'spec_completeness',
              `Data store "${node.label}" must have a model defined`,
              { nodeId: node.id, suggestion: 'Set the model name (e.g., User, Order)' }
            ));
          }
        } else if (storeType === 'filesystem') {
          if (!spec.path || spec.path.trim() === '') {
            issues.push(issue('flow', 'error', 'spec_completeness',
              `Filesystem data store "${node.label}" must have a path defined`,
              { nodeId: node.id, suggestion: 'Set the file path (e.g., $.project_path/specs/system.yaml)' }
            ));
          }
        } else if (storeType === 'memory') {
          if (!spec.store || spec.store.trim() === '') {
            issues.push(issue('flow', 'error', 'spec_completeness',
              `Memory data store "${node.label}" must have a store name`,
              { nodeId: node.id, suggestion: 'Set the store name (e.g., project-store)' }
            ));
          }
          if (spec.operation !== 'reset' && (!spec.selector || spec.selector.trim() === '')) {
            issues.push(issue('flow', 'error', 'spec_completeness',
              `Memory data store "${node.label}" must have a selector`,
              { nodeId: node.id, suggestion: 'Set the state selector (e.g., domains, currentFlow.nodes)' }
            ));
          }
          // update_where requires predicate + patch
          if (spec.operation === 'update_where') {
            if (!spec.predicate || spec.predicate.trim() === '') {
              issues.push(issue('flow', 'error', 'spec_completeness',
                `Memory data store "${node.label}" with update_where must have a predicate`,
                { nodeId: node.id, suggestion: 'Set the predicate (e.g., $.id === targetId)' }
              ));
            }
            if (!spec.patch || Object.keys(spec.patch).length === 0) {
              issues.push(issue('flow', 'error', 'spec_completeness',
                `Memory data store "${node.label}" with update_where must have a patch`,
                { nodeId: node.id, suggestion: 'Set the patch object (e.g., { dismissed: true })' }
              ));
            }
          }
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
        // URL is required unless an integration reference is provided
        const hasIntegration = !!spec.integration;
        if (!hasIntegration && (!spec.url || spec.url.trim() === '')) {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `Service call "${node.label}" must have a URL or integration defined`,
            { nodeId: node.id, suggestion: 'Set the service URL or reference an integration' }
          ));
        }
        break;
      }
      case 'ipc_call': {
        const spec = (node.spec ?? {}) as IpcCallSpec;
        if (!spec.command || spec.command.trim() === '') {
          issues.push(issue('flow', 'error', 'spec_completeness',
            `IPC call "${node.label}" must have a command name`,
            { nodeId: node.id, suggestion: 'Set the command name (e.g., git_status, compute_file_hash)' }
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
        const branches = Array.isArray(spec.branches) ? spec.branches : [];
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
        // Validate input_mapping/output_mapping keys against target flow's contract
        const inputMapping = (spec as Record<string, unknown>).input_mapping as Record<string, unknown> | undefined;
        const outputMapping = (spec as Record<string, unknown>).output_mapping as Record<string, unknown> | undefined;
        const contract = (spec as Record<string, unknown>).contract as { inputs?: Array<{ name: string }>; outputs?: Array<{ name: string }> } | undefined;
        if (contract && inputMapping) {
          const contractInputNames = new Set((contract.inputs ?? []).map((i) => i.name));
          for (const key of Object.keys(inputMapping)) {
            if (contractInputNames.size > 0 && !contractInputNames.has(key)) {
              issues.push(issue('flow', 'warning', 'reference_integrity',
                `Sub-flow "${node.label}" input_mapping key "${key}" is not in the target flow's contract inputs`,
                { nodeId: node.id, suggestion: `Expected contract inputs: ${[...contractInputNames].join(', ')}` }
              ));
            }
          }
        }
        if (contract && outputMapping) {
          const contractOutputNames = new Set((contract.outputs ?? []).map((o) => o.name));
          for (const key of Object.keys(outputMapping)) {
            if (contractOutputNames.size > 0 && !contractOutputNames.has(key)) {
              issues.push(issue('flow', 'warning', 'reference_integrity',
                `Sub-flow "${node.label}" output_mapping key "${key}" is not in the target flow's contract outputs`,
                { nodeId: node.id, suggestion: `Expected contract outputs: ${[...contractOutputNames].join(', ')}` }
              ));
            }
          }
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
            { nodeId: node.id, suggestion: 'Set the operation (filter, sort, deduplicate, merge, group_by, aggregate, reduce, flatten)' }
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
        if (typeof spec.strategy === 'object' && spec.strategy !== null && 'selectors' in spec.strategy) {
          const sels = Array.isArray(spec.strategy.selectors) ? spec.strategy.selectors : [];
          if (sels.length === 0) {
            issues.push(issue('flow', 'warning', 'spec_completeness',
              `Parse "${node.label}" has selector strategy but no selectors defined`,
              { nodeId: node.id, suggestion: 'Add at least one CSS selector' }
            ));
          } else if (sels.some((s: { name?: string; css?: string }) => !s.name || !s.css)) {
            issues.push(issue('flow', 'warning', 'spec_completeness',
              `Parse "${node.label}" has selectors with missing name or CSS selector`,
              { nodeId: node.id, suggestion: 'Fill in name and CSS selector for all entries' }
            ));
          }
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
        // key_source is only required for operations that use a stored key.
        // hash, generate_key, and verify (bcrypt) do not need an external key.
        const keySourceRequired = spec.operation && ['encrypt', 'decrypt', 'sign'].includes(spec.operation);
        if (keySourceRequired && (!spec.key_source || (!spec.key_source.env && !spec.key_source.vault))) {
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
        const steps = Array.isArray(spec.steps) ? spec.steps : [];
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

// --- Reference integrity checks ---

function checkInputBranches(flow: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allNodes = getAllNodes(flow);

  for (const node of allNodes) {
    if (node.type !== 'input') continue;
    const spec = (node.spec ?? {}) as InputSpec;
    const validation = spec.validation;
    if (!validation) continue;

    // Input with validation should have valid/invalid branch connections
    const handles = new Set((node.connections ?? []).map((c) => c.sourceHandle));
    if (!handles.has('valid') && !handles.has('invalid')) {
      issues.push(issue('flow', 'error', 'graph_completeness',
        `Input "${node.label}" has validation but no valid/invalid branch connections`,
        { nodeId: node.id, suggestion: 'Connect the "valid" and "invalid" handles to downstream nodes' }
      ));
    }
  }

  return issues;
}

function checkHttpTriggerFields(flow: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!flow.trigger) return issues;

  const spec = (flow.trigger.spec ?? {}) as TriggerSpec;
  const event = typeof spec.event === 'string' ? spec.event : '';
  const isHttp = event === 'http_request' || event === 'HTTP' || event === 'api' ||
    spec.source === 'http' || spec.source === 'api';

  if (isHttp) {
    if (!spec.method || (typeof spec.method === 'string' && spec.method.trim() === '')) {
      issues.push(issue('flow', 'error', 'reference_integrity',
        'HTTP trigger must have a method defined (GET, POST, PUT, PATCH, DELETE)',
        { nodeId: flow.trigger.id, suggestion: 'Set the HTTP method in the trigger spec' }
      ));
    }
    if (!spec.path || (typeof spec.path === 'string' && spec.path.trim() === '')) {
      issues.push(issue('flow', 'error', 'reference_integrity',
        'HTTP trigger must have a path defined',
        { nodeId: flow.trigger.id, suggestion: 'Set the path (e.g., /api/users) in the trigger spec' }
      ));
    }
  }

  return issues;
}

function checkSubFlowReferenceExists(flow: FlowDocument, domainConfigs?: Record<string, DomainConfig>): ValidationIssue[] {
  if (!domainConfigs) return [];
  const issues: ValidationIssue[] = [];
  const allNodes = getAllNodes(flow);

  for (const node of allNodes) {
    if (node.type !== 'sub_flow') continue;
    const spec = (node.spec ?? {}) as SubFlowSpec;
    if (!spec.flow_ref || !spec.flow_ref.includes('/')) continue;

    const [refDomain, refFlow] = spec.flow_ref.split('/');
    const domain = domainConfigs[refDomain];
    if (!domain) {
      issues.push(issue('flow', 'error', 'reference_integrity',
        `Sub-flow "${node.label}" references domain "${refDomain}" which does not exist`,
        { nodeId: node.id, suggestion: 'Check the flow_ref domain name' }
      ));
    } else if (!domain.flows.some((f) => f.id === refFlow)) {
      issues.push(issue('flow', 'error', 'reference_integrity',
        `Sub-flow "${node.label}" references flow "${refFlow}" which does not exist in domain "${refDomain}"`,
        { nodeId: node.id, suggestion: 'Check the flow_ref flow ID' }
      ));
    }
  }

  return issues;
}

// --- Branching completeness checks ---

function checkBranchingCompleteness(flow: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allNodes = getAllNodes(flow);

  for (const node of allNodes) {
    const handles = new Set((node.connections ?? []).map((c) => c.sourceHandle));
    const label = node.label;
    const typeLabel = nodeTypeLabel(node.type);

    switch (node.type) {
      // Static dual-handle: success / error
      case 'data_store':
      case 'service_call':
      case 'ipc_call':
      case 'llm_call':
      case 'parse':
      case 'crypto': {
        if (!handles.has('success')) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `${typeLabel} "${label}" is missing a "success" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "success" handle to a downstream node' }
          ));
        }
        if (!handles.has('error')) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `${typeLabel} "${label}" is missing an "error" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "error" handle to a downstream node' }
          ));
        }
        break;
      }
      // Static dual-handle: done / error
      case 'batch':
      case 'agent_loop': {
        if (!handles.has('done')) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `${typeLabel} "${label}" is missing a "done" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "done" handle to a downstream node' }
          ));
        }
        if (!handles.has('error')) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `${typeLabel} "${label}" is missing an "error" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "error" handle to a downstream node' }
          ));
        }
        break;
      }
      // Static dual-handle: committed / rolled_back
      case 'transaction': {
        if (!handles.has('committed')) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `${typeLabel} "${label}" is missing a "committed" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "committed" handle to a downstream node' }
          ));
        }
        if (!handles.has('rolled_back')) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `${typeLabel} "${label}" is missing a "rolled_back" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "rolled_back" handle to a downstream node' }
          ));
        }
        break;
      }
      // Static dual-handle: body / done
      case 'loop': {
        if (!handles.has('body')) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `${typeLabel} "${label}" is missing a "body" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "body" handle to a downstream node' }
          ));
        }
        if (!handles.has('done')) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `${typeLabel} "${label}" is missing a "done" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "done" handle to a downstream node' }
          ));
        }
        break;
      }
      // Static dual-handle: hit / miss
      case 'cache': {
        if (!handles.has('hit')) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `${typeLabel} "${label}" is missing a "hit" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "hit" handle to a downstream node' }
          ));
        }
        if (!handles.has('miss')) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `${typeLabel} "${label}" is missing a "miss" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "miss" handle to a downstream node' }
          ));
        }
        break;
      }
      // Static dual-handle: result / empty
      case 'collection': {
        if (!handles.has('result')) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `${typeLabel} "${label}" is missing a "result" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "result" handle to a downstream node' }
          ));
        }
        if (!handles.has('empty')) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `${typeLabel} "${label}" is missing an "empty" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "empty" handle to a downstream node' }
          ));
        }
        break;
      }
      // Static dual-handle: pass|valid / block|invalid
      case 'guardrail': {
        const hasPass = handles.has('pass') || handles.has('valid');
        const hasBlock = handles.has('block') || handles.has('invalid');
        if (!hasPass) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `${typeLabel} "${label}" is missing a "pass" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "pass" (or "valid") handle to a downstream node' }
          ));
        }
        if (!hasBlock) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `${typeLabel} "${label}" is missing a "block" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "block" (or "invalid") handle to a downstream node' }
          ));
        }
        break;
      }
      // Dynamic: parallel branches + done
      case 'parallel': {
        const spec = (node.spec ?? {}) as ParallelSpec;
        const branches = Array.isArray(spec.branches) ? spec.branches : [];
        for (let idx = 0; idx < branches.length; idx++) {
          const handleId = `branch-${idx}`;
          if (!handles.has(handleId)) {
            const branchItem = branches[idx];
            const branchLabel = typeof branchItem === 'string' ? branchItem : branchItem.label;
            issues.push(issue('flow', 'error', 'graph_completeness',
              `Parallel "${label}" is missing a connection for branch "${branchLabel || idx}"`,
              { nodeId: node.id, suggestion: `Connect the "${handleId}" handle to a downstream node` }
            ));
          }
        }
        if (!handles.has('done')) {
          issues.push(issue('flow', 'error', 'graph_completeness',
            `Parallel "${label}" is missing a "done" branch connection`,
            { nodeId: node.id, suggestion: 'Connect the "done" handle to a downstream node' }
          ));
        }
        break;
      }
      // Dynamic: smart_router routes
      case 'smart_router': {
        const spec = (node.spec ?? {}) as SmartRouterSpec;
        const rules = Array.isArray(spec.rules) ? spec.rules : [];
        for (const rule of rules) {
          if (rule.route && !handles.has(rule.route)) {
            issues.push(issue('flow', 'warning', 'graph_completeness',
              `Smart Router "${label}" is missing a connection for route "${rule.route}"`,
              { nodeId: node.id, suggestion: `Connect the "${rule.route}" handle to a downstream node` }
            ));
          }
        }
        const llmRoutes = spec.llm_routing?.routes ?? {};
        for (const routeKey of Object.keys(llmRoutes)) {
          if (!handles.has(routeKey)) {
            issues.push(issue('flow', 'warning', 'graph_completeness',
              `Smart Router "${label}" is missing a connection for LLM route "${routeKey}"`,
              { nodeId: node.id, suggestion: `Connect the "${routeKey}" handle to a downstream node` }
            ));
          }
        }
        break;
      }
      // Dynamic: human_gate approval options
      case 'human_gate': {
        const spec = (node.spec ?? {}) as HumanGateSpec;
        const options = Array.isArray(spec.approval_options) ? spec.approval_options : [];
        for (const opt of options) {
          if (opt.id && !handles.has(opt.id)) {
            issues.push(issue('flow', 'warning', 'graph_completeness',
              `Human Gate "${label}" is missing a connection for approval option "${opt.id}"`,
              { nodeId: node.id, suggestion: `Connect the "${opt.id}" handle to a downstream node` }
            ));
          }
        }
        break;
      }
    }
  }

  return issues;
}

// --- Public: Flow validation ---

export function validateFlow(flow: FlowDocument, domainConfigs?: Record<string, DomainConfig>): ValidationResult {
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
    ...checkInputBranches(flow),
    ...checkBranchingCompleteness(flow),
    ...checkHttpTriggerFields(flow),
    ...checkSubFlowReferenceExists(flow, domainConfigs),
  ];

  // Tag all issues with flowId
  for (const i of issues) {
    i.flowId = flowMeta.id;
    i.domainId = flowMeta.domain;
  }

  return buildResult('flow', flowId, issues);
}

// --- Domain-scope reference integrity checks ---

function checkDuplicateHttpPaths(
  domainId: string,
  flowDocs: FlowDocument[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, string>(); // "METHOD /path" → flowId

  for (const flow of flowDocs) {
    if (!flow.trigger) continue;
    const spec = (flow.trigger.spec ?? {}) as TriggerSpec;
    const event = typeof spec.event === 'string' ? spec.event : '';
    const isHttp = event === 'http_request' || event === 'HTTP' || event === 'api' ||
      spec.source === 'http' || spec.source === 'api';
    if (!isHttp || !spec.method || !spec.path) continue;

    const key = `${String(spec.method).toUpperCase()} ${spec.path}`;
    const existing = seen.get(key);
    if (existing) {
      issues.push(issue('domain', 'error', 'reference_integrity',
        `Duplicate HTTP endpoint "${key}" in flows "${existing}" and "${flow.flow?.id ?? 'unknown'}"`,
        { domainId }
      ));
    } else {
      seen.set(key, flow.flow?.id ?? 'unknown');
    }
  }

  return issues;
}

function checkSchemaReferences(
  domainId: string,
  flowDocs: FlowDocument[],
  allDomainConfigs: Record<string, DomainConfig>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Collect all schemas owned across all domains
  const allSchemas = new Set<string>();
  for (const config of Object.values(allDomainConfigs)) {
    const schemas = Array.isArray(config.owns_schemas) ? config.owns_schemas : [];
    for (const s of schemas) allSchemas.add(s);
  }

  if (allSchemas.size === 0) return issues;

  for (const flow of flowDocs) {
    const allNodes = getAllNodes(flow);
    for (const node of allNodes) {
      if (node.type !== 'data_store') continue;
      const spec = (node.spec ?? {}) as DataStoreSpec;
      if ((spec.store_type ?? 'database') !== 'database') continue;
      if (!spec.model || spec.model.trim() === '') continue;
      if (!allSchemas.has(spec.model)) {
        issues.push(issue('domain', 'warning', 'reference_integrity',
          `Data store "${node.label}" references model "${spec.model}" which is not in any domain's owns_schemas`,
          { domainId, nodeId: node.id, flowId: flow.flow?.id }
        ));
      }
    }
  }

  return issues;
}

function checkStoreReferences(
  domainId: string,
  flowDocs: FlowDocument[],
  allDomainConfigs: Record<string, DomainConfig>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Collect all declared store names across all domains
  const allStores = new Set<string>();
  for (const config of Object.values(allDomainConfigs)) {
    const stores = Array.isArray(config.stores) ? config.stores : [];
    for (const s of stores) {
      if (s.name) allStores.add(s.name);
    }
  }

  if (allStores.size === 0) return issues;

  for (const flow of flowDocs) {
    const allNodes = getAllNodes(flow);
    for (const node of allNodes) {
      if (node.type !== 'data_store') continue;
      const spec = (node.spec ?? {}) as DataStoreSpec;
      if ((spec.store_type ?? 'database') !== 'memory') continue;
      if (!spec.store || spec.store.trim() === '') continue;
      if (!allStores.has(spec.store)) {
        issues.push(issue('domain', 'warning', 'reference_integrity',
          `Memory data store "${node.label}" references store "${spec.store}" which is not declared in any domain's stores`,
          { domainId, nodeId: node.id, flowId: flow.flow?.id }
        ));
      }
    }
  }

  return issues;
}

// --- Public: Domain validation ---

export function validateDomain(
  domainId: string,
  domainConfig: DomainConfig,
  _allDomainConfigs: Record<string, DomainConfig>,
  flowDocs?: FlowDocument[]
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

  // Check for duplicate event group names
  const eventGroups = domainConfig.event_groups ?? [];
  const seenGroupNames = new Set<string>();
  for (const group of eventGroups) {
    if (seenGroupNames.has(group.name)) {
      issues.push(issue('domain', 'error', 'domain_consistency',
        `Duplicate event group name "${group.name}" in domain "${domainConfig.name}"`,
        { domainId }
      ));
    }
    seenGroupNames.add(group.name);
  }

  // Check that trigger event_group:{name} references exist in domain event_groups
  if (flowDocs) {
    const groupNames = new Set(eventGroups.map((g) => g.name));
    for (const flowDoc of flowDocs) {
      const trigger = flowDoc.trigger;
      if (!trigger?.spec) continue;
      const event = (trigger.spec as TriggerSpec).event;
      const events = Array.isArray(event) ? event : event ? [event] : [];
      for (const ev of events) {
        if (typeof ev === 'string' && ev.startsWith('event_group:')) {
          const groupRef = ev.slice('event_group:'.length);
          if (!groupNames.has(groupRef)) {
            issues.push(issue('domain', 'error', 'reference_integrity',
              `Trigger in flow "${flowDoc.flow?.id}" references event_group "${groupRef}" which is not defined in domain "${domainConfig.name}"`,
              { domainId, flowId: flowDoc.flow?.id, suggestion: `Add event_group "${groupRef}" to domain.yaml event_groups` }
            ));
          }
        }
      }
    }
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

  // Flow-doc-based domain checks (only if flowDocs provided)
  if (flowDocs && flowDocs.length > 0) {
    issues.push(...checkDuplicateHttpPaths(domainId, flowDocs));
    issues.push(...checkSchemaReferences(domainId, flowDocs, _allDomainConfigs));
    issues.push(...checkStoreReferences(domainId, flowDocs, _allDomainConfigs));
  }

  // Tag all issues
  for (const i of issues) {
    i.domainId = domainId;
  }

  return buildResult('domain', domainId, issues);
}

// --- System-scope reference integrity checks ---

function checkPortalTargetsExist(domainConfigs: Record<string, DomainConfig>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const domainIds = new Set(Object.keys(domainConfigs));

  for (const [domainId, config] of Object.entries(domainConfigs)) {
    // Check consumed events reference existing domains via from_flow cross-refs
    for (const con of config.consumes_events) {
      // If the consumed event has a schema like "domain.event", extract domain
      const parts = con.event.split('.');
      if (parts.length >= 2) {
        const refDomain = parts[0];
        if (!domainIds.has(refDomain) && refDomain !== domainId) {
          // Only flag if the prefix looks like a domain reference
          // This is heuristic — skip if not a known convention
        }
      }
    }

    // Check portal targets in layout
    const portalKeys = Object.keys(config.layout?.portals ?? {});
    for (const portalId of portalKeys) {
      if (!domainIds.has(portalId)) {
        issues.push(issue('system', 'error', 'reference_integrity',
          `Domain "${config.name}" has a portal to "${portalId}" which does not exist`,
          { domainId, suggestion: 'Remove the portal or create the target domain' }
        ));
      }
    }
  }

  return issues;
}

function checkSchemaOwnershipConflicts(domainConfigs: Record<string, DomainConfig>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const schemaOwners = new Map<string, string[]>(); // schema → domainIds

  for (const [domainId, config] of Object.entries(domainConfigs)) {
    const schemas = Array.isArray(config.owns_schemas) ? config.owns_schemas : [];
    for (const schema of schemas) {
      const owners = schemaOwners.get(schema) ?? [];
      owners.push(domainId);
      schemaOwners.set(schema, owners);
    }
  }

  for (const [schema, owners] of schemaOwners) {
    if (owners.length > 1) {
      issues.push(issue('system', 'warning', 'reference_integrity',
        `Schema "${schema}" is owned by multiple domains: ${owners.join(', ')}`,
        { suggestion: 'Each schema should have a single owning domain' }
      ));
    }
  }

  return issues;
}

// --- Cross-pillar validation ---

function checkDataSourceReferences(
  pagesConfig: PagesConfig | null,
  pageSpecs: Record<string, UIPageSpec>,
  domainConfigs: Record<string, DomainConfig>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!pagesConfig) return issues;

  // Collect all valid flow references (domain/flow-id)
  const validFlowRefs = new Set<string>();
  for (const [domainId, config] of Object.entries(domainConfigs)) {
    for (const flow of config.flows) {
      validFlowRefs.add(`${domainId}/${flow.id}`);
    }
  }

  // Check page section data_source references
  for (const [pageId, spec] of Object.entries(pageSpecs)) {
    for (const section of spec.sections ?? []) {
      if (section.data_source && section.data_source.includes('/')) {
        if (!validFlowRefs.has(section.data_source)) {
          issues.push(issue('system', 'warning', 'reference_integrity',
            `Page "${pageId}" section "${section.id}" references data_source "${section.data_source}" which does not exist`,
            { suggestion: 'Check the domain/flow-id reference in data_source' }
          ));
        }
      }
    }

    // Check form submit flow references
    for (const form of spec.forms ?? []) {
      if (form.submit?.flow && form.submit.flow.includes('/')) {
        if (!validFlowRefs.has(form.submit.flow)) {
          issues.push(issue('system', 'warning', 'reference_integrity',
            `Page "${pageId}" form "${form.id}" submit references flow "${form.submit.flow}" which does not exist`,
            { suggestion: 'Check the domain/flow-id reference in form submit' }
          ));
        }
      }
    }

    // Check state initial_fetch references
    for (const fetchRef of spec.state?.initial_fetch ?? []) {
      if (fetchRef.includes('/') && !validFlowRefs.has(fetchRef)) {
        issues.push(issue('system', 'warning', 'reference_integrity',
          `Page "${pageId}" initial_fetch references "${fetchRef}" which does not exist`,
          { suggestion: 'Check the domain/flow-id reference in initial_fetch' }
        ));
      }
    }
  }

  return issues;
}

function checkPageNavigationRefs(
  pagesConfig: PagesConfig | null
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!pagesConfig) return issues;

  const pageIds = new Set(pagesConfig.pages.map((p) => p.id));

  for (const item of pagesConfig.navigation?.items ?? []) {
    if (item.page && !pageIds.has(item.page)) {
      issues.push(issue('system', 'warning', 'reference_integrity',
        `Navigation item "${item.label}" references page "${item.page}" which does not exist in pages.yaml`,
        { suggestion: 'Add the page to pages.yaml or fix the navigation item reference' }
      ));
    }
  }

  return issues;
}

function checkSchemaFileReferences(
  schemas: Record<string, SchemaSpec>,
  _domainConfigs: Record<string, DomainConfig>,
  flowDocs?: FlowDocument[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const schemaNames = new Set(Object.keys(schemas));

  if (schemaNames.size === 0 || !flowDocs) return issues;

  // Check data_store nodes referencing models that don't have schema files
  for (const flow of flowDocs) {
    const allNodes = getAllNodes(flow);
    for (const node of allNodes) {
      if (node.type !== 'data_store') continue;
      const spec = (node.spec ?? {}) as DataStoreSpec;
      if ((spec.store_type ?? 'database') !== 'database') continue;
      if (!spec.model || spec.model.trim() === '') continue;

      // Check against schema file names (lowercase comparison)
      const modelLower = spec.model.toLowerCase();
      const hasSchemaFile = [...schemaNames].some((s) => s.toLowerCase() === modelLower);
      if (!hasSchemaFile) {
        issues.push(issue('system', 'info', 'reference_integrity',
          `Data store "${node.label}" references model "${spec.model}" but no schema file exists in specs/schemas/`,
          { nodeId: node.id, flowId: flow.flow?.id, domainId: flow.flow?.domain,
            suggestion: 'Create a schema file or check the model name' }
        ));
      }
    }
  }

  return issues;
}

// --- Public: System validation ---

export function validateSystem(
  domainConfigs: Record<string, DomainConfig>,
  specsContext?: {
    schemas?: Record<string, SchemaSpec>;
    pagesConfig?: PagesConfig | null;
    pageSpecs?: Record<string, UIPageSpec>;
    infrastructure?: InfrastructureSpec | null;
    flowDocs?: FlowDocument[];
  }
): ValidationResult {
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

  // Event payload schema matching — check that published and consumed events agree on payload fields
  for (const [event, publishers] of allPublished) {
    const consumers = allConsumed.get(event);
    if (!consumers) continue;
    // Collect payload fields from publishers and consumers
    const publisherPayloads = new Set<string>();
    const consumerPayloads = new Set<string>();
    for (const pubDomainId of publishers) {
      const config = domainConfigs[pubDomainId];
      for (const e of config.publishes_events) {
        if (e.event === event && e.payload) {
          for (const field of Object.keys(e.payload)) publisherPayloads.add(field);
        }
      }
    }
    for (const conDomainId of consumers) {
      const config = domainConfigs[conDomainId];
      for (const e of config.consumes_events) {
        if (e.event === event && e.payload) {
          for (const field of Object.keys(e.payload)) consumerPayloads.add(field);
        }
      }
    }
    // If both sides declare payload fields, check for mismatches
    if (publisherPayloads.size > 0 && consumerPayloads.size > 0) {
      for (const field of consumerPayloads) {
        if (!publisherPayloads.has(field)) {
          issues.push(issue('system', 'warning', 'event_wiring',
            `Event "${event}" consumer expects payload field "${field}" but no publisher provides it`,
            { suggestion: `Add "${field}" to the publisher's payload or remove it from the consumer` }
          ));
        }
      }
    }
  }

  // Reference integrity checks
  issues.push(...checkPortalTargetsExist(domainConfigs));
  issues.push(...checkSchemaOwnershipConflicts(domainConfigs));

  // Cross-pillar validation
  if (specsContext) {
    issues.push(...checkDataSourceReferences(
      specsContext.pagesConfig ?? null,
      specsContext.pageSpecs ?? {},
      domainConfigs
    ));
    issues.push(...checkPageNavigationRefs(specsContext.pagesConfig ?? null));
    issues.push(...checkSchemaFileReferences(
      specsContext.schemas ?? {},
      domainConfigs,
      specsContext.flowDocs
    ));
  }

  return buildResult('system', 'system', issues);
}
