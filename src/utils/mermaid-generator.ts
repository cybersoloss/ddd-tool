import type { FlowDocument, DddFlowNode, DddNodeType } from '../types/flow';

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function escapeLabel(label: string): string {
  return label.replace(/"/g, '#quot;');
}

/** Map DDD node type to Mermaid shape syntax */
function nodeDeclaration(node: { id: string; type: DddNodeType; label: string; spec?: { outcome?: string } }): string {
  const sid = sanitizeId(node.id);
  const lbl = escapeLabel(node.label || node.type);

  switch (node.type) {
    case 'trigger':
      return `  ${sid}(["⚡ ${lbl}"])`;
    case 'input':
      return `  ${sid}[/"📋 ${lbl}"/]`;
    case 'decision':
      return `  ${sid}{"${lbl}"}`;
    case 'data_store':
      return `  ${sid}[("${lbl}")]`;
    case 'event':
      return `  ${sid}(("${lbl}"))`;
    case 'terminal': {
      const outcome = (node.spec?.outcome ?? '').toLowerCase();
      const icon = outcome === 'error' ? '✗' : '✓';
      return `  ${sid}(["${icon} ${lbl}"])`;
    }
    case 'loop':
      return `  ${sid}[/"🔁 ${lbl}"/]`;
    case 'parallel':
      return `  ${sid}["⫴ ${lbl}"]`;
    case 'service_call':
      return `  ${sid}["↗ ${lbl}"]`;
    case 'ipc_call':
      return `  ${sid}["⚙ ${lbl}"]`;
    case 'llm_call':
      return `  ${sid}["🤖 ${lbl}"]`;
    case 'agent_loop':
      return `  ${sid}[/"🔄 ${lbl}"/]`;
    case 'sub_flow':
      return `  ${sid}[["${lbl}"]]`;
    case 'cache':
      return `  ${sid}["💾 ${lbl}"]`;
    case 'crypto':
      return `  ${sid}["🔐 ${lbl}"]`;
    case 'transaction':
      return `  ${sid}["⚛ ${lbl}"]`;
    default:
      return `  ${sid}["${lbl}"]`;
  }
}

/** Map sourceHandle to a human-readable edge label */
function edgeLabel(sourceHandle?: string): string {
  if (!sourceHandle) return '';
  const map: Record<string, string> = {
    true: 'Yes',
    false: 'No',
    valid: 'Valid',
    invalid: 'Invalid',
    success: 'OK',
    error: 'Error',
    hit: 'Hit',
    miss: 'Miss',
    done: 'Done',
    body: 'Body',
    pass: 'Pass',
    block: 'Block',
    committed: 'Committed',
    rolled_back: 'Rolled back',
    result: 'Result',
    empty: 'Empty',
  };
  return map[sourceHandle] ?? sourceHandle;
}

/**
 * Generate a Mermaid flowchart TD string from a FlowDocument.
 * Iterates all nodes (trigger + nodes array) and their connections,
 * producing node declarations with type-annotated shapes and labeled edges.
 */
export function generateMermaidFromFlow(flow: FlowDocument): string {
  const lines: string[] = ['flowchart TD'];
  const allNodes: (DddFlowNode & { spec?: Record<string, unknown> })[] = [];

  if (flow.trigger) {
    allNodes.push(flow.trigger as DddFlowNode & { spec?: Record<string, unknown> });
  }
  for (const node of flow.nodes ?? []) {
    allNodes.push(node as DddFlowNode & { spec?: Record<string, unknown> });
  }

  // Node declarations
  for (const node of allNodes) {
    lines.push(
      nodeDeclaration({
        id: node.id,
        type: node.type,
        label: node.label,
        spec: node.spec as { outcome?: string } | undefined,
      })
    );
  }

  // Edges
  for (const node of allNodes) {
    for (const conn of node.connections ?? []) {
      const src = sanitizeId(node.id);
      const tgt = sanitizeId(conn.targetNodeId);
      const lbl = edgeLabel(conn.sourceHandle);
      if (lbl) {
        lines.push(`  ${src} -->|${lbl}| ${tgt}`);
      } else {
        lines.push(`  ${src} --> ${tgt}`);
      }
    }
  }

  return lines.join('\n');
}
