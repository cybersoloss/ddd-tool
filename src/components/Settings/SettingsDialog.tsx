import { useState, useEffect } from 'react';
import { X, Monitor, Terminal, TestTube, GitBranch } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { EditorSettings } from './EditorSettings';
import { ClaudeCodeSettings } from './ClaudeCodeSettings';
import { TestingSettings } from './TestingSettings';
import { GitSettings } from './GitSettings';

interface Props {
  onClose: () => void;
}

const TABS = [
  { id: 'editor', label: 'Editor', icon: Monitor },
  { id: 'claude-code', label: 'Claude Code', icon: Terminal },
  { id: 'testing', label: 'Testing', icon: TestTube },
  { id: 'git', label: 'Git', icon: GitBranch },
] as const;

type TabId = (typeof TABS)[number]['id'];

const TAB_CONTENT: Record<TabId, React.FC> = {
  editor: EditorSettings,
  'claude-code': ClaudeCodeSettings,
  testing: TestingSettings,
  git: GitSettings,
};

export function SettingsDialog({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('editor');
  const [scope, setScope] = useState<'global' | 'project'>('global');
  const currentProjectPath = useAppStore((s) => s.currentProjectPath);
  const loadProjectSettings = useAppStore((s) => s.loadProjectSettings);
  const Content = TAB_CONTENT[activeTab];

  const hasProject = !!currentProjectPath;

  useEffect(() => {
    if (hasProject && currentProjectPath) {
      loadProjectSettings(currentProjectPath);
    }
  }, [hasProject, currentProjectPath, loadProjectSettings]);

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center">
      <div className="card w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Settings</h2>
            {hasProject && (
              <select
                className="input text-xs py-1 px-2 w-auto"
                value={scope}
                onChange={(e) => setScope(e.target.value as 'global' | 'project')}
              >
                <option value="global">Global</option>
                <option value="project">Project: {currentProjectPath?.split('/').pop()}</option>
              </select>
            )}
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {scope === 'project' && (
          <div className="px-6 py-2 bg-accent/5 border-b border-border">
            <p className="text-xs text-text-muted">
              Project settings override global settings and are saved to <code className="text-accent">.ddd/config.yaml</code>
            </p>
          </div>
        )}

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <nav className="w-48 border-r border-border p-2 shrink-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-bg-hover text-text-primary'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <Content />
          </div>
        </div>
      </div>
    </div>
  );
}
