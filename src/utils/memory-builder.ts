import { invoke } from '@tauri-apps/api/core';
import { parse } from 'yaml';
import type { DomainConfig } from '../types/domain';
import type { FlowDocument, DddFlowNode, AgentLoopSpec } from '../types/flow';
import type {
  SpecIndex,
  SpecIndexDomain,
  SpecIndexFlow,
  SpecIndexEvent,
  FlowMap,
  FlowMapEdge,
  FlowDependency,
  ImplementationStatus,
  FlowImplStatus,
} from '../types/memory';

export async function buildSpecIndex(
  projectPath: string,
  domainConfigs: Record<string, DomainConfig>,
): Promise<SpecIndex> {
  const domains: Record<string, SpecIndexDomain> = {};
  const eventMap = new Map<string, { publisher: string; consumers: string[] }>();

  for (const [domainId, config] of Object.entries(domainConfigs)) {
    const flows: Record<string, SpecIndexFlow> = {};

    for (const flowEntry of config.flows) {
      const flowPath = `${projectPath}/specs/domains/${domainId}/flows/${flowEntry.id}.yaml`;
      let triggerStr = '';
      let nodeCount = 0;
      const nodeTypes: string[] = [];
      let agentModel: string | undefined;
      const tools: string[] = [];

      try {
        const content: string = await invoke('read_file', { path: flowPath });
        const doc = parse(content) as FlowDocument;
        const allNodes: DddFlowNode[] = [doc.trigger, ...doc.nodes];
        nodeCount = allNodes.length;

        for (const node of allNodes) {
          if (!nodeTypes.includes(node.type)) {
            nodeTypes.push(node.type);
          }
        }

        // Extract trigger info
        if (doc.trigger?.spec) {
          const ts = doc.trigger.spec as { event?: string; source?: string };
          triggerStr = [ts.event, ts.source].filter(Boolean).join(' from ') || doc.trigger.label;
        }

        // Extract agent info
        for (const node of doc.nodes) {
          if (node.type === 'agent_loop') {
            const spec = (node.spec ?? {}) as AgentLoopSpec;
            agentModel = spec.model;
            if (spec.tools) {
              for (const t of spec.tools) {
                if (t.name && !tools.includes(t.name)) tools.push(t.name);
              }
            }
          }
        }
      } catch {
        // Flow file may not exist — use fallback
        triggerStr = flowEntry.name;
      }

      // Collect events published/consumed by this flow
      const publishesEvents: string[] = config.publishes_events
        .filter((e) => e.from_flow === flowEntry.id)
        .map((e) => e.event);
      const consumesEvents: string[] = config.consumes_events
        .filter((e) => e.handled_by_flow === flowEntry.id)
        .map((e) => e.event);

      flows[flowEntry.id] = {
        type: (flowEntry.type ?? 'traditional') as 'traditional' | 'agent',
        trigger: triggerStr,
        nodeCount,
        nodeTypes,
        publishesEvents,
        consumesEvents,
        ...(agentModel ? { agentModel } : {}),
        ...(tools.length > 0 ? { tools } : {}),
      };
    }

    domains[domainId] = {
      description: config.description,
      flows,
    };

    // Collect events for cross-domain map
    for (const pub of config.publishes_events) {
      const key = pub.event;
      if (!eventMap.has(key)) {
        eventMap.set(key, { publisher: domainId, consumers: [] });
      } else {
        eventMap.get(key)!.publisher = domainId;
      }
    }

    for (const con of config.consumes_events) {
      const key = con.event;
      if (!eventMap.has(key)) {
        eventMap.set(key, { publisher: '', consumers: [domainId] });
      } else {
        const entry = eventMap.get(key)!;
        if (!entry.consumers.includes(domainId)) {
          entry.consumers.push(domainId);
        }
      }
    }
  }

  const events: SpecIndexEvent[] = Array.from(eventMap.entries()).map(([name, val]) => ({
    name,
    publisher: val.publisher,
    consumers: val.consumers,
  }));

  return {
    domains,
    events,
    generatedAt: new Date().toISOString(),
  };
}

