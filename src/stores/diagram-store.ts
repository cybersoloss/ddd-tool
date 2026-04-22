import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { stringify, parse } from 'yaml';
import { nanoid } from 'nanoid';
import { markWriting } from './write-guard';
import type {
  DiagramDocument,
  DiagramMeta,
  DiagramNode,
  DiagramEdge,
  DiagramTextBox,
  DiagramNodeShape,
  DiagramNodeStyle,
} from '../types/diagram';

interface DiagramState {
  diagrams: DiagramMeta[];
  currentDiagram: DiagramDocument | null;
  currentDiagramId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  loaded: boolean;

  // Flow: load-diagram-list
  loadDiagramList: (projectPath: string) => Promise<void>;
  // Flow: load-diagram
  loadDiagram: (projectPath: string, diagramId: string) => Promise<void>;
  // Flow: save-diagram
  saveDiagram: (projectPath: string) => Promise<void>;
  // Flow: create-diagram
  createDiagram: (projectPath: string, name: string, description?: string) => Promise<string>;
  // Duplicate entire diagram
  duplicateDiagram: (projectPath: string, diagramId: string) => Promise<string>;
  // Flow: delete-diagram
  deleteDiagram: (projectPath: string, diagramId: string) => Promise<void>;
  // Flow: rename-diagram
  renameDiagram: (name: string, description?: string) => void;
  // Flow: add-diagram-node
  addNode: (shape: DiagramNodeShape, position: { x: number; y: number }) => void;
  // Flow: add-diagram-edge
  addEdge: (from: string, to: string, fromHandle?: string, toHandle?: string) => void;
  // Flow: add-text-box
  addTextBox: (position: { x: number; y: number }) => void;
  // Flow: update-diagram-node
  updateNode: (nodeId: string, updates: Partial<Omit<DiagramNode, 'id'>>) => void;
  // Flow: update-diagram-edge
  updateEdge: (edgeId: string, updates: Partial<Omit<DiagramEdge, 'id'>>) => void;

  // Helpers
  updateTextBox: (textBoxId: string, updates: Partial<Omit<DiagramTextBox, 'id'>>) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  deleteTextBox: (textBoxId: string) => void;
  moveNode: (nodeId: string, position: { x: number; y: number }) => void;
  moveTextBox: (textBoxId: string, position: { x: number; y: number }) => void;
  unloadDiagram: () => void;
  reset: () => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  diagrams: [],
  currentDiagram: null,
  currentDiagramId: null,
  isDirty: false,
  isSaving: false,
  loaded: false,

  loadDiagramList: async (projectPath) => {
    const diagramsDir = `${projectPath}/specs/diagrams`;
    let files: string[] = [];

    try {
      const exists: boolean = await invoke('path_exists', { path: diagramsDir });
      if (!exists) {
        set({ diagrams: [], loaded: true });
        return;
      }
      files = await invoke('list_directory', { path: diagramsDir });
    } catch {
      set({ diagrams: [], loaded: true });
      return;
    }

    const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
    if (yamlFiles.length === 0) {
      set({ diagrams: [], loaded: true });
      return;
    }

    const metas: DiagramMeta[] = [];
    for (const file of yamlFiles) {
      try {
        const content: string = await invoke('read_file', {
          path: `${diagramsDir}/${file}`,
        });
        const parsed = parse(content) as DiagramDocument | null;
        if (!parsed || !parsed.name) continue;
        const id = file.replace(/\.ya?ml$/, '');
        metas.push({
          id,
          name: parsed.name,
          description: parsed.description,
          tags: parsed.tags,
        });
      } catch {
        // Skip unparseable files
      }
    }

    set({ diagrams: metas, loaded: true });
  },

