import { invoke } from '@tauri-apps/api/core';
import { parse } from 'yaml';
import type {
  DomainConfig,
  SystemLayout,
  SystemMapData,
  SystemMapDomain,
  SystemMapArrow,
  DomainMapData,
  DomainMapFlow,
  DomainMapPortal,
  DomainMapArrow,
  SystemZone,
  DomainOrchestration,
  OrchestrationRelationship,
  AgentGroupVisual,
} from '../types/domain';
import type { OrchestratorSpec, HandoffSpec, AgentGroupSpec } from '../types/flow';
import type { Position } from '../types/sheet';

const GRID_COLS = 3;
const GRID_H_SPACING = 380;
const GRID_V_SPACING = 220;
const GRID_OFFSET_X = 60;
const GRID_OFFSET_Y = 40;

export function generateAutoLayout(domainIds: string[]): SystemLayout {
  const domains: Record<string, Position> = {};
  domainIds.forEach((id, index) => {
    const col = index % GRID_COLS;
    const row = Math.floor(index / GRID_COLS);
    domains[id] = {
      x: GRID_OFFSET_X + col * GRID_H_SPACING,
      y: GRID_OFFSET_Y + row * GRID_V_SPACING,
    };
  });
  return { domains };
}

export function buildSystemMapData(
  domainConfigs: Record<string, DomainConfig>,
  systemLayout: SystemLayout
): SystemMapData {
  const domainIds = Object.keys(domainConfigs);

  // Build domain view models
  const domains: SystemMapDomain[] = domainIds.map((id) => {
    const config = domainConfigs[id];
    const position = systemLayout.domains[id] ?? { x: 0, y: 0 };
    // Detect human touchpoints: domain has flows with HTTP triggers (not cron/event)
    const hasHumanTouchpoint = config.role === 'interface' ||
      config.flows.some((f) => f.tags?.includes('http') || f.tags?.includes('api'));
    const storeCount = Array.isArray(config.stores) ? config.stores.length : 0;
    return {
      id,
      name: config.name,
      description: config.description,
      flowCount: config.flows.length,
      position,
      role: config.role,
      hasHumanTouchpoint: hasHumanTouchpoint || undefined,
      owns_schemas: config.owns_schemas,
      storeCount: storeCount || undefined,
    };
  });

  // Build event arrows by matching publishes → consumes across domains
  const arrowMap = new Map<string, SystemMapArrow>();

  for (const sourceId of domainIds) {
    const source = domainConfigs[sourceId];
    for (const pub of source.publishes_events) {
      // Find consumers of this event in other domains
      for (const targetId of domainIds) {
        if (targetId === sourceId) continue;
        const target = domainConfigs[targetId];
        const consumed = target.consumes_events.some(
          (c) => c.event === pub.event
        );
        if (consumed) {
          const key = `${sourceId}->${targetId}`;
          const existing = arrowMap.get(key);
          if (existing) {
            if (!existing.events.includes(pub.event)) {
              existing.events.push(pub.event);
            }
          } else {
            arrowMap.set(key, {
              id: key,
              sourceDomainId: sourceId,
              targetDomainId: targetId,
              events: [pub.event],
            });
          }
        }
      }
    }
  }

  const eventArrows: SystemMapArrow[] = Array.from(arrowMap.values());

  const zones: SystemZone[] = systemLayout.zones ?? [];

  return { domains, eventArrows, zones };
}

// --- L2 Domain Map ---

const FLOW_GRID_COLS = 3;
const FLOW_H_SPACING = 320;
const FLOW_V_SPACING = 180;
const FLOW_OFFSET_X = 60;
const FLOW_OFFSET_Y = 40;

export function generateFlowAutoLayout(ids: string[]): Record<string, Position> {
  const positions: Record<string, Position> = {};
  ids.forEach((id, index) => {
    const col = index % FLOW_GRID_COLS;
    const row = Math.floor(index / FLOW_GRID_COLS);
    positions[id] = {
      x: FLOW_OFFSET_X + col * FLOW_H_SPACING,
      y: FLOW_OFFSET_Y + row * FLOW_V_SPACING,
    };
  });
  return positions;
}

