import { useAppStore } from '../../stores/app-store';

export function EditorSettings() {
  const settings = useAppStore((s) => s.settings);
  const saveSettings = useAppStore((s) => s.saveSettings);
  const editor = settings.editor;

  function updateEditor(updates: Partial<typeof editor>) {
    saveSettings({
      ...settings,
      editor: { ...editor, ...updates },
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">
          Editor
        </h3>
        <p className="text-xs text-text-muted mb-4">
          Canvas and editor preferences.
        </p>
      </div>

      <div>
        <label className="label">Theme</label>
        <select
          className="select"
          value={editor.theme}
          onChange={(e) =>
            updateEditor({
              theme: e.target.value as 'light' | 'dark' | 'system',
            })
          }
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </div>

      <div>
        <label className="label">Font Size</label>
        <input
          type="number"
          className="input w-24"
          min={10}
          max={24}
          value={editor.fontSize}
          onChange={(e) =>
            updateEditor({ fontSize: parseInt(e.target.value, 10) || 14 })
          }
        />
      </div>

      <div>
        <label className="label">Auto-save Interval (seconds)</label>
        <input
          type="number"
          className="input w-24"
          min={0}
          max={300}
          value={editor.autoSaveInterval}
          onChange={(e) =>
            updateEditor({
              autoSaveInterval: parseInt(e.target.value, 10) || 0,
            })
          }
        />
        <p className="text-xs text-text-muted mt-1">0 to disable auto-save</p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={editor.gridSnap}
          onChange={(e) => updateEditor({ gridSnap: e.target.checked })}
          className="w-4 h-4 rounded accent-accent"
        />
        <span className="text-sm text-text-secondary">
          Snap nodes to grid
        </span>
      </label>
    </div>
  );
}
