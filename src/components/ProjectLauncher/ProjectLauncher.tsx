import { useState, useEffect } from 'react';
import { Plus, FolderOpen, Settings, GitPullRequest } from 'lucide-react';
import { getVersion } from '@tauri-apps/api/app';
import { open } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../../stores/app-store';
import { RecentProjects } from './RecentProjects';
import { NewProjectWizard } from './NewProjectWizard';
import { SettingsDialog } from '../Settings/SettingsDialog';
import { CloneDialog } from './CloneDialog';

export function ProjectLauncher() {
  const [showWizard, setShowWizard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showClone, setShowClone] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => {});
  }, []);
  const openProject = useAppStore((s) => s.openProject);
  const pushError = useAppStore((s) => s.pushError);

  async function handleOpenExisting() {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        openProject(selected as string);
      }
    } catch (e) {
      pushError('error', 'file', 'Failed to open project', String(e));
    }
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            DDD Tool
          </h1>
          <p className="text-sm text-text-secondary">
            Domain-Driven Design — Visual Flow Editor
          </p>
          {appVersion && (
            <p className="text-xs text-text-muted mt-1">v{appVersion}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            className="btn-primary flex-1"
            onClick={() => setShowWizard(true)}
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
          <button className="btn-secondary flex-1" onClick={handleOpenExisting}>
            <FolderOpen className="w-4 h-4" />
            Open Existing
          </button>
          <button
            className="btn-secondary"
            onClick={() => setShowClone(true)}
            title="Clone from Git"
          >
            <GitPullRequest className="w-4 h-4" />
          </button>
          <button
            className="btn-icon"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Recent Projects */}
        <div className="card">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium text-text-secondary">
              Recent Projects
            </h2>
          </div>
          <div className="p-2 max-h-72 overflow-y-auto">
            <RecentProjects />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showWizard && <NewProjectWizard onClose={() => setShowWizard(false)} />}
      {showClone && (
        <CloneDialog
          onClose={() => setShowClone(false)}
          onCloned={(path) => {
            setShowClone(false);
            openProject(path);
          }}
        />
      )}
      {showSettings && (
        <SettingsDialog onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
