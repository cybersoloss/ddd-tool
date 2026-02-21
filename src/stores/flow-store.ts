import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { stringify, parse } from 'yaml';
import { nanoid } from 'nanoid';
import { markWriting } from './write-guard';
import type {
  FlowDocument,
  DddFlowNode,
  DddNodeType,
  NodeSpec,
} from '../types/flow';
import type { Position } from '../types/sheet';
import { computeDagLayout } from '../utils/auto-layout';
import { defaultSpec, defaultLabel, normalizeFlowDocument } from '../utils/flow-normalizer';

// --- Skip-undo flag (used by undo-store to prevent loops) ---
let _skipUndo = false;
export function setSkipUndo(v: boolean) { _skipUndo = v; }
export function getSkipUndo() { return _skipUndo; }

interface FlowState {
  currentFlow: FlowDocument | null;
  domainId: string | null;
  projectPath: string | null;
  selectedNodeId: string | null;
  loading: boolean;

  loadFlow: (domainId: string, flowId: string, projectPath: string, flowType?: 'traditional' | 'agent') => Promise<void>;
  unloadFlow: () => void;
  restoreFlow: (doc: FlowDocument) => void;
  addNode: (type: DddNodeType, position: Position, parentId?: string) => void;
  moveNode: (nodeId: string, position: Position) => void;
  deleteNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  addConnection: (sourceNodeId: string, targetNodeId: string, sourceHandle?: string, targetHandle?: string) => void;
  removeConnection: (sourceNodeId: string, targetNodeId: string, sourceHandle?: string) => void;
  updateNodeSpec: (nodeId: string, spec: NodeSpec) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  reparentNode: (nodeId: string, parentId: string | undefined) => void;
  autoLayout: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

// Undo integration: registered lazily to avoid circular imports
let _pushSnapshotFn: ((flowId: string, description: string) => void) | null = null;
let _clearFlowUndoFn: ((flowId: string) => void) | null = null;
export function registerUndoPush(fn: (flowId: string, description: string) => void) {
  _pushSnapshotFn = fn;
}
export function registerUndoClear(fn: (flowId: string) => void) {
  _clearFlowUndoFn = fn;
}

function pushUndo(flowId: string, description: string) {
  if (_skipUndo || !_pushSnapshotFn) return;
  _pushSnapshotFn(flowId, description);
}

function createDefaultFlow(domainId: string, flowId: string, flowName: string, flowType: 'traditional' | 'agent' = 'traditional'): FlowDocument {
  const now = new Date().toISOString();
  const doc: FlowDocument = {
    flow: {
      id: flowId,
      name: flowName,
      type: flowType,
      domain: domainId,
    },
    trigger: {
      id: 'trigger-' + nanoid(8),
      type: 'trigger',
      position: { x: 250, y: 50 },
      connections: [],
      spec: defaultSpec('trigger'),
      label: 'Trigger',
    },
    nodes: [],
    metadata: {
      created: now,
      modified: now,
    },
  };

  // Agent flows get a pre-placed agent_loop node
  if (flowType === 'agent') {
    const agentNode: DddFlowNode = {
      id: 'agent_loop-' + nanoid(8),
      type: 'agent_loop',
      position: { x: 200, y: 200 },
      connections: [],
      spec: defaultSpec('agent_loop'),
      label: 'Agent Loop',
    };
    doc.nodes.push(agentNode);
    doc.trigger.connections.push({ targetNodeId: agentNode.id });
  }

  return doc;
}

// Re-export for backward compatibility
export { normalizeFlowDocument } from '../utils/flow-normalizer';

function getFlowPath(projectPath: string, domainId: string, flowId: string): string {
  return `${projectPath}/specs/domains/${domainId}/flows/${flowId}.yaml`;
}

function getAutoSavePath(projectPath: string, flowId: string): string {
  return `${projectPath}/.ddd/autosave/${flowId}.yaml`;
}

function debouncedSave(state: FlowState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { currentFlow, domainId, projectPath } = state;
    if (!currentFlow || !currentFlow.flow || !domainId || !projectPath) return;

    const updated: FlowDocument = {
      ...currentFlow,
      metadata: { ...(currentFlow.metadata ?? {}), modified: new Date().toISOString() },
    };

    try {
      markWriting();
      await invoke('write_file', {
        path: getFlowPath(projectPath, domainId, currentFlow.flow?.id ?? ''),
        contents: stringify(updated),
      });
    } catch {
      // Silent — save is best-effort
    }
  }, 500);
}

