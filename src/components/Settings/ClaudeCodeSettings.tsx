import { useAppStore } from '../../stores/app-store';

export function ClaudeCodeSettings() {
  const settings = useAppStore((s) => s.settings);
  const saveSettings = useAppStore((s) => s.saveSettings);
  const cc = settings.claudeCode;

  const update = (partial: Partial<typeof cc>) => {
    saveSettings({
      ...settings,
      claudeCode: { ...cc, ...partial },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">
          Claude Code
        </h3>
        <p className="text-xs text-text-muted mb-4">
          Configure the Claude Code CLI integration for implementing flows.
        </p>
      </div>

      {/* Enabled toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="w-4 h-4 rounded accent-accent"
          checked={cc.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
        />
        <div>
          <span className="text-sm text-text-primary">Enable Claude Code integration</span>
          <p className="text-xs text-text-muted">Allow implementation via the Claude CLI</p>
        </div>
      </label>

      {/* Command */}
      <div>
        <label className="label">CLI Command</label>
        <input
          className="input w-full"
          value={cc.command}
          onChange={(e) => update({ command: e.target.value })}
          placeholder="claude"
        />
        <p className="text-xs text-text-muted mt-1">
          Path or command name for the Claude Code CLI
        </p>
      </div>
    </div>
  );
}
