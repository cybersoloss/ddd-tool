import { useSheetStore } from '../stores/sheet-store';
import { useProjectStore } from '../stores/project-store';
import { useFlowStore } from '../stores/flow-store';
import { useMemoryStore } from '../stores/memory-store';
import type { LlmContext, InlineAssistAction } from '../types/llm';
import type { DddFlowNode } from '../types/flow';

export function buildContext(): LlmContext {
  const sheet = useSheetStore.getState();
  const project = useProjectStore.getState();
  const flow = useFlowStore.getState();

  const ctx: LlmContext = {
    sheetLevel: sheet.current.level,
    domainId: sheet.current.domainId,
    flowId: sheet.current.flowId,
    domains: Object.keys(project.domainConfigs),
  };

  if (sheet.current.domainId) {
    const domainConfig = project.domainConfigs[sheet.current.domainId];
    if (domainConfig) {
      ctx.currentDomain = {
        name: domainConfig.name,
        flows: domainConfig.flows.map((f) => f.name),
      };
    }
  }

  if (flow.currentFlow) {
    const allNodes: DddFlowNode[] = [flow.currentFlow.trigger, ...flow.currentFlow.nodes];
    ctx.currentFlow = {
      name: flow.currentFlow.flow?.name ?? 'unknown',
      nodeCount: allNodes.length,
      nodes: allNodes.map((n) => ({ id: n.id, type: n.type, label: n.label })),
    };

    if (flow.selectedNodeId) {
      const node = allNodes.find((n) => n.id === flow.selectedNodeId);
      if (node) {
        ctx.selectedNode = {
          id: node.id,
          type: node.type,
          label: node.label,
          spec: node.spec,
        };
      }
    }
  }

  return ctx;
}

export function buildSystemPrompt(): string {
  const ctx = buildContext();

  let prompt = `You are a DDD (Domain-Driven Design) assistant helping design software systems. You work within a visual flow editor where users create domain models, flows, and node specifications.

Your role:
- Help design and refine flow specifications
- Suggest node specs (trigger, input, process, decision, terminal, agent_loop, guardrail, human_gate, orchestrator, smart_router, handoff, agent_group)
- Explain design patterns and suggest improvements
- When suggesting specs, use YAML code blocks with the node type indicated

Current context:`;

  prompt += `\n- Sheet level: ${ctx.sheetLevel}`;

  if (ctx.domains && ctx.domains.length > 0) {
    prompt += `\n- Domains: ${ctx.domains.join(', ')}`;
  }

  if (ctx.currentDomain) {
    prompt += `\n- Current domain: ${ctx.currentDomain.name}`;
    if (ctx.currentDomain.flows.length > 0) {
      prompt += `\n- Flows in domain: ${ctx.currentDomain.flows.join(', ')}`;
    }
  }

  if (ctx.currentFlow) {
    prompt += `\n- Current flow: ${ctx.currentFlow.name} (${ctx.currentFlow.nodeCount} nodes)`;
    prompt += `\n- Nodes: ${ctx.currentFlow.nodes.map((n) => `${n.label} (${n.type})`).join(', ')}`;
  }

  if (ctx.selectedNode) {
    prompt += `\n- Selected node: ${ctx.selectedNode.label} (${ctx.selectedNode.type})`;
    prompt += `\n- Current spec:\n\`\`\`yaml\n${JSON.stringify(ctx.selectedNode.spec, null, 2)}\n\`\`\``;
  }

  // --- Memory layers ---
  const memory = useMemoryStore.getState();

  // Layer 1: Project summary
  if (memory.summary?.content) {
    prompt += `\n\nProject summary:\n${memory.summary.content}`;
  }

  // Layer 4: Flow dependencies (on L3)
  if (ctx.sheetLevel === 'flow' && ctx.domainId && ctx.flowId) {
    const deps = memory.getFlowDependencies(`${ctx.domainId}/${ctx.flowId}`);
    if (deps) {
      const parts: string[] = [];
      if (deps.dependsOn.length > 0) parts.push(`Upstream: ${deps.dependsOn.join(', ')}`);
      if (deps.dependedOnBy.length > 0) parts.push(`Downstream: ${deps.dependedOnBy.join(', ')}`);
      if (deps.eventsIn.length > 0) parts.push(`Events in: ${deps.eventsIn.join(', ')}`);
      if (deps.eventsOut.length > 0) parts.push(`Events out: ${deps.eventsOut.join(', ')}`);
      if (parts.length > 0) {
        prompt += `\n\nFlow dependencies:\n${parts.join('\n')}`;
      }
    }
  }

  // Layer 3: Relevant decisions (cap at 5)
  const relevantDecisions = memory.getRelevantDecisions(ctx.domainId, ctx.flowId);
  if (relevantDecisions.length > 0) {
    prompt += `\n\nDesign decisions:\n${relevantDecisions.map((d) => `- ${d.title}: ${d.rationale}`).join('\n')}`;
  }

  // Layer 5: Implementation status for current flow
  if (ctx.sheetLevel === 'flow' && ctx.domainId && ctx.flowId && memory.implementationStatus) {
    const fullId = `${ctx.domainId}/${ctx.flowId}`;
    const status = memory.implementationStatus.flows[fullId];
    if (status) {
      prompt += `\n\nImplementation status: ${status.status}`;
    }
  }

  prompt += `\n\nWhen suggesting a spec update, wrap it in a YAML code block like:
\`\`\`yaml
# spec:node_type
field: value
\`\`\`

Keep responses concise and actionable.`;

  return prompt;
}

