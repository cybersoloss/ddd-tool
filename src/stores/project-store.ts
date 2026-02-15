import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { stringify, parse } from 'yaml';
import { nanoid } from 'nanoid';
import type { DomainConfig, DomainFlowEntry, EventWiring, SystemLayout } from '../types/domain';
import type { Position } from '../types/sheet';
import type { FlowDocument } from '../types/flow';
import { generateAutoLayout, generateFlowAutoLayout } from '../utils/domain-parser';
import { FLOW_TEMPLATES } from '../utils/flow-templates';
import { markWriting } from './write-guard';

interface ProjectState {
  projectPath: string | null;
  domainConfigs: Record<string, DomainConfig>;
  systemLayout: SystemLayout;
  loading: boolean;
  loaded: boolean;

  loadProject: (path: string) => Promise<void>;
  addDomain: (name: string, description?: string) => Promise<string>;
  addFlow: (domainId: string, name: string, description?: string, flowType?: 'traditional' | 'agent', templateId?: string) => Promise<string>;
  deleteFlow: (domainId: string, flowId: string) => Promise<void>;
  deleteDomain: (domainId: string) => Promise<void>;
  renameDomain: (domainId: string, newName: string) => Promise<void>;
  renameFlow: (domainId: string, flowId: string, newName: string) => Promise<void>;
  updateDomainPosition: (domainId: string, position: Position) => void;
  updateFlowPosition: (domainId: string, flowId: string, position: Position) => void;
  updatePortalPosition: (domainId: string, portalId: string, position: Position) => void;
  addEventWiring: (domainId: string, type: 'publish' | 'consume', wiring: EventWiring) => Promise<void>;
  updateEventWiring: (domainId: string, type: 'publish' | 'consume', index: number, wiring: EventWiring) => Promise<void>;
  removeEventWiring: (domainId: string, type: 'publish' | 'consume', index: number) => Promise<void>;
  addEventArrow: (sourceDomainId: string, targetDomainId: string, eventName: string, fromFlow?: string, handledByFlow?: string, description?: string) => Promise<void>;
  autoLayoutDomains: () => void;
  autoLayoutFlows: (domainId: string) => void;
  reloadProject: () => Promise<void>;
  reset: () => void;
}