export function buildFlowMap(
  domainConfigs: Record<string, DomainConfig>,
): FlowMap {
  const edges: FlowMapEdge[] = [];
  const deps: Record<string, FlowDependency> = {};

  // Initialize dependencies for all flows
  for (const [domainId, config] of Object.entries(domainConfigs)) {
    for (const flow of config.flows) {
      const fullId = `${domainId}/${flow.id}`;
      deps[fullId] = {
        dependsOn: [],
        dependedOnBy: [],
        eventsIn: [],
        eventsOut: [],
      };
    }
  }

  // Build event-based edges
  for (const [pubDomainId, pubConfig] of Object.entries(domainConfigs)) {
    for (const pub of pubConfig.publishes_events) {
      const fromFlow = pub.from_flow;
      if (!fromFlow) continue;
      const fromFullId = `${pubDomainId}/${fromFlow}`;

      if (deps[fromFullId] && !deps[fromFullId].eventsOut.includes(pub.event)) {
        deps[fromFullId].eventsOut.push(pub.event);
      }

      for (const [conDomainId, conConfig] of Object.entries(domainConfigs)) {
        for (const con of conConfig.consumes_events) {
          if (con.event !== pub.event || !con.handled_by_flow) continue;
          const toFullId = `${conDomainId}/${con.handled_by_flow}`;

          edges.push({
            from: fromFullId,
            to: toFullId,
            via: pub.event,
            type: 'event',
          });

          if (deps[fromFullId] && !deps[fromFullId].dependedOnBy.includes(toFullId)) {
            deps[fromFullId].dependedOnBy.push(toFullId);
          }
          if (deps[toFullId]) {
            if (!deps[toFullId].dependsOn.includes(fromFullId)) {
              deps[toFullId].dependsOn.push(fromFullId);
            }
            if (!deps[toFullId].eventsIn.includes(con.event)) {
              deps[toFullId].eventsIn.push(con.event);
            }
          }
        }
      }
    }
  }

  return {
    events: edges,
    flowDependencies: deps,
    generatedAt: new Date().toISOString(),
  };
}

interface FlowMappingEntry {
  spec: string;
  specHash: string;
  files: string[];
  implementedAt: string;
  mode: 'new' | 'update';
}

export async function buildImplementationStatus(
  projectPath: string,
  domainConfigs: Record<string, DomainConfig>,
): Promise<ImplementationStatus> {
  const flows: Record<string, FlowImplStatus> = {};
  let total = 0;
  let implemented = 0;
  let stale = 0;

  // Try reading mapping.yaml to determine actual implementation status
  let mappings: Record<string, FlowMappingEntry> = {};
  try {
    const raw = await invoke<string>('read_file', {
      path: `${projectPath}/.ddd/mapping.yaml`,
    });
    const parsed = parse(raw) as { flows?: Record<string, FlowMappingEntry> };
    mappings = parsed.flows ?? {};
  } catch {
    // File doesn't exist yet — all flows are pending
  }

  for (const [domainId, config] of Object.entries(domainConfigs)) {
    for (const flow of config.flows) {
      const fullId = `${domainId}/${flow.id}`;
      total++;

      const mapping = mappings[fullId];
      if (mapping) {
        // Check if spec has changed since implementation (stale detection)
        let currentHash = '';
        try {
          currentHash = await invoke<string>('compute_file_hash', {
            path: `${projectPath}/${mapping.spec}`,
          });
        } catch {
          // If hash fails, treat as stale
        }

        const isStale = currentHash !== '' && currentHash !== mapping.specHash;
        const status = isStale ? 'stale' : 'implemented';

        if (isStale) stale++;
        else implemented++;

        flows[fullId] = {
          status,
          domain: domainId,
          flowName: flow.name,
        };
      } else {
        flows[fullId] = {
          status: 'pending',
          domain: domainId,
          flowName: flow.name,
        };
      }
    }
  }

  const pending = total - implemented - stale;

  return {
    overview: {
      total,
      implemented,
      pending,
      stale,
    },
    flows,
    generatedAt: new Date().toISOString(),
  };
}