export function buildInlinePrompt(action: InlineAssistAction, nodeId?: string): string {
  const ctx = buildContext();

  let node: LlmContext['selectedNode'] | undefined;
  if (nodeId && ctx.currentFlow) {
    const found = ctx.currentFlow.nodes.find((n) => n.id === nodeId);
    if (found) {
      // Get the full node spec from the flow store
      const flow = useFlowStore.getState();
      const allNodes = flow.currentFlow
        ? [flow.currentFlow.trigger, ...flow.currentFlow.nodes]
        : [];
      const fullNode = allNodes.find((n) => n.id === nodeId);
      if (fullNode) {
        node = { id: fullNode.id, type: fullNode.type, label: fullNode.label, spec: fullNode.spec };
      }
    }
  }

  switch (action) {
    case 'suggest_spec':
      return node
        ? `Suggest a complete, well-designed spec for the "${node.label}" node (type: ${node.type}). Current spec:\n\`\`\`yaml\n${JSON.stringify(node.spec, null, 2)}\n\`\`\`\n\nProvide the suggested spec in a YAML code block starting with \`# spec:${node.type}\`.`
        : 'Suggest a spec for the selected node.';

    case 'complete_spec':
      return node
        ? `The "${node.label}" node (type: ${node.type}) has an incomplete spec. Fill in the missing/empty fields with reasonable values based on the flow context.\n\nCurrent spec:\n\`\`\`yaml\n${JSON.stringify(node.spec, null, 2)}\n\`\`\`\n\nProvide the completed spec in a YAML code block starting with \`# spec:${node.type}\`.`
        : 'Complete the spec for the selected node.';

    case 'explain_node':
      return node
        ? `Explain what the "${node.label}" node (type: ${node.type}) does in this flow, and suggest improvements.\n\nCurrent spec:\n\`\`\`yaml\n${JSON.stringify(node.spec, null, 2)}\n\`\`\``
        : 'Explain the selected node.';

    case 'review_flow':
      if (!ctx.currentFlow) return 'Review the current flow design.';
      return `Review the flow "${ctx.currentFlow.name}" which has these nodes:\n${ctx.currentFlow.nodes.map((n) => `- ${n.label} (${n.type})`).join('\n')}\n\nAnalyze the flow for completeness, correctness, and suggest improvements.`;

    case 'suggest_wiring':
      if (!ctx.currentFlow) return 'Suggest how to wire the nodes in this flow.';
      return `The flow "${ctx.currentFlow.name}" has these nodes:\n${ctx.currentFlow.nodes.map((n) => `- ${n.label} (${n.type})`).join('\n')}\n\nSuggest the optimal wiring (connections) between these nodes and explain the reasoning.`;
  }
}
