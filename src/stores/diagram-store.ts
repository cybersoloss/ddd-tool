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
  DiagramSheet,
} from '../types/diagram';
import { getSheetContent, setSheetContent } from '../types/diagram';

const MAX_UNDO = 50;

interface DiagramState {
  diagrams: DiagramMeta[];
  currentDiagram: DiagramDocument | null;
  currentDiagramId: string | null;
  currentSheetIndex: number;
  isDirty: boolean;
  isSaving: boolean;
  loaded: boolean;
  _undoStack: DiagramDocument[];
  _redoStack: DiagramDocument[];

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
  undo: () => void;
  redo: () => void;
  unloadDiagram: () => void;
  reset: () => void;

  // Flow: add-sheet
  addSheet: () => void;
  // Flow: rename-sheet
  renameSheet: (sheetIndex: number, name: string) => void;
  // Flow: delete-sheet
  deleteSheet: (sheetIndex: number) => void;
  // Flow: switch-sheet
  switchSheet: (sheetIndex: number) => void;
  // Flow: reorder-sheets
  reorderSheets: (fromIndex: number, toIndex: number) => void;
  // Flow: duplicate-sheet
  duplicateSheet: () => void;
}

function pushUndo(get: () => DiagramState, set: (partial: Partial<DiagramState>) => void) {
  const { currentDiagram, _undoStack } = get();
  if (!currentDiagram) return;
  set({
    _undoStack: [..._undoStack, structuredClone(currentDiagram)].slice(-MAX_UNDO),
    _redoStack: [], // clear redo on new action
  });
}

/**
 * BFS over outgoing edges to collect all descendant node IDs (excluding the root).
 * Cycle-safe via a visited set.
 */
function collectDescendants(rootId: string, edges: DiagramEdge[]): Set<string> {
  const descendants = new Set<string>();
  const visited = new Set<string>([rootId]);
  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.from === current && !visited.has(edge.to)) {
        visited.add(edge.to);
        descendants.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  return descendants;
}

