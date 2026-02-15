import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { nanoid } from 'nanoid';
import { stringify } from 'yaml';
import type {
  AppView,
  AppError,
  GlobalSettings,
  NewProjectConfig,
  RecentProject,
} from '../types/app';
import type { DomainConfig } from '../types/domain';

const SETTINGS_FILE = '.ddd-tool/settings.json';
const RECENT_FILE = '.ddd-tool/recent-projects.json';

function getHomePath(): string {
  // In Tauri, we resolve home dir from env or use a sensible default
  return (
    (typeof window !== 'undefined' &&
      (window as unknown as Record<string, unknown>).__HOME_DIR__) ||
    ''
  ) as string;
}

function settingsPath(): string {
  return `${getHomePath()}/${SETTINGS_FILE}`;
}

function recentPath(): string {
  return `${getHomePath()}/${RECENT_FILE}`;
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  claudeCode: {
    enabled: true,
    command: 'claude',
    postImplement: {
      runTests: true,
      runLint: true,
      autoCommit: false,
      regenerateClaudeMd: false,
    },
  },
  testing: {
    command: 'npm',
    args: ['test'],
    scoped: false,
    scopePattern: '',
    autoRun: true,
  },
  editor: {
    gridSnap: true,
    autoSaveInterval: 30,
    theme: 'dark',
    fontSize: 14,
  },
  git: {
    autoCommitMessage: 'DDD: {action} in {flow_id}',
    branchNaming: 'ddd/{flow_id}',
  },
  reconciliation: {
    autoRun: false,
    autoAcceptMatching: false,
    notifyOnDrift: true,
  },
  testGeneration: {
    autoDerive: true,
    includeInPrompt: true,
    complianceCheck: true,
  },
};

interface AppState {
  // View
  view: AppView;
  setView: (view: AppView) => void;

  // Recent projects
  recentProjects: RecentProject[];
  loadRecentProjects: () => Promise<void>;
  addRecentProject: (project: RecentProject) => Promise<void>;
  removeRecentProject: (path: string) => Promise<void>;