export function buildDomainMapData(
  domainId: string,
  domainConfig: DomainConfig,
  allDomainConfigs: Record<string, DomainConfig>
): DomainMapData {
  // Build flow view models
  const flowPositions = domainConfig.layout?.flows ?? {};
  const autoFlowPositions = generateFlowAutoLayout(
    domainConfig.flows.filter((f) => !flowPositions[f.id]).map((f) => f.id)
  );

  // Merge: saved positions first, auto-layout for the rest
  let autoIndex = 0;
  const autoIds = Object.keys(autoFlowPositions);

  const flows: DomainMapFlow[] = domainConfig.flows.map((f) => {
    let position = flowPositions[f.id];
    if (!position) {
      position = autoFlowPositions[autoIds[autoIndex]] ?? { x: 60, y: 40 };
      autoIndex++;
    }
    return {
      id: f.id,
      name: f.name,
      description: f.description,
      type: (f.type ?? 'traditional') as 'traditional' | 'agent',
      position,
      tags: f.tags,
      group: f.group,
      keyboard_shortcut: f.keyboard_shortcut,
    };
  });

  // Derive portals: for each published event, find consuming domains (other than self)
  const portalMap = new Map<string, DomainMapPortal>();
  const portalPositions = domainConfig.layout?.portals ?? {};

  for (const pub of domainConfig.publishes_events) {
    for (const [otherId, otherConfig] of Object.entries(allDomainConfigs)) {
      if (otherId === domainId) continue;
      const consumed = otherConfig.consumes_events.some((c) => c.event === pub.event);
      if (consumed && !portalMap.has(otherId)) {
        portalMap.set(otherId, {
          id: otherId,
          targetDomainName: otherConfig.name,
          position: portalPositions[otherId] ?? { x: 0, y: 0 },
        });
      }
    }
  }

  // Also check events consumed from other domains
  for (const con of domainConfig.consumes_events) {
    for (const [otherId, otherConfig] of Object.entries(allDomainConfigs)) {
      if (otherId === domainId) continue;
      const published = otherConfig.publishes_events.some((p) => p.event === con.event);
      if (published && !portalMap.has(otherId)) {
        portalMap.set(otherId, {
          id: otherId,
          targetDomainName: otherConfig.name,
          position: portalPositions[otherId] ?? { x: 0, y: 0 },
        });
      }
    }
  }

  const portals = Array.from(portalMap.values());

  // Auto-layout portals that have no saved position
  const portalAutoLayout = generateFlowAutoLayout(
    portals.filter((p) => p.position.x === 0 && p.position.y === 0).map((p) => p.id)
  );
  let portalAutoIdx = 0;
  const portalAutoIds = Object.keys(portalAutoLayout);
  for (const portal of portals) {
    if (portal.position.x === 0 && portal.position.y === 0) {
      // Offset portals to the right of flows
      const base = portalAutoLayout[portalAutoIds[portalAutoIdx]] ?? { x: 0, y: 0 };
      portal.position = {
        x: base.x + (flows.length > 0 ? FLOW_H_SPACING * Math.min(flows.length, FLOW_GRID_COLS) : 0),
        y: base.y,
      };
      portalAutoIdx++;
    }
  }

  // Build event arrows
  const arrowMap = new Map<string, DomainMapArrow>();

  // Intra-domain arrows: flow publishes → flow consumes within same domain
  for (const pub of domainConfig.publishes_events) {
    if (!pub.from_flow) continue;
    // Check if any flow in this domain consumes it
    for (const con of domainConfig.consumes_events) {
      if (con.event === pub.event && con.handled_by_flow) {
        const key = `${pub.from_flow}->${con.handled_by_flow}:${pub.event}`;
        const arrowKey = `${pub.from_flow}->${con.handled_by_flow}`;
        const existing = arrowMap.get(arrowKey);
        if (existing) {
          if (!existing.events.includes(pub.event)) {
            existing.events.push(pub.event);
          }
        } else {
          arrowMap.set(arrowKey, {
            id: key,
            sourceId: pub.from_flow,
            targetId: con.handled_by_flow,
            sourceType: 'flow',
            targetType: 'flow',
            events: [pub.event],
          });
        }
      }
    }
  }

  // Flow→portal arrows: flow publishes event consumed by another domain
  for (const pub of domainConfig.publishes_events) {
    if (!pub.from_flow) continue;
    for (const [otherId, otherConfig] of Object.entries(allDomainConfigs)) {
      if (otherId === domainId) continue;
      const consumed = otherConfig.consumes_events.some((c) => c.event === pub.event);
      if (consumed && portalMap.has(otherId)) {
        const arrowKey = `${pub.from_flow}->${otherId}`;
        const existing = arrowMap.get(arrowKey);
        if (existing) {
          if (!existing.events.includes(pub.event)) {
            existing.events.push(pub.event);
          }
        } else {
          arrowMap.set(arrowKey, {
            id: arrowKey,
            sourceId: pub.from_flow,
            targetId: otherId,
            sourceType: 'flow',
            targetType: 'portal',
            events: [pub.event],
          });
        }
      }
    }
  }

  // Portal→flow arrows: another domain publishes, this domain's flow consumes
  for (const con of domainConfig.consumes_events) {
    if (!con.handled_by_flow) continue;
    for (const [otherId, otherConfig] of Object.entries(allDomainConfigs)) {
      if (otherId === domainId) continue;
      const published = otherConfig.publishes_events.some((p) => p.event === con.event);
      if (published && portalMap.has(otherId)) {
        const arrowKey = `${otherId}->${con.handled_by_flow}`;
        const existing = arrowMap.get(arrowKey);
        if (existing) {
          if (!existing.events.includes(con.event)) {
            existing.events.push(con.event);
          }
        } else {
          arrowMap.set(arrowKey, {
            id: arrowKey,
            sourceId: otherId,
            targetId: con.handled_by_flow,
            sourceType: 'portal',
            targetType: 'flow',
            events: [con.event],
          });
        }
      }
    }
  }

  return {
    flows,
    portals,
    eventArrows: Array.from(arrowMap.values()),
  };
}