  loadDiagram: async (projectPath, diagramId) => {
    const filePath = `${projectPath}/specs/diagrams/${diagramId}.yaml`;
    try {
      const content: string = await invoke('read_file', { path: filePath });
      const parsed = parse(content) as DiagramDocument | null;
      if (!parsed) throw new Error('Failed to parse diagram YAML');

      // Ensure arrays exist
      if (!Array.isArray(parsed.nodes)) parsed.nodes = [];
      if (!Array.isArray(parsed.edges)) parsed.edges = [];
      if (!Array.isArray(parsed.text_boxes)) parsed.text_boxes = [];

      // Assign IDs to edges missing them (backward compat)
      for (const edge of parsed.edges) {
        if (!edge.id) {
          edge.id = `edge-${nanoid(8)}`;
        }
      }

      set({
        currentDiagram: parsed,
        currentDiagramId: diagramId,
        isDirty: false,
      });
    } catch (e) {
      throw new Error(`Failed to load diagram: ${e}`);
    }
  },

  saveDiagram: async (projectPath) => {
    const { currentDiagram, currentDiagramId } = get();
    if (!currentDiagram || !currentDiagramId) return;

    set({ isSaving: true });
    try {
      // Update modified timestamp
      const updated: DiagramDocument = {
        ...currentDiagram,
        metadata: {
          ...currentDiagram.metadata,
          modified: new Date().toISOString(),
        },
      };

      const yamlContent = stringify(updated, { lineWidth: 120 });
      const diagramsDir = `${projectPath}/specs/diagrams`;
      const filePath = `${diagramsDir}/${currentDiagramId}.yaml`;

      markWriting();
      // Ensure directory exists before writing
      try {
        const exists: boolean = await invoke('path_exists', { path: diagramsDir });
        if (!exists) await invoke('create_directory', { path: diagramsDir });
      } catch { /* ignore */ }
      await invoke('write_file', { path: filePath, contents: yamlContent });

      set({
        currentDiagram: updated,
        isDirty: false,
        isSaving: false,
      });
    } catch (e) {
      set({ isSaving: false });
      throw new Error(`Failed to save diagram: ${e}`);
    }
  },

  createDiagram: async (projectPath, name, description) => {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const now = new Date().toISOString();

    const doc: DiagramDocument = {
      name,
      description: description || undefined,
      tags: [],
      nodes: [],
      edges: [],
      text_boxes: [],
      metadata: { created: now, modified: now },
    };

    const yamlContent = stringify(doc, { lineWidth: 120 });
    const diagramsDir = `${projectPath}/specs/diagrams`;
    const filePath = `${diagramsDir}/${id}.yaml`;

    // Ensure specs/diagrams/ directory exists
    markWriting();
    try {
      const exists: boolean = await invoke('path_exists', { path: diagramsDir });
      if (!exists) await invoke('create_directory', { path: diagramsDir });
    } catch { /* directory may already exist */ }
    await invoke('write_file', { path: filePath, contents: yamlContent });

    const meta: DiagramMeta = { id, name, description };
    set((s) => ({
      diagrams: [...s.diagrams, meta],
      currentDiagram: doc,
      currentDiagramId: id,
      isDirty: false,
    }));

    return id;
  },

  duplicateDiagram: async (projectPath, diagramId) => {
    const filePath = `${projectPath}/specs/diagrams/${diagramId}.yaml`;
    try {
      const content: string = await invoke('read_file', { path: filePath });
      const parsed = parse(content) as DiagramDocument | null;
      if (!parsed) throw new Error('Failed to parse');

      const newName = `${parsed.name} (copy)`;
      const newId = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const now = new Date().toISOString();

      // Deep clone with new IDs for nodes
      const doc: DiagramDocument = {
        ...structuredClone(parsed),
        name: newName,
        metadata: { created: now, modified: now },
      };
      // Regenerate node IDs
      const idMap = new Map<string, string>();
      for (const n of doc.nodes) {
        const newNodeId = `node-${nanoid(8)}`;
        idMap.set(n.id, newNodeId);
        n.id = newNodeId;
      }
      // Remap edge references
      for (const e of doc.edges) {
        e.id = `edge-${nanoid(8)}`;
        e.from = idMap.get(e.from) || e.from;
        e.to = idMap.get(e.to) || e.to;
      }
      // Remap text box IDs
      for (const t of doc.text_boxes || []) {
        t.id = `text-${nanoid(8)}`;
      }

      const yamlContent = stringify(doc, { lineWidth: 120 });
      const diagramsDir = `${projectPath}/specs/diagrams`;
      const newFilePath = `${diagramsDir}/${newId}.yaml`;
      markWriting();
      try {
        const exists: boolean = await invoke('path_exists', { path: diagramsDir });
        if (!exists) await invoke('create_directory', { path: diagramsDir });
      } catch { /* ignore */ }
      await invoke('write_file', { path: newFilePath, contents: yamlContent });

      const meta: DiagramMeta = { id: newId, name: newName, description: parsed.description };
      set((s) => ({ diagrams: [...s.diagrams, meta] }));
      return newId;
    } catch (e) {
      throw new Error(`Failed to duplicate: ${e}`);
    }
  },