  // Settings
  settings: GlobalSettings;
  projectSettings: Partial<GlobalSettings> | null;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: GlobalSettings) => Promise<void>;
  updateSettings: (partial: Partial<GlobalSettings>) => void;
  loadProjectSettings: (projectPath: string) => Promise<void>;
  saveProjectSettings: (projectPath: string, settings: Partial<GlobalSettings>) => Promise<void>;
  clearProjectSettings: (projectPath: string) => Promise<void>;

  // Current project
  currentProjectPath: string | null;
  openProject: (path: string) => void;

  // Project creation
  createProject: (config: NewProjectConfig) => Promise<void>;

  // First-run check
  isFirstRun: boolean;
  checkFirstRun: () => Promise<void>;

  // Error handling
  errors: AppError[];
  pushError: (
    severity: AppError['severity'],
    component: string,
    message: string,
    detail?: string
  ) => void;
  dismissError: (id: string) => void;
  clearErrors: () => void;

  // Boot
  boot: () => Promise<void>;
  booted: boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  view: 'launcher',
  recentProjects: [],
  settings: DEFAULT_SETTINGS,
  projectSettings: null,
  currentProjectPath: null,
  isFirstRun: false,
  errors: [],
  booted: false,

  setView: (view) => set({ view }),

  loadRecentProjects: async () => {
    try {
      const exists: boolean = await invoke('path_exists', {
        path: recentPath(),
      });
      if (!exists) {
        set({ recentProjects: [] });
        return;
      }
      const content: string = await invoke('read_file', {
        path: recentPath(),
      });
      const projects = JSON.parse(content) as RecentProject[];

      // Prune projects whose paths no longer exist
      const checks = await Promise.all(
        projects.map(async (p) => {
          const pathExists: boolean = await invoke('path_exists', { path: p.path });
          return pathExists;
        })
      );
      const pruned = projects.filter((_, i) => checks[i]);

      // Persist pruned list if any were removed
      if (pruned.length < projects.length) {
        try {
          await invoke('write_file', {
            path: recentPath(),
            contents: JSON.stringify(pruned, null, 2),
          });
        } catch {
          // Silent
        }
      }

      set({ recentProjects: pruned });
    } catch {
      set({ recentProjects: [] });
    }
  },

  addRecentProject: async (project) => {
    const existing = get().recentProjects.filter(
      (p) => p.path !== project.path
    );
    const updated = [project, ...existing].slice(0, 20);
    set({ recentProjects: updated });
    try {
      await invoke('write_file', {
        path: recentPath(),
        contents: JSON.stringify(updated, null, 2),
      });
    } catch (e) {
      get().pushError('warning', 'file', 'Failed to save recent projects', String(e));
    }
  },

  removeRecentProject: async (path) => {
    const updated = get().recentProjects.filter((p) => p.path !== path);
    set({ recentProjects: updated });
    try {
      await invoke('write_file', {
        path: recentPath(),
        contents: JSON.stringify(updated, null, 2),
      });
    } catch {
      // silent
    }
  },

  loadSettings: async () => {
    try {
      const exists: boolean = await invoke('path_exists', {
        path: settingsPath(),
      });
      if (!exists) {
        set({ settings: DEFAULT_SETTINGS });
        return;
      }
      const content: string = await invoke('read_file', {
        path: settingsPath(),
      });
      const loaded = JSON.parse(content) as GlobalSettings;
      set({ settings: { ...DEFAULT_SETTINGS, ...loaded } });
    } catch {
      set({ settings: DEFAULT_SETTINGS });
    }
  },

  saveSettings: async (settings) => {
    set({ settings });
    try {
      await invoke('write_file', {
        path: settingsPath(),
        contents: JSON.stringify(settings, null, 2),
      });
    } catch (e) {
      get().pushError('error', 'file', 'Failed to save settings', String(e));
    }
  },

  updateSettings: (partial) => {
    const current = get().settings;
    const updated = { ...current, ...partial };
    set({ settings: updated });
  },

  loadProjectSettings: async (projectPath) => {
    const configPath = `${projectPath}/.ddd/config.yaml`;
    try {
      const exists: boolean = await invoke('path_exists', { path: configPath });
      if (!exists) {
        set({ projectSettings: null });
        return;
      }
      const content: string = await invoke('read_file', { path: configPath });
      const { parse } = await import('yaml');
      const parsed = parse(content) as Partial<GlobalSettings>;
      set({ projectSettings: parsed });
    } catch {
      set({ projectSettings: null });
    }
  },

  saveProjectSettings: async (projectPath, settings) => {
    const configPath = `${projectPath}/.ddd/config.yaml`;
    try {
      await invoke('create_directory', { path: `${projectPath}/.ddd` });
      const { stringify } = await import('yaml');
      await invoke('write_file', {
        path: configPath,
        contents: stringify(settings),
      });
      set({ projectSettings: settings });
    } catch (e) {
      get().pushError('error', 'file', 'Failed to save project settings', String(e));
    }
  },

  clearProjectSettings: async (projectPath) => {
    const configPath = `${projectPath}/.ddd/config.yaml`;
    try {
      await invoke('delete_file', { path: configPath });
      set({ projectSettings: null });
    } catch {
      // Silent
    }
  },

  openProject: (path) => {
    set({ currentProjectPath: path, view: 'project' });
    get().addRecentProject({
      name: path.split('/').pop() || path,
      path,
      lastOpenedAt: new Date().toISOString(),
    });
  },

  createProject: async (config) => {
    const projectPath = `${config.location}/${config.name}`;
    try {
      // Create project directory
      await invoke('create_directory', { path: projectPath });

      // Create specs directory
      await invoke('create_directory', {
        path: `${projectPath}/specs`,
      });
      await invoke('create_directory', {
        path: `${projectPath}/specs/domains`,
      });

      // Write project config
      const cleanedDomains = config.domains.filter(
        (d) => d.name.trim() !== ''
      );
      const projectConfig = {
        name: config.name,
        description: config.description,
        techStack: config.techStack,
        domains: cleanedDomains,
        createdAt: new Date().toISOString(),
      };
      await invoke('write_file', {
        path: `${projectPath}/ddd-project.json`,
        contents: JSON.stringify(projectConfig, null, 2),
      });

      // Write domain.yaml for each domain
      for (const domain of cleanedDomains) {
        const domainId = domain.name.toLowerCase().replace(/\s+/g, '-');
        const domainDir = `${projectPath}/specs/domains/${domainId}`;
        await invoke('create_directory', { path: domainDir });

        const domainConfig: DomainConfig = {
          name: domain.name,
          description: domain.description || undefined,
          flows: [],
          publishes_events: [],
          consumes_events: [],
          layout: { flows: {}, portals: {} },
        };
        await invoke('write_file', {
          path: `${domainDir}/domain.yaml`,
          contents: stringify(domainConfig),
        });
      }

      // Init git if requested
      if (config.initGit) {
        await invoke('git_init', { path: projectPath });
        await invoke('write_file', {
          path: `${projectPath}/.gitignore`,
          contents: 'node_modules/\n.DS_Store\n',
        });
        await invoke('git_add_all', { path: projectPath });
        await invoke('git_commit', {
          path: projectPath,
          message: 'Initial DDD project setup',
        });
      }

      get().openProject(projectPath);
    } catch (e) {
      get().pushError(
        'error',
        'file',
        'Failed to create project',
        String(e)
      );
      throw e;
    }
  },

  checkFirstRun: async () => {
    try {
      const exists: boolean = await invoke('path_exists', {
        path: settingsPath(),
      });
      set({ isFirstRun: !exists });
    } catch {
      set({ isFirstRun: true });
    }
  },

  pushError: (severity, component, message, detail) => {
    const error: AppError = {
      id: nanoid(),
      severity,
      component,
      message,
      detail,
      timestamp: Date.now(),
      dismissed: false,
    };
    set((state) => ({ errors: [...state.errors, error] }));

    // Log to file
    const logLine = `[${new Date().toISOString()}] [${severity.toUpperCase()}] [${component}] ${message}${detail ? ' — ' + detail : ''}`;
    const home = getHomePath();
    if (home) {
      invoke('append_log', {
        path: `${home}/.ddd-tool/logs/ddd-tool.log`,
        line: logLine,
        maxBytes: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      }).catch(() => { /* Silent — logging should never fail loudly */ });
    }

    // Auto-dismiss info only after 5s (warnings stay until dismissed)
    if (severity === 'info') {
      setTimeout(() => {
        get().dismissError(error.id);
      }, 5000);
    }
  },

  dismissError: (id) => {
    set((state) => ({
      errors: state.errors.filter((e) => e.id !== id),
    }));
  },

  clearErrors: () => set({ errors: [] }),

  boot: async () => {
    // Resolve home directory
    try {
      const homeDir = await resolveHomeDir();
      (window as unknown as Record<string, unknown>).__HOME_DIR__ = homeDir;
    } catch {
      // Fallback — paths won't resolve but app still opens
    }

    await get().checkFirstRun();
    await get().loadSettings();
    await get().loadRecentProjects();

    if (get().isFirstRun) {
      set({ view: 'first-run', booted: true });
    } else {
      set({ view: 'launcher', booted: true });
    }
  },
}));

async function resolveHomeDir(): Promise<string> {
  // Use Tauri's path API to get the home directory
  const { homeDir } = await import('@tauri-apps/api/path');
  const home = await homeDir();
  // Remove trailing slash if present
  return home.endsWith('/') ? home.slice(0, -1) : home;
}
