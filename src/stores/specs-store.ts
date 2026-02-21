import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { stringify, parse } from 'yaml';
import { markWriting } from './write-guard';
import type {
  SchemaSpec,
  PagesConfig,
  UIPageSpec,
  InfrastructureSpec,
} from '../types/specs';

interface SpecsState {
  schemas: Record<string, SchemaSpec>;
  baseSchema: SchemaSpec | null;
  pagesConfig: PagesConfig | null;
  pageSpecs: Record<string, UIPageSpec>;
  infrastructure: InfrastructureSpec | null;
  loaded: boolean;

  loadAll: (projectPath: string) => Promise<void>;
  saveSchema: (projectPath: string, name: string, schema: SchemaSpec) => Promise<void>;
  addSchema: (projectPath: string, name: string) => Promise<void>;
  deleteSchema: (projectPath: string, name: string) => Promise<void>;
  savePagesConfig: (projectPath: string, config: PagesConfig) => Promise<void>;
  savePageSpec: (projectPath: string, pageId: string, spec: UIPageSpec) => Promise<void>;
  addPage: (projectPath: string, id: string, name: string) => Promise<void>;
  deletePage: (projectPath: string, pageId: string) => Promise<void>;
  saveInfrastructure: (projectPath: string, infra: InfrastructureSpec) => Promise<void>;
  reset: () => void;
}