  deleteDiagram: async (projectPath, diagramId) => {
    const filePath = `${projectPath}/specs/diagrams/${diagramId}.yaml`;

    markWriting();
    await invoke('delete_file', { path: filePath });

    set((s) => ({
      diagrams: s.diagrams.filter((d) => d.id !== diagramId),
      currentDiagram: s.currentDiagramId === diagramId ? null : s.currentDiagram,
      currentDiagramId: s.currentDiagramId === diagramId ? null : s.currentDiagramId,
      isDirty: s.currentDiagramId === diagramId ? false : s.isDirty,
    }));
  },

  renameDiagram: (name, description) => {
    const { currentDiagram, currentDiagramId } = get();
    if (!currentDiagram || !currentDiagramId) return;

    const updated: DiagramDocument = {
      ...currentDiagram,
      name,
      description: description ?? currentDiagram.description,
    };

    set((s) => ({
      currentDiagram: updated,
      isDirty: true,
      diagrams: s.diagrams.map((d) =>
        d.id === currentDiagramId ? { ...d, name, description: description ?? d.description } : d,
      ),
    }));
  },

  addNode: (shape, position) => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;

    // Apply last-used style if available, otherwise default
    let style = defaultStyleForShape(shape);
    let color_group: string | undefined;
    let layout_type: import('../types/diagram').DiagramLayoutType | undefined;
    try {
      const saved = localStorage.getItem('ddd-diagram-last-style');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.style) style = { ...style, ...parsed.style };
        if (parsed.color_group) color_group = parsed.color_group;
        if (parsed.layout_type) layout_type = parsed.layout_type;
      }
    } catch { /* ignore */ }

    const node: DiagramNode = {
      id: `node-${nanoid(8)}`,
      label: shapeLabel(shape),
      shape,
      position,
      style,
      color_group,
      layout_type,
    };

    set({
      currentDiagram: {
        ...currentDiagram,
        nodes: [...currentDiagram.nodes, node],
      },
      isDirty: true,
    });
  },

  addEdge: (from, to, fromHandle?, toHandle?) => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;

    const edge: DiagramEdge = {
      id: `edge-${nanoid(8)}`,
      from,
      to,
      fromHandle: fromHandle || undefined,
      toHandle: toHandle || undefined,
      direction: 'one-way',
      style: 'solid',
      labels: [],
    };

    set({
      currentDiagram: {
        ...currentDiagram,
        edges: [...currentDiagram.edges, edge],
      },
      isDirty: true,
    });
  },

  addTextBox: (position) => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;

    const textBox: DiagramTextBox = {
      id: `text-${nanoid(8)}`,
      position,
      text: 'New text',
      style: { size: 'medium' },
    };

    set({
      currentDiagram: {
        ...currentDiagram,
        text_boxes: [...(currentDiagram.text_boxes || []), textBox],
      },
      isDirty: true,
    });
  },

  updateNode: (nodeId, updates) => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;

    // Remember last-used style for new shapes
    if (updates.style || updates.color_group !== undefined || updates.layout_type !== undefined) {
      try {
        const existing = JSON.parse(localStorage.getItem('ddd-diagram-last-style') || '{}');
        if (updates.style) existing.style = { ...existing.style, ...updates.style };
        if (updates.color_group !== undefined) existing.color_group = updates.color_group || undefined;
        if (updates.layout_type !== undefined) existing.layout_type = updates.layout_type || undefined;
        localStorage.setItem('ddd-diagram-last-style', JSON.stringify(existing));
      } catch { /* ignore */ }
    }

    set({
      currentDiagram: {
        ...currentDiagram,
        nodes: currentDiagram.nodes.map((n) =>
          n.id === nodeId ? { ...n, ...updates } : n,
        ),
      },
      isDirty: true,
    });
  },

  updateEdge: (edgeId, updates) => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;

    set({
      currentDiagram: {
        ...currentDiagram,
        edges: currentDiagram.edges.map((e) =>
          e.id === edgeId ? { ...e, ...updates } : e,
        ),
      },
      isDirty: true,
    });
  },

  updateTextBox: (textBoxId, updates) => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;

    set({
      currentDiagram: {
        ...currentDiagram,
        text_boxes: (currentDiagram.text_boxes || []).map((t) =>
          t.id === textBoxId ? { ...t, ...updates } : t,
        ),
      },
      isDirty: true,
    });
  },

  deleteNode: (nodeId) => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;

    set({
      currentDiagram: {
        ...currentDiagram,
        nodes: currentDiagram.nodes.filter((n) => n.id !== nodeId),
        // Also remove edges connected to this node
        edges: currentDiagram.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
      },
      isDirty: true,
    });
  },

  deleteEdge: (edgeId) => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;

    set({
      currentDiagram: {
        ...currentDiagram,
        edges: currentDiagram.edges.filter((e) => e.id !== edgeId),
      },
      isDirty: true,
    });
  },

  deleteTextBox: (textBoxId) => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;

    set({
      currentDiagram: {
        ...currentDiagram,
        text_boxes: (currentDiagram.text_boxes || []).filter((t) => t.id !== textBoxId),
      },
      isDirty: true,
    });
  },

  moveNode: (nodeId, position) => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;

    set({
      currentDiagram: {
        ...currentDiagram,
        nodes: currentDiagram.nodes.map((n) =>
          n.id === nodeId ? { ...n, position } : n,
        ),
      },
      isDirty: true,
    });
  },

  moveTextBox: (textBoxId, position) => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;

    set({
      currentDiagram: {
        ...currentDiagram,
        text_boxes: (currentDiagram.text_boxes || []).map((t) =>
          t.id === textBoxId ? { ...t, position } : t,
        ),
      },
      isDirty: true,
    });
  },

  unloadDiagram: () => {
    set({ currentDiagram: null, currentDiagramId: null, isDirty: false });
  },

  reset: () => {
    set({
      diagrams: [],
      currentDiagram: null,
      currentDiagramId: null,
      isDirty: false,
      isSaving: false,
      loaded: false,
    });
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function shapeLabel(shape: DiagramNodeShape): string {
  switch (shape) {
    case 'rectangle': return 'Box';
    case 'rounded-rectangle': return 'Rounded';
    case 'cylinder': return 'Database';
    case 'diamond': return 'Decision';
    case 'circle': return 'Circle';
    case 'hexagon': return 'Hexagon';
    case 'cloud': return 'Cloud';
    case 'person': return 'Actor';
    case 'document': return 'Document';
    case 'folder': return 'Folder';
    case 'stack': return 'Stack';
    case 'custom': return 'Custom';
  }
}

function defaultStyleForShape(shape: DiagramNodeShape): DiagramNodeStyle {
  switch (shape) {
    case 'person':
      return { fill_color: '#e0f2fe', border_color: '#0284c7' };
    case 'cylinder':
      return { fill_color: '#fef3c7', border_color: '#d97706' };
    case 'cloud':
      return { fill_color: '#f3e8ff', border_color: '#7c3aed' };
    case 'diamond':
      return { fill_color: '#fce7f3', border_color: '#db2777' };
    default:
      return { fill_color: '#f8fafc', border_color: '#64748b' };
  }
}