let saveLayoutTimer: ReturnType<typeof setTimeout> | null = null;
const domainSaveTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectPath: null,
  domainConfigs: {},
  systemLayout: { domains: {} },
  loading: false,
  loaded: false,

  loadProject: async (path) => {
    set({ loading: true, loaded: false, projectPath: path });

    try {
      // Read or initialize ddd-project.json
      let projectConfig: { domains: Array<{ name: string; description?: string }> };
      const projectJsonPath = `${path}/ddd-project.json`;
      const projectExists: boolean = await invoke('path_exists', { path: projectJsonPath });

      if (projectExists) {
        const projectJson: string = await invoke('read_file', { path: projectJsonPath });
        projectConfig = JSON.parse(projectJson);
      } else {
        // No ddd-project.json — initialize as empty DDD project
        projectConfig = { domains: [] };
        await invoke('write_file', {
          path: projectJsonPath,
          contents: JSON.stringify(projectConfig, null, 2),
        });
      }

      // Load domain configs
      const domainConfigs: Record<string, DomainConfig> = {};
      for (const domain of projectConfig.domains) {
        const domainId = domain.name.toLowerCase().replace(/\s+/g, '-');
        const domainYamlPath = `${path}/specs/domains/${domainId}/domain.yaml`;

        try {
          const exists: boolean = await invoke('path_exists', {
            path: domainYamlPath,
          });
          if (exists) {
            const yamlContent: string = await invoke('read_file', {
              path: domainYamlPath,
            });
            const parsed = parse(yamlContent) as DomainConfig;
            domainConfigs[domainId] = parsed;
          } else {
            // Fallback: create a minimal config from project.json
            domainConfigs[domainId] = {
              name: domain.name,
              description: domain.description,
              flows: [],
              publishes_events: [],
              consumes_events: [],
              layout: { flows: {}, portals: {} },
            };
          }
        } catch {
          // Fallback on parse error
          domainConfigs[domainId] = {
            name: domain.name,
            description: domain.description,
            flows: [],
            publishes_events: [],
            consumes_events: [],
            layout: { flows: {}, portals: {} },
          };
        }
      }

      // Load or generate system layout
      let systemLayout: SystemLayout;
      const layoutPath = `${path}/specs/system-layout.yaml`;
      try {
        const exists: boolean = await invoke('path_exists', {
          path: layoutPath,
        });
        if (exists) {
          const layoutContent: string = await invoke('read_file', {
            path: layoutPath,
          });
          systemLayout = parse(layoutContent) as SystemLayout;
        } else {
          systemLayout = generateAutoLayout(Object.keys(domainConfigs));
          await invoke('write_file', {
            path: layoutPath,
            contents: stringify(systemLayout),
          });
        }
      } catch {
        systemLayout = generateAutoLayout(Object.keys(domainConfigs));
      }

      set({
        domainConfigs,
        systemLayout,
        loading: false,
        loaded: true,
      });
    } catch (e) {
      set({ loading: false, loaded: false });
      throw e;
    }
  },

  addDomain: async (name, description?) => {
    const { projectPath, domainConfigs, systemLayout } = get();
    if (!projectPath) throw new Error('No project loaded');

    const domainId = name.toLowerCase().replace(/\s+/g, '-');

    // Create a minimal DomainConfig
    const newDomain: DomainConfig = {
      name,
      description,
      flows: [],
      publishes_events: [],
      consumes_events: [],
      layout: { flows: {}, portals: {} },
    };

    // Auto-position below existing domains
    const existingPositions = Object.values(systemLayout.domains);
    const maxY = existingPositions.length > 0
      ? Math.max(...existingPositions.map((p) => p.y))
      : -200;
    const newPosition = { x: 100, y: maxY + 200 };

    const updatedConfigs = { ...domainConfigs, [domainId]: newDomain };
    const updatedLayout: SystemLayout = {
      ...systemLayout,
      domains: { ...systemLayout.domains, [domainId]: newPosition },
    };

    set({ domainConfigs: updatedConfigs, systemLayout: updatedLayout });

    // Write domain.yaml
    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/domains/${domainId}/domain.yaml`,
      contents: stringify(newDomain),
    });

    // Update ddd-project.json
    try {
      const projectJson: string = await invoke('read_file', {
        path: `${projectPath}/ddd-project.json`,
      });
      const projectConfig = JSON.parse(projectJson);
      projectConfig.domains = [
        ...(projectConfig.domains as Array<{ name: string; description?: string }>),
        { name, ...(description ? { description } : {}) },
      ];
      await invoke('write_file', {
        path: `${projectPath}/ddd-project.json`,
        contents: JSON.stringify(projectConfig, null, 2),
      });
    } catch {
      // Silent
    }

    // Write system layout
    try {
      await invoke('write_file', {
        path: `${projectPath}/specs/system-layout.yaml`,
        contents: stringify(updatedLayout),
      });
    } catch {
      // Silent
    }

    return domainId;
  },

  addFlow: async (domainId, name, description?, flowType?, templateId?) => {
    const { projectPath, domainConfigs } = get();
    if (!projectPath) throw new Error('No project loaded');

    const domain = domainConfigs[domainId];
    if (!domain) throw new Error(`Domain ${domainId} not found`);

    const flowId = name.toLowerCase().replace(/\s+/g, '-');
    const resolvedType = flowType ?? 'traditional';

    // Create DomainFlowEntry
    const entry: DomainFlowEntry = { id: flowId, name, description, type: resolvedType };
    const updatedDomain: DomainConfig = {
      ...domain,
      flows: [...domain.flows, entry],
    };

    // Update state
    const updatedConfigs = { ...domainConfigs, [domainId]: updatedDomain };
    set({ domainConfigs: updatedConfigs });

    // Write updated domain.yaml
    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/domains/${domainId}/domain.yaml`,
      contents: stringify(updatedDomain),
    });

    // Check if a template was requested
    const template = templateId ? FLOW_TEMPLATES.find((t) => t.id === templateId) : null;

    let flowDoc: FlowDocument;

    if (template) {
      // Use template factory
      flowDoc = template.create(flowId, name, domainId);
      if (description) flowDoc.flow.description = description;
    } else {
      // Create initial flow YAML with default trigger
      const now = new Date().toISOString();
      flowDoc = {
        flow: {
          id: flowId,
          name,
          type: resolvedType,
          domain: domainId,
          description,
        },
        trigger: {
          id: 'trigger-' + nanoid(8),
          type: 'trigger',
          position: { x: 250, y: 50 },
          connections: [],
          spec: { event: '', source: '', description: '' },
          label: 'Trigger',
        },
        nodes: [],
        metadata: { created: now, modified: now },
      };

      // Agent flows get a pre-placed agent_loop node
      if (resolvedType === 'agent') {
        const agentNodeId = 'agent_loop-' + nanoid(8);
        flowDoc.nodes.push({
          id: agentNodeId,
          type: 'agent_loop',
          position: { x: 200, y: 200 },
          connections: [],
          spec: {
            model: 'claude-sonnet',
            system_prompt: '',
            max_iterations: 10,
            temperature: 0.7,
            stop_conditions: [],
            tools: [],
            memory: [],
            on_max_iterations: 'respond',
          },
          label: 'Agent Loop',
        });
        flowDoc.trigger.connections.push({ targetNodeId: agentNodeId });
      }
    }

    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/domains/${domainId}/flows/${flowId}.yaml`,
      contents: stringify(flowDoc),
    });

    return flowId;
  },

  deleteFlow: async (domainId, flowId) => {
    const { projectPath, domainConfigs } = get();
    if (!projectPath) throw new Error('No project loaded');

    const domain = domainConfigs[domainId];
    if (!domain) throw new Error(`Domain ${domainId} not found`);

    // Remove from flows list and layout
    const { [flowId]: _, ...remainingFlowPositions } = domain.layout?.flows ?? {};
    const updatedDomain: DomainConfig = {
      ...domain,
      flows: domain.flows.filter((f) => f.id !== flowId),
      layout: {
        ...(domain.layout ?? { portals: {} }),
        flows: remainingFlowPositions,
      },
    };

    // Update state
    const updatedConfigs = { ...domainConfigs, [domainId]: updatedDomain };
    set({ domainConfigs: updatedConfigs });

    // Write updated domain.yaml
    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/domains/${domainId}/domain.yaml`,
      contents: stringify(updatedDomain),
    });

    // Delete the flow YAML file
    try {
      await invoke('delete_file', {
        path: `${projectPath}/specs/domains/${domainId}/flows/${flowId}.yaml`,
      });
    } catch {
      // Silent — file may not exist
    }
  },

  deleteDomain: async (domainId) => {
    const { projectPath, domainConfigs, systemLayout } = get();
    if (!projectPath) throw new Error('No project loaded');
    markWriting();

    // Remove from domainConfigs
    const { [domainId]: _, ...remainingConfigs } = domainConfigs;

    // Remove from systemLayout
    const { [domainId]: __, ...remainingDomains } = systemLayout.domains;
    const updatedLayout: SystemLayout = { ...systemLayout, domains: remainingDomains };

    set({ domainConfigs: remainingConfigs, systemLayout: updatedLayout });

    // Update ddd-project.json (remove domain from the list)
    try {
      const projectJson: string = await invoke('read_file', {
        path: `${projectPath}/ddd-project.json`,
      });
      const projectConfig = JSON.parse(projectJson);
      projectConfig.domains = (projectConfig.domains as Array<{ name: string }>).filter(
        (d) => d.name.toLowerCase().replace(/\s+/g, '-') !== domainId
      );
      await invoke('write_file', {
        path: `${projectPath}/ddd-project.json`,
        contents: JSON.stringify(projectConfig, null, 2),
      });
    } catch {
      // Silent
    }

    // Write updated system layout
    try {
      await invoke('write_file', {
        path: `${projectPath}/specs/system-layout.yaml`,
        contents: stringify(updatedLayout),
      });
    } catch {
      // Silent
    }

    // Delete the domain directory (domain.yaml + flows/)
    try {
      await invoke('delete_directory', {
        path: `${projectPath}/specs/domains/${domainId}`,
      });
    } catch {
      // Silent — directory may not exist
    }
  },

  renameDomain: async (domainId, newName) => {
    const { projectPath, domainConfigs } = get();
    if (!projectPath) throw new Error('No project loaded');
    markWriting();

    const domain = domainConfigs[domainId];
    if (!domain) throw new Error(`Domain ${domainId} not found`);

    const updatedDomain = { ...domain, name: newName };
    const updatedConfigs = { ...domainConfigs, [domainId]: updatedDomain };
    set({ domainConfigs: updatedConfigs });

    // Write updated domain.yaml
    await invoke('write_file', {
      path: `${projectPath}/specs/domains/${domainId}/domain.yaml`,
      contents: stringify(updatedDomain),
    });

    // Update ddd-project.json
    try {
      const projectJson: string = await invoke('read_file', {
        path: `${projectPath}/ddd-project.json`,
      });
      const projectConfig = JSON.parse(projectJson);
      projectConfig.domains = (
        projectConfig.domains as Array<{ name: string; description?: string }>
      ).map((d) =>
        d.name.toLowerCase().replace(/\s+/g, '-') === domainId
          ? { ...d, name: newName }
          : d
      );
      await invoke('write_file', {
        path: `${projectPath}/ddd-project.json`,
        contents: JSON.stringify(projectConfig, null, 2),
      });
    } catch {
      // Silent
    }
  },

  renameFlow: async (domainId, flowId, newName) => {
    const { projectPath, domainConfigs } = get();
    if (!projectPath) throw new Error('No project loaded');
    markWriting();

    const domain = domainConfigs[domainId];
    if (!domain) throw new Error(`Domain ${domainId} not found`);

    // Update flow entry name
    const updatedDomain: DomainConfig = {
      ...domain,
      flows: domain.flows.map((f) =>
        f.id === flowId ? { ...f, name: newName } : f
      ),
    };
    const updatedConfigs = { ...domainConfigs, [domainId]: updatedDomain };
    set({ domainConfigs: updatedConfigs });

    // Write updated domain.yaml
    await invoke('write_file', {
      path: `${projectPath}/specs/domains/${domainId}/domain.yaml`,
      contents: stringify(updatedDomain),
    });

    // Update flow YAML file
    try {
      const flowPath = `${projectPath}/specs/domains/${domainId}/flows/${flowId}.yaml`;
      const flowContent: string = await invoke('read_file', { path: flowPath });
      const flowDoc = parse(flowContent) as FlowDocument;
      if (flowDoc.flow) flowDoc.flow.name = newName;
      await invoke('write_file', {
        path: flowPath,
        contents: stringify(flowDoc),
      });
    } catch {
      // Silent — flow file may not exist yet
    }
  },

  updateDomainPosition: (domainId, position) => {
    const layout = get().systemLayout;
    const updated: SystemLayout = {
      ...layout,
      domains: {
        ...layout.domains,
        [domainId]: position,
      },
    };
    set({ systemLayout: updated });

    // Debounce write to disk
    if (saveLayoutTimer) clearTimeout(saveLayoutTimer);
    saveLayoutTimer = setTimeout(async () => {
      const projectPath = get().projectPath;
      if (!projectPath) return;
      try {
        markWriting();
        await invoke('write_file', {
          path: `${projectPath}/specs/system-layout.yaml`,
          contents: stringify(get().systemLayout),
        });
      } catch {
        // Silent — layout save is best-effort
      }
    }, 500);
  },

  updateFlowPosition: (domainId, flowId, position) => {
    const configs = get().domainConfigs;
    const domain = configs[domainId];
    if (!domain) return;

    const updated = {
      ...configs,
      [domainId]: {
        ...domain,
        layout: {
          ...(domain.layout ?? { portals: {} }),
          flows: { ...(domain.layout?.flows ?? {}), [flowId]: position },
        },
      },
    };
    set({ domainConfigs: updated });

    // Per-domain debounce
    if (domainSaveTimers[domainId]) clearTimeout(domainSaveTimers[domainId]);
    domainSaveTimers[domainId] = setTimeout(async () => {
      const projectPath = get().projectPath;
      if (!projectPath) return;
      try {
        markWriting();
        await invoke('write_file', {
          path: `${projectPath}/specs/domains/${domainId}/domain.yaml`,
          contents: stringify(get().domainConfigs[domainId]),
        });
      } catch {
        // Silent — layout save is best-effort
      }
    }, 500);
  },

  updatePortalPosition: (domainId, portalId, position) => {
    const configs = get().domainConfigs;
    const domain = configs[domainId];
    if (!domain) return;

    const updated = {
      ...configs,
      [domainId]: {
        ...domain,
        layout: {
          ...(domain.layout ?? { flows: {} }),
          portals: { ...(domain.layout?.portals ?? {}), [portalId]: position },
        },
      },
    };
    set({ domainConfigs: updated });

    // Per-domain debounce
    if (domainSaveTimers[domainId]) clearTimeout(domainSaveTimers[domainId]);
    domainSaveTimers[domainId] = setTimeout(async () => {
      const projectPath = get().projectPath;
      if (!projectPath) return;
      try {
        markWriting();
        await invoke('write_file', {
          path: `${projectPath}/specs/domains/${domainId}/domain.yaml`,
          contents: stringify(get().domainConfigs[domainId]),
        });
      } catch {
        // Silent — layout save is best-effort
      }
    }, 500);
  },

  addEventWiring: async (domainId, type, wiring) => {
    const { projectPath, domainConfigs } = get();
    if (!projectPath) throw new Error('No project loaded');
    const domain = domainConfigs[domainId];
    if (!domain) throw new Error(`Domain ${domainId} not found`);

    const key = type === 'publish' ? 'publishes_events' : 'consumes_events';
    const updatedDomain: DomainConfig = {
      ...domain,
      [key]: [...domain[key], wiring],
    };
    set({ domainConfigs: { ...domainConfigs, [domainId]: updatedDomain } });

    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/domains/${domainId}/domain.yaml`,
      contents: stringify(updatedDomain),
    });
  },

  updateEventWiring: async (domainId, type, index, wiring) => {
    const { projectPath, domainConfigs } = get();
    if (!projectPath) throw new Error('No project loaded');
    const domain = domainConfigs[domainId];
    if (!domain) throw new Error(`Domain ${domainId} not found`);

    const key = type === 'publish' ? 'publishes_events' : 'consumes_events';
    const updatedList = [...domain[key]];
    updatedList[index] = wiring;
    const updatedDomain: DomainConfig = { ...domain, [key]: updatedList };
    set({ domainConfigs: { ...domainConfigs, [domainId]: updatedDomain } });

    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/domains/${domainId}/domain.yaml`,
      contents: stringify(updatedDomain),
    });
  },

  removeEventWiring: async (domainId, type, index) => {
    const { projectPath, domainConfigs } = get();
    if (!projectPath) throw new Error('No project loaded');
    const domain = domainConfigs[domainId];
    if (!domain) throw new Error(`Domain ${domainId} not found`);

    const key = type === 'publish' ? 'publishes_events' : 'consumes_events';
    const updatedDomain: DomainConfig = {
      ...domain,
      [key]: domain[key].filter((_, i) => i !== index),
    };
    set({ domainConfigs: { ...domainConfigs, [domainId]: updatedDomain } });

    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/domains/${domainId}/domain.yaml`,
      contents: stringify(updatedDomain),
    });
  },

  addEventArrow: async (sourceDomainId, targetDomainId, eventName, fromFlow?, handledByFlow?, description?) => {
    const { addEventWiring } = get();
    await addEventWiring(sourceDomainId, 'publish', {
      event: eventName,
      from_flow: fromFlow,
      description,
    });
    await addEventWiring(targetDomainId, 'consume', {
      event: eventName,
      handled_by_flow: handledByFlow,
      description,
    });
  },

  autoLayoutDomains: () => {
    const { domainConfigs, systemLayout, projectPath } = get();
    const domainIds = Object.keys(domainConfigs);
    if (domainIds.length === 0) return;

    const newLayout = generateAutoLayout(domainIds);
    const updated: SystemLayout = { ...systemLayout, domains: newLayout.domains };
    set({ systemLayout: updated });

    // Debounce save
    if (saveLayoutTimer) clearTimeout(saveLayoutTimer);
    saveLayoutTimer = setTimeout(async () => {
      if (!projectPath) return;
      try {
        markWriting();
        await invoke('write_file', {
          path: `${projectPath}/specs/system-layout.yaml`,
          contents: stringify(get().systemLayout),
        });
      } catch {
        // Silent
      }
    }, 500);
  },

  autoLayoutFlows: (domainId) => {
    const { domainConfigs, projectPath } = get();
    const domain = domainConfigs[domainId];
    if (!domain) return;

    const flowIds = domain.flows.map((f) => f.id);
    const flowPositions = generateFlowAutoLayout(flowIds);

    // Portals offset to the right of flows
    const FLOW_GRID_COLS = 3;
    const FLOW_H_SPACING = 320;
    const portalKeys = Object.keys(domain.layout?.portals ?? {});
    const portalPositions: Record<string, Position> = {};
    const portalAutoLayout = generateFlowAutoLayout(portalKeys);
    portalKeys.forEach((id) => {
      const base = portalAutoLayout[id] ?? { x: 0, y: 0 };
      portalPositions[id] = {
        x: base.x + (flowIds.length > 0 ? FLOW_H_SPACING * Math.min(flowIds.length, FLOW_GRID_COLS) : 0),
        y: base.y,
      };
    });

    const updatedDomain: DomainConfig = {
      ...domain,
      layout: {
        flows: flowPositions,
        portals: portalPositions,
      },
    };
    const updatedConfigs = { ...domainConfigs, [domainId]: updatedDomain };
    set({ domainConfigs: updatedConfigs });

    // Debounce save
    if (domainSaveTimers[domainId]) clearTimeout(domainSaveTimers[domainId]);
    domainSaveTimers[domainId] = setTimeout(async () => {
      if (!projectPath) return;
      try {
        markWriting();
        await invoke('write_file', {
          path: `${projectPath}/specs/domains/${domainId}/domain.yaml`,
          contents: stringify(get().domainConfigs[domainId]),
        });
      } catch {
        // Silent
      }
    }, 500);
  },

  reloadProject: async () => {
    const { projectPath, loadProject } = get();
    if (!projectPath) return;
    await loadProject(projectPath);
  },

  reset: () => {
    if (saveLayoutTimer) clearTimeout(saveLayoutTimer);
    for (const timer of Object.values(domainSaveTimers)) clearTimeout(timer);
    for (const key of Object.keys(domainSaveTimers)) delete domainSaveTimers[key];
    set({
      projectPath: null,
      domainConfigs: {},
      systemLayout: { domains: {} },
      loading: false,
      loaded: false,
    });
  },
}));
