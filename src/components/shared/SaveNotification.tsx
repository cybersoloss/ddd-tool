import { useRef, useEffect, useCallback } from 'react';
import { X, Copy, Terminal } from 'lucide-react';
import { useChangeHistoryStore } from '../../stores/change-history-store';
import { useAppStore } from '../../stores/app-store';
import type { ChangeHistoryEntry } from '../../types/change-history';

// Spec: always /ddd-implement + /ddd-test.
// Exception: if the ONLY changes are L1 (domain.yaml, not flow files), prepend /ddd-sync.
function generateCommands(entries: ChangeHistoryEntry[]): string[] {
  const onlyL1 = entries.length > 0 && entries.every((e) => e.scope.level === 'L1');
  if (onlyL1) return ['/ddd-sync', '/ddd-implement', '/ddd-test'];
  return ['/ddd-implement', '/ddd-test'];
}

function scopeLabel(entry: ChangeHistoryEntry): string {
  const level = `[${entry.scope.level}]`;
  const parts: string[] = [];
  if (entry.scope.domain) parts.push(entry.scope.domain);
  if (entry.scope.flow) parts.push(entry.scope.flow);
  const location = parts.join(' / ') || entry.spec_file;
  const pillar = entry.scope.pillar ? `  (${entry.scope.pillar})` : '';
  const action = entry.action === 'created' ? '  +new' : entry.action === 'deleted' ? '  −del' : '';
  return `${level} ${location}${pillar}${action}`;
}

export function SaveNotification() {
  const notification = useChangeHistoryStore((s) => s.notification);
  const notificationVisible = useChangeHistoryStore((s) => s.notificationVisible);
  const hideNotification = useChangeHistoryStore((s) => s.hideNotification);
  const dismissNotification = useChangeHistoryStore((s) => s.dismissNotification);
  const saveNotificationEnabled = useAppStore(
    (s) => s.settings.editor.saveNotification
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Auto-close hides the panel but keeps entries — next save re-opens with all of them
  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(hideNotification, 2000);
  }, [clearTimer, hideNotification]);

  // Start timer whenever panel becomes visible with entries
  useEffect(() => {
    if (notificationVisible && notification.length > 0) startTimer();
    return clearTimer;
  }, [notificationVisible, notification, startTimer, clearTimer]);

  if (saveNotificationEnabled === false || !notificationVisible || notification.length === 0) {
    return null;
  }

  const cmds = generateCommands(notification);
  const count = notification.length;

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] w-80 animate-in slide-in-from-bottom-2 fade-in"
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
    >
      <div className="card border border-accent/50 bg-surface-overlay shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-accent shrink-0" />
            <span className="text-sm font-medium text-text-primary">
              Saved — {count} change{count > 1 ? 's' : ''}
            </span>
          </div>
          <button onClick={dismissNotification} className="btn-icon -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Changed files */}
        <div className="px-3 py-2 space-y-1.5 border-b border-border-subtle max-h-32 overflow-y-auto">
          {notification.map((entry) => (
            <div key={entry.id}>
              <div className="text-xs text-text-primary font-mono">
                ● {scopeLabel(entry)}
              </div>
              <div className="text-[11px] text-text-muted font-mono ml-3 truncate">
                {entry.spec_file}
              </div>
            </div>
          ))}
        </div>

        {/* Commands */}
        <div className="px-3 pt-2 pb-1">
          <p className="text-xs text-text-muted mb-1.5">Run in Claude Code:</p>
          <div className="space-y-0.5">
            {cmds.map((cmd, i) => (
              <div key={i} className="text-xs text-accent font-mono">
                {cmd}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end px-3 py-2">
          <button
            className="btn-ghost text-xs flex items-center gap-1"
            onClick={() => navigator.clipboard.writeText(cmds.join('\n'))}
          >
            <Copy className="w-3 h-3" />
            Copy all
          </button>
          <button className="btn-ghost text-xs" onClick={dismissNotification}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
