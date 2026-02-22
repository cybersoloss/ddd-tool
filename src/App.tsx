import { useEffect } from 'react';
import { useAppStore } from './stores/app-store';
import { registerAutoSaveIntervalGetter, registerAutoSaveEnabledGetter } from './stores/flow-store';
import { ProjectLauncher } from './components/ProjectLauncher/ProjectLauncher';
import { FirstRunWizard } from './components/FirstRun/FirstRunWizard';
import { AppShell } from './AppShell';
import { ErrorToasts } from './components/shared/ErrorToasts';
import { SaveNotification } from './components/shared/SaveNotification';

// Side-effect import: registers undo push callback with flow-store
import './stores/undo-store';

// Register auto-save getters
registerAutoSaveIntervalGetter(() =>
  useAppStore.getState().settings.editor.autoSaveInterval || 30
);
registerAutoSaveEnabledGetter(() =>
  useAppStore.getState().settings.editor.autoSave ?? false
);

function App() {
  const view = useAppStore((s) => s.view);
  const booted = useAppStore((s) => s.booted);
  const boot = useAppStore((s) => s.boot);

  useEffect(() => {
    boot();
  }, [boot]);

  if (!booted) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <>
      {view === 'launcher' && <ProjectLauncher />}
      {view === 'first-run' && <FirstRunWizard />}
      {view === 'project' && <AppShell />}
      <ErrorToasts />
      <SaveNotification />
    </>
  );
}

export default App;