// Lazily-bound reference to app-store to avoid circular imports
let _getAutoSaveInterval: (() => number) | null = null;
export function registerAutoSaveIntervalGetter(fn: () => number) {
  _getAutoSaveInterval = fn;
}

function startAutoSave(_projectPath: string, flowId: string) {
  stopAutoSave();
  const intervalSec = _getAutoSaveInterval ? _getAutoSaveInterval() : 30;

  autoSaveTimer = setInterval(async () => {
    const state = useFlowStore.getState();
    if (!state.currentFlow || !state.projectPath) return;
    try {
      markWriting();
      await invoke('write_file', {
        path: getAutoSavePath(state.projectPath, flowId),
        contents: stringify(state.currentFlow),
      });
    } catch {
      // Silent
    }
  }, intervalSec * 1000);
}

function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

async function cleanupAutoSave(projectPath: string, flowId: string) {
  try {
    await invoke('delete_file', { path: getAutoSavePath(projectPath, flowId) });
  } catch {
    // Silent
  }
}

export const useFlowStore = create<FlowState>((set, get) => ({
  currentFlow: null,
  domainId: null,
  projectPath: null,
  selectedNodeId: null,
  loading: false,

  loadFlow: async (domainId, flowId, projectPath, flowType?) => {
    set({ loading: true, domainId, projectPath, selectedNodeId: null });

    const flowPath = getFlowPath(projectPath, domainId, flowId);

    try {
      const exists: boolean = await invoke('path_exists', { path: flowPath });
      if (exists) {
        const content: string = await invoke('read_file', { path: flowPath });
        const raw = parse(content) as Record<string, unknown>;
        const doc = normalizeFlowDocument(raw, domainId, flowId, flowType);
        set({ currentFlow: doc, loading: false });
      } else {
        // Create default flow document
        const doc = createDefaultFlow(domainId, flowId, flowId, flowType);
        markWriting();
        await invoke('write_file', {
          path: flowPath,
          contents: stringify(doc),
        });
        set({ currentFlow: doc, loading: false });
      }
    } catch {
      // Fallback: create default
      const doc = createDefaultFlow(domainId, flowId, flowId, flowType);
      set({ currentFlow: doc, loading: false });
    }

    // Start auto-save interval
    startAutoSave(projectPath, flowId);
  },

  unloadFlow: () => {
    if (saveTimer) clearTimeout(saveTimer);
    const { projectPath, currentFlow } = get();
    if (projectPath && currentFlow && currentFlow.flow) {
      cleanupAutoSave(projectPath, currentFlow.flow.id);
      // Clear undo/redo stacks for this flow
      if (_clearFlowUndoFn) _clearFlowUndoFn(currentFlow.flow.id);
    }
    stopAutoSave();
    set({
      currentFlow: null,
      domainId: null,
      projectPath: null,
      selectedNodeId: null,
      loading: false,
    });
  },

  restoreFlow: (doc) => {
    set({ currentFlow: doc });
    debouncedSave(get());
  },

  addNode: (type, position, parentId?) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', `Add ${defaultLabel(type)} node`);

    const node: DddFlowNode = {
      id: type + '-' + nanoid(8),
      type,
      position,
      connections: [],
      spec: defaultSpec(type),
      label: defaultLabel(type),
      parentId,
    };

    const updated: FlowDocument = {
      ...currentFlow,
      nodes: [...currentFlow.nodes, node],
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },

  moveNode: (nodeId, position) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Move node');

    // Check trigger
    if (currentFlow.trigger.id === nodeId) {
      const updated: FlowDocument = {
        ...currentFlow,
        trigger: { ...currentFlow.trigger, position },
      };
      set({ currentFlow: updated });
      debouncedSave(get());
      return;
    }

    // Check nodes
    const updated: FlowDocument = {
      ...currentFlow,
      nodes: currentFlow.nodes.map((n) =>
        n.id === nodeId ? { ...n, position } : n
      ),
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },

  deleteNode: (nodeId) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    // Cannot delete the trigger node
    if (currentFlow.trigger.id === nodeId) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Delete node');

    // Remove node and clean up any connections referencing it
    // If deleting a loop node, clear parentId on children
    const updated: FlowDocument = {
      ...currentFlow,
      trigger: {
        ...currentFlow.trigger,
        connections: (currentFlow.trigger?.connections ?? []).filter(
          (c) => c.targetNodeId !== nodeId
        ),
      },
      nodes: (currentFlow.nodes ?? [])
        .filter((n) => n.id !== nodeId)
        .map((n) => ({
          ...n,
          connections: (n.connections ?? []).filter((c) => c.targetNodeId !== nodeId),
          parentId: n.parentId === nodeId ? undefined : n.parentId,
        })),
    };
    set({ currentFlow: updated, selectedNodeId: null });
    debouncedSave(get());
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  addConnection: (sourceNodeId, targetNodeId, sourceHandle?, targetHandle?) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Add connection');

    const conn = { targetNodeId, sourceHandle, targetHandle };

    if (currentFlow.trigger.id === sourceNodeId) {
      const updated: FlowDocument = {
        ...currentFlow,
        trigger: {
          ...currentFlow.trigger,
          connections: [...(currentFlow.trigger?.connections ?? []), conn],
        },
      };
      set({ currentFlow: updated });
      debouncedSave(get());
      return;
    }

    const updated: FlowDocument = {
      ...currentFlow,
      nodes: (currentFlow.nodes ?? []).map((n) =>
        n.id === sourceNodeId
          ? { ...n, connections: [...(n.connections ?? []), conn] }
          : n
      ),
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },

  removeConnection: (sourceNodeId, targetNodeId, sourceHandle?) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Remove connection');

    const matchConn = (c: { targetNodeId: string; sourceHandle?: string }) =>
      !(c.targetNodeId === targetNodeId && c.sourceHandle === sourceHandle);

    if (currentFlow.trigger.id === sourceNodeId) {
      const updated: FlowDocument = {
        ...currentFlow,
        trigger: {
          ...currentFlow.trigger,
          connections: (currentFlow.trigger?.connections ?? []).filter(matchConn),
        },
      };
      set({ currentFlow: updated });
      debouncedSave(get());
      return;
    }

    const updated: FlowDocument = {
      ...currentFlow,
      nodes: (currentFlow.nodes ?? []).map((n) =>
        n.id === sourceNodeId
          ? { ...n, connections: (n.connections ?? []).filter(matchConn) }
          : n
      ),
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },

  updateNodeSpec: (nodeId, spec) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Update spec');

    if (currentFlow.trigger.id === nodeId) {
      const updated: FlowDocument = {
        ...currentFlow,
        trigger: { ...currentFlow.trigger, spec },
      };
      set({ currentFlow: updated });
      debouncedSave(get());
      return;
    }

    const updated: FlowDocument = {
      ...currentFlow,
      nodes: currentFlow.nodes.map((n) =>
        n.id === nodeId ? { ...n, spec } : n
      ),
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },

  updateNodeLabel: (nodeId, label) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Update label');

    if (currentFlow.trigger.id === nodeId) {
      const updated: FlowDocument = {
        ...currentFlow,
        trigger: { ...currentFlow.trigger, label },
      };
      set({ currentFlow: updated });
      debouncedSave(get());
      return;
    }

    const updated: FlowDocument = {
      ...currentFlow,
      nodes: currentFlow.nodes.map((n) =>
        n.id === nodeId ? { ...n, label } : n
      ),
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },

  reparentNode: (nodeId, parentId) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Reparent node');

    const updated: FlowDocument = {
      ...currentFlow,
      nodes: currentFlow.nodes.map((n) =>
        n.id === nodeId ? { ...n, parentId } : n
      ),
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },

  autoLayout: () => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Auto layout');

    const positions = computeDagLayout(currentFlow);

    const triggerPos = positions.get(currentFlow.trigger.id);
    const updated: FlowDocument = {
      ...currentFlow,
      trigger: {
        ...currentFlow.trigger,
        position: triggerPos ?? currentFlow.trigger.position,
      },
      nodes: currentFlow.nodes.map((n) => {
        const pos = positions.get(n.id);
        return pos ? { ...n, position: pos } : n;
      }),
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },
}));