export const useSpecsStore = create<SpecsState>((set, get) => ({
  schemas: {},
  baseSchema: null,
  pagesConfig: null,
  pageSpecs: {},
  infrastructure: null,
  loaded: false,

  loadAll: async (projectPath) => {
    const schemas: Record<string, SchemaSpec> = {};
    let baseSchema: SchemaSpec | null = null;

    // Load schemas from specs/schemas/
    try {
      const schemasDir = `${projectPath}/specs/schemas`;
      const exists: boolean = await invoke('path_exists', { path: schemasDir });
      if (exists) {
        const files: string[] = await invoke('list_directory', { path: schemasDir });
        for (const file of files) {
          if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
          try {
            const content: string = await invoke('read_file', {
              path: `${schemasDir}/${file}`,
            });
            const parsed = parse(content) as SchemaSpec;
            if (!parsed) continue;
            const name = file.replace(/\.ya?ml$/, '');
            // Ensure fields is always an array
            if (!Array.isArray(parsed.fields)) parsed.fields = [];
            if (name === '_base') {
              baseSchema = parsed;
            } else {
              schemas[name] = parsed;
            }
          } catch {
            // Skip unparseable files
          }
        }
      }
    } catch {
      // No schemas dir
    }

    // Load pages config from specs/ui/pages.yaml
    let pagesConfig: PagesConfig | null = null;
    const pageSpecs: Record<string, UIPageSpec> = {};
    try {
      const pagesPath = `${projectPath}/specs/ui/pages.yaml`;
      const pagesExists: boolean = await invoke('path_exists', { path: pagesPath });
      if (pagesExists) {
        const content: string = await invoke('read_file', { path: pagesPath });
        pagesConfig = parse(content) as PagesConfig;
        if (pagesConfig && !Array.isArray(pagesConfig.pages)) {
          pagesConfig.pages = [];
        }
      }
    } catch {
      // No pages config
    }

    // Load individual page specs from specs/ui/{page-id}.yaml
    if (pagesConfig?.pages) {
      for (const page of pagesConfig.pages) {
        try {
          const pagePath = `${projectPath}/specs/ui/${page.id}.yaml`;
          const pageExists: boolean = await invoke('path_exists', { path: pagePath });
          if (pageExists) {
            const content: string = await invoke('read_file', { path: pagePath });
            const parsed = parse(content) as UIPageSpec;
            if (parsed) pageSpecs[page.id] = parsed;
          }
        } catch {
          // Skip
        }
      }
    }

    // Load infrastructure from specs/infrastructure.yaml
    let infrastructure: InfrastructureSpec | null = null;
    try {
      const infraPath = `${projectPath}/specs/infrastructure.yaml`;
      const infraExists: boolean = await invoke('path_exists', { path: infraPath });
      if (infraExists) {
        const content: string = await invoke('read_file', { path: infraPath });
        infrastructure = parse(content) as InfrastructureSpec;
        if (infrastructure && !Array.isArray(infrastructure.services)) {
          infrastructure.services = [];
        }
      }
    } catch {
      // No infrastructure
    }

    set({ schemas, baseSchema, pagesConfig, pageSpecs, infrastructure, loaded: true });
  },

  saveSchema: async (projectPath, name, schema) => {
    const key = name === '_base' ? '_base' : name;
    if (key === '_base') {
      set({ baseSchema: schema });
    } else {
      set((s) => ({ schemas: { ...s.schemas, [name]: schema } }));
    }

    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/schemas/${name}.yaml`,
      contents: stringify(schema),
    });
  },

  addSchema: async (projectPath, name) => {
    const schema: SchemaSpec = {
      name,
      description: '',
      fields: [],
    };
    set((s) => ({ schemas: { ...s.schemas, [name]: schema } }));

    // Ensure directory exists
    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/schemas/${name}.yaml`,
      contents: stringify(schema),
    });
  },

  deleteSchema: async (projectPath, name) => {
    set((s) => {
      const { [name]: _, ...rest } = s.schemas;
      return { schemas: rest };
    });

    try {
      await invoke('delete_file', {
        path: `${projectPath}/specs/schemas/${name}.yaml`,
      });
    } catch {
      // Silent
    }
  },

  savePagesConfig: async (projectPath, config) => {
    set({ pagesConfig: config });

    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/ui/pages.yaml`,
      contents: stringify(config),
    });
  },

  savePageSpec: async (projectPath, pageId, spec) => {
    set((s) => ({ pageSpecs: { ...s.pageSpecs, [pageId]: spec } }));

    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/ui/${pageId}.yaml`,
      contents: stringify(spec),
    });
  },

  addPage: async (projectPath, id, name) => {
    const { pagesConfig } = get();
    const config = pagesConfig ?? { pages: [] };

    const entry = { id, route: `/${id}`, name };
    const updatedConfig: PagesConfig = {
      ...config,
      pages: [...config.pages, entry],
    };
    set({ pagesConfig: updatedConfig });

    // Write updated pages.yaml
    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/ui/pages.yaml`,
      contents: stringify(updatedConfig),
    });

    // Create empty page spec
    const pageSpec: UIPageSpec = { page: id, route: `/${id}`, sections: [], forms: [] };
    set((s) => ({ pageSpecs: { ...s.pageSpecs, [id]: pageSpec } }));

    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/ui/${id}.yaml`,
      contents: stringify(pageSpec),
    });
  },

  deletePage: async (projectPath, pageId) => {
    const { pagesConfig } = get();
    if (!pagesConfig) return;

    const updatedConfig: PagesConfig = {
      ...pagesConfig,
      pages: pagesConfig.pages.filter((p) => p.id !== pageId),
    };
    set({ pagesConfig: updatedConfig });

    // Remove from pageSpecs
    set((s) => {
      const { [pageId]: _, ...rest } = s.pageSpecs;
      return { pageSpecs: rest };
    });

    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/ui/pages.yaml`,
      contents: stringify(updatedConfig),
    });

    try {
      await invoke('delete_file', {
        path: `${projectPath}/specs/ui/${pageId}.yaml`,
      });
    } catch {
      // Silent
    }
  },

  saveInfrastructure: async (projectPath, infra) => {
    set({ infrastructure: infra });

    markWriting();
    await invoke('write_file', {
      path: `${projectPath}/specs/infrastructure.yaml`,
      contents: stringify(infra),
    });
  },

  reset: () => {
    set({
      schemas: {},
      baseSchema: null,
      pagesConfig: null,
      pageSpecs: {},
      infrastructure: null,
      loaded: false,
    });
  },
}));
