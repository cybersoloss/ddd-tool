import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from './stores/app-store';
import { useProjectStore } from './stores/project-store';
import { useFlowStore } from './stores/flow-store';
import { useSheetStore } from './stores/sheet-store';
import { useGitStore } from './stores/git-store';
import { useImplementationStore } from './stores/implementation-store';
import { useUiStore } from './stores/ui-store';
import { isOwnWrite } from './stores/write-guard';
import { useSpecsStore } from './stores/specs-store';
import { Breadcrumb } from './components/Navigation/Breadcrumb';
import { SheetTabs } from './components/Navigation/SheetTabs';
import { SystemMap } from './components/SystemMap/SystemMap';
import { DomainMap } from './components/DomainMap/DomainMap';
import { FlowCanvas } from './components/FlowCanvas/FlowCanvas';
import { GitPanel } from './components/GitPanel/GitPanel';
import { SpecsSidebar } from './components/SpecsSidebar/SpecsSidebar';
import { CrashRecoveryDialog } from './components/shared/CrashRecoveryDialog';
import { SearchPalette } from './components/shared/SearchPalette';

async function handleExternalChanges(changedPaths: string[], projectPath: string) {
  const changedFlowYamls = changedPaths.filter(
    (p) => p.includes('/flows/') && (p.endsWith('.yaml') || p.endsWith('.yml')),
  );
  const hasDomainOrProjectChange = changedPaths.some(
    (p) => p.endsWith('domain.yaml') || p.endsWith('ddd-project.json') || p.endsWith('system-layout.yaml'),
  );

  const hasSpecsChange = changedPaths.some(
    (p) => p.includes('/specs/schemas/') || p.includes('/specs/ui/') || p.endsWith('infrastructure.yaml'),
  );

  if (hasDomainOrProjectChange) {
    await useProjectStore.getState().reloadProject();
    useUiStore.getState().flashSync();
  } else if (hasSpecsChange && projectPath) {
    await useSpecsStore.getState().loadAll(projectPath);
    useUiStore.getState().flashSync();
  }

  if (changedFlowYamls.length > 0) {
    const currentFlow = useFlowStore.getState().currentFlow;
    if (currentFlow?.flow) {
      const currentFlowPath = `${projectPath}/specs/domains/${currentFlow.flow.domain}/flows/${currentFlow.flow.id}.yaml`;
      if (changedFlowYamls.some((p) => p === currentFlowPath)) {
        const { current } = useSheetStore.getState();
        if (current.domainId && current.flowId) {
          await useFlowStore.getState().loadFlow(
            current.domainId,
            current.flowId,
            projectPath,
          );
          useUiStore.getState().flashSync();
        }
      }
    }
  }
}

export function AppShell() {
  const currentProjectPath = useAppStore((s) => s.currentProjectPath);
  const setView = useAppStore((s) => s.setView);
  const pushError = useAppStore((s) => s.pushError);
  const loading = useProjectStore((s) => s.loading);
  const loaded = useProjectStore((s) => s.loaded);
  const level = useSheetStore((s) => s.current.level);
  const panelOpen = useGitStore((s) => s.panelOpen);
  const specsPanelOpen = useUiStore((s) => s.specsPanelOpen);
  const searchOpen = useUiStore((s) => s.searchOpen);
  const loadedPathRef = useRef<string | null>(null);

  const [recoveryFiles, setRecoveryFiles] = useState<string[]>([]);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    if (!currentProjectPath) return;
    // Prevent double-loading in StrictMode
    if (loadedPathRef.current === currentProjectPath) return;
    loadedPathRef.current = currentProjectPath;

    useSheetStore.getState().reset();
    useProjectStore.getState().loadProject(currentProjectPath).then(async () => {
      useGitStore.getState().refresh();
      useImplementationStore.getState().loadMappings();

      // Check for crash recovery autosave files
      try {
        const files: string[] = await invoke('list_directory', {
          path: `${currentProjectPath}/.ddd/autosave`,
        });
        const yamlFiles = files.filter((f) => f.endsWith('.yaml'));
        if (yamlFiles.length > 0) {
          setRecoveryFiles(yamlFiles);
          setShowRecovery(true);
        }
      } catch {
        // No autosave dir — nothing to recover
      }
    }).catch((e) => {
      pushError('error', 'project', 'Failed to load project', String(e));
    });

    return () => {
      loadedPathRef.current = null;
      useProjectStore.getState().reset();
      useGitStore.getState().reset();
      useImplementationStore.getState().reset();
    };
  }, [currentProjectPath, pushError]);

  // File watcher for live spec reload
  useEffect(() => {
    if (!currentProjectPath || !loaded) return;

    // Start watching specs directory
    invoke('watch_directory', { path: `${currentProjectPath}/specs` }).catch(() => {
      // Silent — watcher may not be available
    });

    let debounceTimer: ReturnType<typeof setTimeout>;
    const unlistenPromise = listen<string[]>('spec-files-changed', (event) => {
      if (isOwnWrite()) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        handleExternalChanges(event.payload, currentProjectPath);
      }, 1000);
    });

    return () => {
      unlistenPromise.then((fn) => fn());
      clearTimeout(debounceTimer);
    };
  }, [currentProjectPath, loaded]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col">
        <Breadcrumb />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-text-muted">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="h-screen flex flex-col">
        <Breadcrumb />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-sm text-danger">Failed to load project.</p>
            <button className="btn-secondary text-xs" onClick={() => setView('launcher')}>
              Back to Launcher
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Breadcrumb />
      <SheetTabs />
      <div className="flex-1 flex flex-row overflow-hidden">
        {specsPanelOpen && <SpecsSidebar />}
        <div className="flex-1 flex flex-col overflow-hidden">
          {level === 'system' && <SystemMap />}
          {level === 'domain' && <DomainMap />}
          {level === 'flow' && <FlowCanvas />}
        </div>
        {panelOpen && <GitPanel />}
      </div>

      {showRecovery && currentProjectPath && (
        <CrashRecoveryDialog
          projectPath={currentProjectPath}
          files={recoveryFiles}
          onDone={() => {
            setShowRecovery(false);
            setRecoveryFiles([]);
          }}
        />
      )}

      {searchOpen && <SearchPalette />}
    </div>
  );
}