/** Ensure diagram has sheets[] — migrates legacy single-sheet format */
function ensureSheets(doc: DiagramDocument): DiagramDocument {
  if (doc.sheets && doc.sheets.length > 0) return doc;
  return {
    ...doc,
    sheets: [{
      id: nanoid(8),
      name: 'Sheet 1',
      nodes: doc.nodes || [],
      edges: doc.edges || [],
      text_boxes: doc.text_boxes || [],
    }],
    nodes: [],
    edges: [],
    text_boxes: [],
  };
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  diagrams: [],
  currentDiagram: null,
  currentDiagramId: null,
  currentSheetIndex: 0,
  isDirty: false,
  _undoStack: [],
  _redoStack: [],
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
          sheetCount: parsed.sheets ? parsed.sheets.length : 1,
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

      // Ensure top-level arrays exist (backward compat)
      if (!Array.isArray(parsed.nodes)) parsed.nodes = [];
      if (!Array.isArray(parsed.edges)) parsed.edges = [];
      if (!Array.isArray(parsed.text_boxes)) parsed.text_boxes = [];

      // Ensure sheet arrays exist
      if (parsed.sheets) {
        for (const sheet of parsed.sheets) {
          if (!Array.isArray(sheet.nodes)) sheet.nodes = [];
          if (!Array.isArray(sheet.edges)) sheet.edges = [];
          if (!Array.isArray(sheet.text_boxes)) sheet.text_boxes = [];
        }
      }

      // Assign IDs to edges missing them (backward compat)
      const fixEdgeIds = (edges: DiagramEdge[]) => {
        for (const edge of edges) {
          if (!edge.id) edge.id = `edge-${nanoid(8)}`;
        }
      };
      fixEdgeIds(parsed.edges);
      if (parsed.sheets) {
        for (const sheet of parsed.sheets) {
          fixEdgeIds(sheet.edges);
        }
      }

      set({
        currentDiagram: parsed,
        currentDiagramId: diagramId,
        currentSheetIndex: 0,
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

      // When saving with sheets, omit top-level nodes/edges/text_boxes if empty
      const toSerialize = { ...updated };
      if (toSerialize.sheets && toSerialize.sheets.length > 0) {
        toSerialize.nodes = [];
        toSerialize.edges = [];
        toSerialize.text_boxes = [];
      }

      const yamlContent = stringify(toSerialize, { lineWidth: 120 });
      const diagramsDir = `${projectPath}/specs/diagrams`;
      const filePath = `${diagramsDir}/${currentDiagramId}.yaml`;

      markWriting();
      try {
        await invoke('write_file', { path: filePath, contents: yamlContent });
      } catch (writeErr) {
        console.error('Failed to save diagram:', filePath, writeErr);
        throw writeErr;
      }

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
      sheets: [{
        id: nanoid(8),
        name: 'Sheet 1',
        nodes: [],
        edges: [],
        text_boxes: [],
      }],
      metadata: { created: now, modified: now },
    };

    const yamlContent = stringify(doc, { lineWidth: 120 });
    const diagramsDir = `${projectPath}/specs/diagrams`;
    const filePath = `${diagramsDir}/${id}.yaml`;

    markWriting();
    try {
      await invoke('write_file', { path: filePath, contents: yamlContent });
    } catch (writeErr) {
      console.error('[diagram] write_file FAILED:', filePath, writeErr);
      throw writeErr;
    }

    const meta: DiagramMeta = { id, name, description, sheetCount: 1 };
    set((s) => ({
      diagrams: [...s.diagrams, meta],
      currentDiagram: doc,
      currentDiagramId: id,
      currentSheetIndex: 0,
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

      const doc: DiagramDocument = {
        ...structuredClone(parsed),
        name: newName,
        metadata: { created: now, modified: now },
      };

      // Regenerate IDs for all content (top-level and sheets)
      const remapContent = (nodes: DiagramNode[], edges: DiagramEdge[], textBoxes: DiagramTextBox[]) => {
        const idMap = new Map<string, string>();
        for (const n of nodes) {
          const newNodeId = `node-${nanoid(8)}`;
          idMap.set(n.id, newNodeId);
          n.id = newNodeId;
        }
        for (const e of edges) {
          e.id = `edge-${nanoid(8)}`;
          e.from = idMap.get(e.from) || e.from;
          e.to = idMap.get(e.to) || e.to;
        }
        for (const t of textBoxes) {
          t.id = `text-${nanoid(8)}`;
        }
      };

      remapContent(doc.nodes, doc.edges, doc.text_boxes || []);
      if (doc.sheets) {
        for (const sheet of doc.sheets) {
          sheet.id = nanoid(8);
          remapContent(sheet.nodes, sheet.edges, sheet.text_boxes || []);
        }
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

      const meta: DiagramMeta = {
        id: newId,
        name: newName,
        description: parsed.description,
        sheetCount: doc.sheets ? doc.sheets.length : 1,
      };
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
      currentSheetIndex: s.currentDiagramId === diagramId ? 0 : s.currentSheetIndex,
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

  // ─── Content-mutating methods (sheet-aware) ────────────────────────────

  addNode: (shape, position) => {
    pushUndo(get, set);
    const { currentDiagram, currentSheetIndex } = get();
    if (!currentDiagram) return;

    let style = defaultStyleForShape(shape);
    let color_group: string | undefined;
    let layout_type: import('../types/diagram').DiagramLayoutType | undefined;
    let branch_orientation: import('../types/diagram').DiagramBranchOrientation | undefined;
    try {
      const saved = localStorage.getItem('ddd-diagram-last-style');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.style) style = { ...style, ...parsed.style };
        if (parsed.color_group) color_group = parsed.color_group;
        if (parsed.layout_type) layout_type = parsed.layout_type;
        if (parsed.branch_orientation) branch_orientation = parsed.branch_orientation;
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
      branch_orientation,
    };

    const { nodes } = getSheetContent(currentDiagram, currentSheetIndex);
    set({
      currentDiagram: setSheetContent(currentDiagram, currentSheetIndex, {
        nodes: [...nodes, node],
      }),
      isDirty: true,
    });
  },

  addEdge: (from, to, fromHandle?, toHandle?) => {
    pushUndo(get, set);
    const { currentDiagram, currentSheetIndex } = get();
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

    const { edges } = getSheetContent(currentDiagram, currentSheetIndex);
    set({
      currentDiagram: setSheetContent(currentDiagram, currentSheetIndex, {
        edges: [...edges, edge],
      }),
      isDirty: true,
    });
  },

  addTextBox: (position) => {
    pushUndo(get, set);
    const { currentDiagram, currentSheetIndex } = get();
    if (!currentDiagram) return;

    const textBox: DiagramTextBox = {
      id: `text-${nanoid(8)}`,
      position,
      text: 'New text',
      style: { size: 'medium' },
    };

    const { text_boxes } = getSheetContent(currentDiagram, currentSheetIndex);
    set({
      currentDiagram: setSheetContent(currentDiagram, currentSheetIndex, {
        text_boxes: [...text_boxes, textBox],
      }),
      isDirty: true,
    });
  },

  updateNode: (nodeId, updates) => {
    pushUndo(get, set);
    const { currentDiagram, currentSheetIndex } = get();
    if (!currentDiagram) return;

    if (
      updates.style ||
      updates.color_group !== undefined ||
      updates.layout_type !== undefined ||
      updates.branch_orientation !== undefined
    ) {
      try {
        const existing = JSON.parse(localStorage.getItem('ddd-diagram-last-style') || '{}');
        if (updates.style) existing.style = { ...existing.style, ...updates.style };
        if (updates.color_group !== undefined) existing.color_group = updates.color_group || undefined;
        if (updates.layout_type !== undefined) existing.layout_type = updates.layout_type || undefined;
        if (updates.branch_orientation !== undefined) existing.branch_orientation = updates.branch_orientation || undefined;
        localStorage.setItem('ddd-diagram-last-style', JSON.stringify(existing));
      } catch { /* ignore */ }
    }

    const { nodes, edges } = getSheetContent(currentDiagram, currentSheetIndex);
    const target = nodes.find((n) => n.id === nodeId);
    if (!target) return;

    let updatedNodes = nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n));

    // Cascade color_group to descendants that inherited the old value.
    // Only fires when the parent had an explicit color_group before the change —
    // otherwise an undefined→defined transition would sweep unrelated nodes.
    if (
      'color_group' in updates &&
      target.color_group &&
      updates.color_group !== target.color_group
    ) {
      const oldGroup = target.color_group;
      const newGroup = updates.color_group;
      const descendants = collectDescendants(nodeId, edges);
      updatedNodes = updatedNodes.map((n) =>
        descendants.has(n.id) && n.color_group === oldGroup
          ? { ...n, color_group: newGroup }
          : n,
      );
    }

    set({
      currentDiagram: setSheetContent(currentDiagram, currentSheetIndex, {
        nodes: updatedNodes,
      }),
      isDirty: true,
    });
  },

  updateEdge: (edgeId, updates) => {
    pushUndo(get, set);
    const { currentDiagram, currentSheetIndex } = get();
    if (!currentDiagram) return;

    const { edges } = getSheetContent(currentDiagram, currentSheetIndex);
    set({
      currentDiagram: setSheetContent(currentDiagram, currentSheetIndex, {
        edges: edges.map((e) => (e.id === edgeId ? { ...e, ...updates } : e)),
      }),
      isDirty: true,
    });
  },

  updateTextBox: (textBoxId, updates) => {
    pushUndo(get, set);
    const { currentDiagram, currentSheetIndex } = get();
    if (!currentDiagram) return;

    const { text_boxes } = getSheetContent(currentDiagram, currentSheetIndex);
    set({
      currentDiagram: setSheetContent(currentDiagram, currentSheetIndex, {
        text_boxes: text_boxes.map((t) => (t.id === textBoxId ? { ...t, ...updates } : t)),
      }),
      isDirty: true,
    });
  },

  deleteNode: (nodeId) => {
    pushUndo(get, set);
    const { currentDiagram, currentSheetIndex } = get();
    if (!currentDiagram) return;

    const { nodes, edges } = getSheetContent(currentDiagram, currentSheetIndex);
    set({
      currentDiagram: setSheetContent(currentDiagram, currentSheetIndex, {
        nodes: nodes.filter((n) => n.id !== nodeId),
        edges: edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
      }),
      isDirty: true,
    });
  },

  deleteEdge: (edgeId) => {
    pushUndo(get, set);
    const { currentDiagram, currentSheetIndex } = get();
    if (!currentDiagram) return;

    const { edges } = getSheetContent(currentDiagram, currentSheetIndex);
    set({
      currentDiagram: setSheetContent(currentDiagram, currentSheetIndex, {
        edges: edges.filter((e) => e.id !== edgeId),
      }),
      isDirty: true,
    });
  },

  deleteTextBox: (textBoxId) => {
    pushUndo(get, set);
    const { currentDiagram, currentSheetIndex } = get();
    if (!currentDiagram) return;

    const { text_boxes } = getSheetContent(currentDiagram, currentSheetIndex);
    set({
      currentDiagram: setSheetContent(currentDiagram, currentSheetIndex, {
        text_boxes: text_boxes.filter((t) => t.id !== textBoxId),
      }),
      isDirty: true,
    });
  },

  moveNode: (nodeId, position) => {
    const { currentDiagram, currentSheetIndex } = get();
    if (!currentDiagram) return;

    const { nodes } = getSheetContent(currentDiagram, currentSheetIndex);
    set({
      currentDiagram: setSheetContent(currentDiagram, currentSheetIndex, {
        nodes: nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
      }),
      isDirty: true,
    });
  },

  moveTextBox: (textBoxId, position) => {
    const { currentDiagram, currentSheetIndex } = get();
    if (!currentDiagram) return;

    const { text_boxes } = getSheetContent(currentDiagram, currentSheetIndex);
    set({
      currentDiagram: setSheetContent(currentDiagram, currentSheetIndex, {
        text_boxes: text_boxes.map((t) => (t.id === textBoxId ? { ...t, position } : t)),
      }),
      isDirty: true,
    });
  },

  // ─── Sheet management ──────────────────────────────────────────────────

  addSheet: () => {
    pushUndo(get, set);
    const { currentDiagram } = get();
    if (!currentDiagram) return;

    const doc = ensureSheets(currentDiagram);
    const newSheet: DiagramSheet = {
      id: nanoid(8),
      name: `Sheet ${(doc.sheets!.length) + 1}`,
      nodes: [],
      edges: [],
      text_boxes: [],
    };

    set({
      currentDiagram: {
        ...doc,
        sheets: [...doc.sheets!, newSheet],
      },
      currentSheetIndex: doc.sheets!.length,
      isDirty: true,
    });
  },

  renameSheet: (sheetIndex, name) => {
    const { currentDiagram } = get();
    if (!currentDiagram?.sheets || sheetIndex >= currentDiagram.sheets.length) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    set({
      currentDiagram: {
        ...currentDiagram,
        sheets: currentDiagram.sheets.map((s, i) =>
          i === sheetIndex ? { ...s, name: trimmed } : s,
        ),
      },
      isDirty: true,
    });
  },

  deleteSheet: (sheetIndex) => {
    pushUndo(get, set);
    const { currentDiagram, currentSheetIndex } = get();
    if (!currentDiagram?.sheets || currentDiagram.sheets.length <= 1) return;

    const newSheets = currentDiagram.sheets.filter((_, i) => i !== sheetIndex);
    let newIndex = currentSheetIndex;
    if (currentSheetIndex >= newSheets.length) {
      newIndex = newSheets.length - 1;
    } else if (currentSheetIndex > sheetIndex) {
      newIndex = currentSheetIndex - 1;
    }

    set({
      currentDiagram: { ...currentDiagram, sheets: newSheets },
      currentSheetIndex: newIndex,
      isDirty: true,
    });
  },

  switchSheet: (sheetIndex) => {
    const { currentDiagram } = get();
    if (!currentDiagram) return;
    const maxIndex = currentDiagram.sheets ? currentDiagram.sheets.length - 1 : 0;
    set({ currentSheetIndex: Math.min(sheetIndex, maxIndex) });
  },

  reorderSheets: (fromIndex, toIndex) => {
    pushUndo(get, set);
    const { currentDiagram, currentSheetIndex } = get();
    if (!currentDiagram?.sheets || fromIndex === toIndex) return;

    const sheets = [...currentDiagram.sheets];
    const [moved] = sheets.splice(fromIndex, 1);
    sheets.splice(toIndex, 0, moved);

    let newIndex = currentSheetIndex;
    if (currentSheetIndex === fromIndex) {
      newIndex = toIndex;
    } else if (fromIndex < currentSheetIndex && toIndex >= currentSheetIndex) {
      newIndex = currentSheetIndex - 1;
    } else if (fromIndex > currentSheetIndex && toIndex <= currentSheetIndex) {
      newIndex = currentSheetIndex + 1;
    }

    set({
      currentDiagram: { ...currentDiagram, sheets },
      currentSheetIndex: newIndex,
      isDirty: true,
    });
  },

  duplicateSheet: () => {
    pushUndo(get, set);
    const { currentDiagram, currentSheetIndex } = get();
    if (!currentDiagram?.sheets) return;

    const source = currentDiagram.sheets[currentSheetIndex];
    if (!source) return;

    const cloned = structuredClone(source);
    cloned.id = nanoid(8);
    cloned.name = `${source.name} (copy)`;

    // Remap all IDs
    const idMap = new Map<string, string>();
    for (const n of cloned.nodes) {
      const newId = `node-${nanoid(8)}`;
      idMap.set(n.id, newId);
      n.id = newId;
    }
    for (const e of cloned.edges) {
      e.id = `edge-${nanoid(8)}`;
      e.from = idMap.get(e.from) || e.from;
      e.to = idMap.get(e.to) || e.to;
    }
    for (const t of cloned.text_boxes || []) {
      t.id = `text-${nanoid(8)}`;
    }

    const sheets = [...currentDiagram.sheets];
    sheets.splice(currentSheetIndex + 1, 0, cloned);

    set({
      currentDiagram: { ...currentDiagram, sheets },
      currentSheetIndex: currentSheetIndex + 1,
      isDirty: true,
    });
  },

  // ─── Undo/Redo ─────────────────────────────────────────────────────────

  undo: () => {
    const { _undoStack, currentDiagram } = get();
    if (_undoStack.length === 0 || !currentDiagram) return;
    const prev = _undoStack[_undoStack.length - 1];
    set({
      _undoStack: _undoStack.slice(0, -1),
      _redoStack: [...get()._redoStack, structuredClone(currentDiagram)].slice(-MAX_UNDO),
      currentDiagram: prev,
      isDirty: true,
    });
  },

  redo: () => {
    const { _redoStack, currentDiagram } = get();
    if (_redoStack.length === 0 || !currentDiagram) return;
    const next = _redoStack[_redoStack.length - 1];
    set({
      _redoStack: _redoStack.slice(0, -1),
      _undoStack: [...get()._undoStack, structuredClone(currentDiagram)].slice(-MAX_UNDO),
      currentDiagram: next,
      isDirty: true,
    });
  },

  unloadDiagram: () => {
    set({
      currentDiagram: null,
      currentDiagramId: null,
      currentSheetIndex: 0,
      isDirty: false,
      _undoStack: [],
      _redoStack: [],
    });
  },

  reset: () => {
    set({
      diagrams: [],
      currentDiagram: null,
      currentDiagramId: null,
      currentSheetIndex: 0,
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
    case 'person': return 'User';
    case 'document': return 'Document';
    case 'folder': return 'Folder';
    case 'stack': return 'Stack';
    case 'custom': return 'Custom';
    case 'server': return 'Server';
    case 'database': return 'Database';
    case 'browser': return 'Browser';
    case 'mobile': return 'Mobile';
    case 'api': return 'API';
    case 'queue': return 'Queue';
    case 'lock': return 'Security';
    case 'gear': return 'Service';
    case 'lightning': return 'Event';
    case 'globe': return 'Internet';
  }
}

function defaultStyleForShape(shape: DiagramNodeShape): DiagramNodeStyle {
  switch (shape) {
    case 'person':
      return { fill_color: '#e0f2fe', border_color: '#0284c7' };
    case 'cylinder': case 'database':
      return { fill_color: '#fef3c7', border_color: '#d97706' };
    case 'cloud': case 'globe':
      return { fill_color: '#f3e8ff', border_color: '#7c3aed' };
    case 'diamond':
      return { fill_color: '#fce7f3', border_color: '#db2777' };
    case 'server':
      return { fill_color: '#dbeafe', border_color: '#2563eb' };
    case 'browser': case 'mobile':
      return { fill_color: '#ecfdf5', border_color: '#059669' };
    case 'api': case 'lightning':
      return { fill_color: '#fff7ed', border_color: '#ea580c' };
    case 'queue':
      return { fill_color: '#fef9c3', border_color: '#ca8a04' };
    case 'lock':
      return { fill_color: '#fce7f3', border_color: '#be185d' };
    case 'gear':
      return { fill_color: '#f1f5f9', border_color: '#475569' };
    default:
      return { fill_color: '#f8fafc', border_color: '#64748b' };
  }
}