// --- Orchestration data extraction ---

export async function extractOrchestrationData(
  domainId: string,
  domainConfig: DomainConfig,
  projectPath: string
): Promise<DomainOrchestration> {
  const relationships: OrchestrationRelationship[] = [];
  const agentGroups: AgentGroupVisual[] = [];

  for (const flowEntry of domainConfig.flows) {
    if (flowEntry.type !== 'agent') continue;

    try {
      const flowPath = `${projectPath}/specs/domains/${domainId}/flows/${flowEntry.id}.yaml`;
      const content: string = await invoke('read_file', { path: flowPath });
      const raw = parse(content) as Record<string, unknown>;

      // Get nodes array (handle both normalized and raw formats)
      const nodes = Array.isArray(raw.nodes) ? raw.nodes : [];

      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const n = node as Record<string, unknown>;
        const nodeType = n.type as string;
        const spec = (n.spec ?? n.config ?? {}) as Record<string, unknown>;

        if (nodeType === 'orchestrator') {
          const orchSpec = spec as OrchestratorSpec;
          const agents = Array.isArray(orchSpec.agents) ? orchSpec.agents : [];
          for (const agent of agents) {
            if (!agent.flow) continue;
            // Agent flow reference can be "domain/flow" or just "flow" (same domain)
            const targetFlowId = agent.flow.includes('/') ? agent.flow.split('/')[1] : agent.flow;
            // Only add if target flow exists in this domain
            if (domainConfig.flows.some((f) => f.id === targetFlowId)) {
              relationships.push({
                type: 'supervisor',
                sourceFlowId: flowEntry.id,
                targetFlowId,
              });
            }
          }
        }

        if (nodeType === 'handoff') {
          const handoffSpec = spec as HandoffSpec;
          const targetFlow = handoffSpec.target?.flow;
          if (targetFlow) {
            const targetFlowId = targetFlow.includes('/') ? targetFlow.split('/')[1] : targetFlow;
            if (domainConfig.flows.some((f) => f.id === targetFlowId)) {
              relationships.push({
                type: 'handoff',
                sourceFlowId: flowEntry.id,
                targetFlowId,
                mode: handoffSpec.mode,
              });
            }
          }
        }

        if (nodeType === 'agent_group') {
          const groupSpec = spec as AgentGroupSpec;
          const members = Array.isArray(groupSpec.members) ? groupSpec.members : [];
          const memberFlowIds: string[] = [];
          for (const member of members) {
            if (!member.flow) continue;
            const memberId = member.flow.includes('/') ? member.flow.split('/')[1] : member.flow;
            if (domainConfig.flows.some((f) => f.id === memberId)) {
              memberFlowIds.push(memberId);
            }
          }
          if (memberFlowIds.length > 0) {
            agentGroups.push({
              id: `group-${flowEntry.id}-${String(n.id ?? '')}`,
              name: groupSpec.name ?? 'Agent Group',
              flowIds: memberFlowIds,
            });
          }
        }
      }
    } catch {
      // Silently skip unreadable flows
    }
  }

  return { relationships, agentGroups };
}
