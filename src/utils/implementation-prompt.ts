import { invoke } from '@tauri-apps/api/core';
import type { FlowDocument, AgentLoopSpec } from '../types/flow';
import type { DomainConfig } from '../types/domain';
import type { BuiltPrompt, FlowMapping } from '../types/implementation';

interface ProjectConfig {
  name: string;
  techStack?: {
    language?: string;
    languageVersion?: string;
    framework?: string;
    database?: string;
    orm?: string;
  };
}

async function readProjectConfig(projectPath: string): Promise<ProjectConfig> {
  try {
    const raw: string = await invoke('read_file', {
      path: `${projectPath}/ddd-project.json`,
    });
    return JSON.parse(raw);
  } catch {
    return { name: 'project' };
  }
}

export async function buildImplementationPrompt(
  flowDoc: FlowDocument,
  domainConfig: DomainConfig,
  projectPath: string,
  mappings: Record<string, FlowMapping>,
): Promise<BuiltPrompt> {
  const { flow, trigger, nodes } = flowDoc;
  const flowKey = `${flow.domain}/${flow.id}`;
  const existingMapping = mappings[flowKey];
  const mode = existingMapping ? 'update' : 'new';
  const projectConfig = await readProjectConfig(projectPath);

  const sections: string[] = [];

  // Header
  sections.push(`# Implement Flow: ${flow.name}`);
  sections.push(`Domain: ${domainConfig.name ?? flow.domain}`);
  sections.push(`Type: ${flow.type}`);
  sections.push(`Mode: ${mode === 'new' ? 'New implementation' : 'Update existing implementation'}`);
  sections.push('');

  // Spec files to read
  sections.push('## Spec Files');
  sections.push(`Read these specification files for context:`);
  sections.push(`- \`${projectPath}/specs/architecture.yaml\` (if exists)`);
  sections.push(`- \`${projectPath}/specs/domains/${flow.domain}/domain.yaml\``);
  sections.push(`- \`${projectPath}/specs/domains/${flow.domain}/flows/${flow.id}.yaml\``);

  sections.push('');

  // Tech stack
  if (projectConfig.techStack) {
    const ts = projectConfig.techStack;
    sections.push('## Tech Stack');
    if (ts.language) sections.push(`- Language: ${ts.language}${ts.languageVersion ? ` ${ts.languageVersion}` : ''}`);
    if (ts.framework) sections.push(`- Framework: ${ts.framework}`);
    if (ts.database) sections.push(`- Database: ${ts.database}`);
    if (ts.orm) sections.push(`- ORM: ${ts.orm}`);
    sections.push('');
  }

  // Flow description
  sections.push('## Flow Description');
  if (flow.description) {
    sections.push(flow.description);
  }
  sections.push('');

  // Trigger
  sections.push('## Trigger');
  const triggerSpec = trigger.spec as { event?: string; source?: string; description?: string };
  if (triggerSpec.event) sections.push(`- Event: ${triggerSpec.event}`);
  if (triggerSpec.source) sections.push(`- Source: ${triggerSpec.source}`);
  if (triggerSpec.description) sections.push(`- Description: ${triggerSpec.description}`);
  sections.push('');

  // Nodes
  sections.push('## Nodes');
  for (const node of nodes) {
    sections.push(`### ${node.label} (${node.type})`);
    const spec = node.spec as Record<string, unknown>;
    for (const [key, value] of Object.entries(spec)) {
      if (value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)) {
        if (typeof value === 'object') {
          sections.push(`- ${key}: ${JSON.stringify(value)}`);
        } else {
          sections.push(`- ${key}: ${value}`);
        }
      }
    }
    // Connections
    if (node.connections.length > 0) {
      const targets = node.connections.map((c) => {
        const targetNode = nodes.find((n) => n.id === c.targetNodeId) ??
          (trigger.id === c.targetNodeId ? trigger : null);
        return targetNode?.label ?? c.targetNodeId;
      });
      sections.push(`- Connects to: ${targets.join(', ')}`);
    }
    sections.push('');
  }

  // Agent-specific instructions
  if (flow.type === 'agent') {
    sections.push('## Agent Implementation Notes');
    sections.push('This is an agent flow. Implementation should include:');
    sections.push('- Agent loop with LLM integration');

    const agentNode = nodes.find((n) => n.type === 'agent_loop');
    if (agentNode) {
      const agentSpec = (agentNode.spec ?? {}) as AgentLoopSpec;
      if (agentSpec.tools && agentSpec.tools.length > 0) {
        sections.push('- Tool implementations:');
        for (const tool of agentSpec.tools) {
          sections.push(`  - \`${tool.name}\`: ${tool.description ?? 'No description'}`);
        }
      }
      if (agentSpec.memory && agentSpec.memory.length > 0) {
        sections.push('- Memory stores:');
        for (const mem of agentSpec.memory) {
          sections.push(`  - \`${mem.name}\` (${mem.type})`);
        }
      }
      if (agentSpec.max_iterations) {
        sections.push(`- Max iterations: ${agentSpec.max_iterations}`);
      }
    }

    const guardrailNodes = nodes.filter((n) => n.type === 'guardrail');
    if (guardrailNodes.length > 0) {
      sections.push('- Guardrail checks (input/output validation)');
    }

    const humanGateNodes = nodes.filter((n) => n.type === 'human_gate');
    if (humanGateNodes.length > 0) {
      sections.push('- Human-in-the-loop approval gates');
    }
    sections.push('');
  }

  // Existing implementation info for updates
  if (mode === 'update' && existingMapping) {
    sections.push('## Existing Implementation');
    sections.push(`Previously implemented at: ${existingMapping.implementedAt}`);
    sections.push(`Files:`);
    for (const file of existingMapping.files) {
      sections.push(`- \`${file}\``);
    }
    sections.push('');
    sections.push('Update the existing files to match the current spec. Do not create duplicate files.');
    sections.push('');
  }

  // Implementation instructions
  sections.push('## Instructions');
  sections.push(`1. Read the spec files listed above for full context`);
  sections.push(`2. Implement the flow following the node graph and connections`);
  sections.push(`3. Follow the project's existing code style and conventions`);
  sections.push(`4. Write tests for the implementation`);
  sections.push(`5. After implementation, update \`.ddd/mapping.yaml\` with:`);
  sections.push(`   - spec: \`specs/domains/${flow.domain}/flows/${flow.id}.yaml\``);
  sections.push(`   - files: list of created/modified source files`);
  sections.push(`   - implementedAt: current ISO timestamp`);

  const content = sections.join('\n');
  const title = `${mode === 'update' ? 'Update' : 'Implement'}: ${domainConfig.name ?? flow.domain} / ${flow.name}`;

  return {
    title,
    content,
    flowId: flow.id,
    domainId: flow.domain,
  };
}
