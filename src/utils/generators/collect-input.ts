import { invoke } from '@tauri-apps/api/core';
import { parse } from 'yaml';
import { useProjectStore } from '../../stores/project-store';
import type {
  GeneratorInput,
  TechStackInfo,
  DomainGeneratorData,
  FlowEndpoint,
} from '../../types/generator';
import type { FlowDocument } from '../../types/flow';
import type { InputSpec, ProcessSpec, TerminalSpec, TriggerSpec } from '../../types/flow';

export async function collectGeneratorInput(): Promise<GeneratorInput> {
  const { projectPath, domainConfigs } = useProjectStore.getState();
  if (!projectPath) throw new Error('No project loaded');

  // Read ddd-project.json for name, description, techStack
  const projectJson: string = await invoke('read_file', {
    path: `${projectPath}/ddd-project.json`,
  });
  const projectConfig = JSON.parse(projectJson) as {
    name?: string;
    description?: string;
    techStack?: Partial<TechStackInfo>;
  };

  const techStack: TechStackInfo = {
    language: projectConfig.techStack?.language ?? 'typescript',
    languageVersion: projectConfig.techStack?.languageVersion ?? '20',
    framework: projectConfig.techStack?.framework ?? 'express',
    database: projectConfig.techStack?.database ?? 'postgres',
    orm: projectConfig.techStack?.orm ?? 'prisma',
    cache: projectConfig.techStack?.cache,
  };

  // Build domain data from store + flow YAMLs
  const domains: DomainGeneratorData[] = [];

  for (const [domainId, domain] of Object.entries(domainConfigs)) {
    const flows: FlowEndpoint[] = [];

    for (const flowEntry of domain.flows) {
      const flowPath = `${projectPath}/specs/domains/${domainId}/flows/${flowEntry.id}.yaml`;
      try {
        const exists: boolean = await invoke('path_exists', { path: flowPath });
        if (!exists) continue;

        const yamlContent: string = await invoke('read_file', { path: flowPath });
        const flowDoc = parse(yamlContent) as FlowDocument;

        const triggerSpec = flowDoc.trigger?.spec as TriggerSpec | undefined;
        const allNodes = [flowDoc.trigger, ...flowDoc.nodes].filter(Boolean);

        const inputs: FlowEndpoint['inputs'] = [];
        const processes: FlowEndpoint['processes'] = [];
        const terminals: FlowEndpoint['terminals'] = [];

        for (const node of allNodes) {
          if (node.type === 'input') {
            const spec = node.spec as InputSpec;
            if (spec.fields) {
              for (const field of spec.fields) {
                inputs.push({ name: field.name, type: field.type, required: field.required });
              }
            }
          } else if (node.type === 'process') {
            const spec = node.spec as ProcessSpec;
            processes.push({ action: spec.action, service: spec.service });
          } else if (node.type === 'terminal') {
            const spec = node.spec as TerminalSpec;
            terminals.push({ outcome: spec.outcome });
          }
        }

        flows.push({
          flowId: flowEntry.id,
          flowName: flowEntry.name,
          domainId,
          domainName: domain.name,
          type: flowDoc.flow.type ?? 'traditional',
          triggerEvent: Array.isArray(triggerSpec?.event) ? triggerSpec.event.join(', ') : triggerSpec?.event,
          triggerSource: triggerSpec?.source,
          inputs,
          processes,
          terminals,
        });
      } catch {
        // Skip flows where YAML can't be read
      }
    }

    domains.push({
      id: domainId,
      name: domain.name,
      description: domain.description,
      flows,
      publishesEvents: domain.publishes_events?.map((e) => e.event) ?? [],
      consumesEvents: domain.consumes_events?.map((e) => e.event) ?? [],
    });
  }

  return {
    projectName: projectConfig.name ?? 'my-project',
    projectDescription: projectConfig.description ?? '',
    techStack,
    domains,
  };
}
