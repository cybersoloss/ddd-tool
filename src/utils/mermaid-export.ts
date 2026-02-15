export interface MermaidInput {
  domains: Array<{
    id: string;
    flows: Array<{
      flowId: string;
      flowName: string;
      triggerEvent?: string;
      inputs: Array<{ name: string }>;
      processes: Array<{ action?: string; service?: string }>;
      terminals: Array<{ outcome?: string }>;
    }>;
  }>;
}

export interface MermaidFile {
  relativePath: string;
  content: string;
  language: string;
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function escapeLabel(label: string): string {
  return label.replace(/"/g, '#quot;');
}

export function generateMermaid(input: MermaidInput): MermaidFile[] {
  const files: MermaidFile[] = [];

  for (const domain of input.domains) {
    for (const flow of domain.flows) {
      const lines: string[] = ['flowchart TD'];

      const triggerId = sanitizeId(`${flow.flowId}_trigger`);
      const triggerLabel = escapeLabel(flow.triggerEvent || 'Trigger');
      lines.push(`  ${triggerId}(("${triggerLabel}"))`);

      if (flow.inputs.length > 0) {
        const inputId = sanitizeId(`${flow.flowId}_input`);
        const inputFields = flow.inputs.map((f) => f.name).join(', ');
        lines.push(`  ${inputId}["Input: ${escapeLabel(inputFields)}"]`);
        lines.push(`  ${triggerId} --> ${inputId}`);

        let prevId = inputId;
        for (let i = 0; i < flow.processes.length; i++) {
          const proc = flow.processes[i];
          const procId = sanitizeId(`${flow.flowId}_process_${i}`);
          const procLabel = escapeLabel(proc.action || proc.service || `Process ${i + 1}`);
          lines.push(`  ${procId}["${procLabel}"]`);
          lines.push(`  ${prevId} --> ${procId}`);
          prevId = procId;
        }

        for (let i = 0; i < flow.terminals.length; i++) {
          const term = flow.terminals[i];
          const termId = sanitizeId(`${flow.flowId}_terminal_${i}`);
          const termLabel = escapeLabel(term.outcome || `End ${i + 1}`);
          lines.push(`  ${termId}[/"${termLabel}"/]`);
          lines.push(`  ${prevId} --> ${termId}`);
        }
      }

      const mermaidContent = lines.join('\n');
      files.push({
        relativePath: `generated/mermaid/${domain.id}/${flow.flowId}.md`,
        content: `# ${flow.flowName}\n\n\`\`\`mermaid\n${mermaidContent}\n\`\`\`\n`,
        language: 'markdown',
      });
    }
  }

  return files;
}
