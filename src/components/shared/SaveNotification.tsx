import { useRef, useEffect, useCallback } from 'react';
import { X, Copy, Terminal } from 'lucide-react';
import { useChangeHistoryStore } from '../../stores/change-history-store';
import { useAppStore } from '../../stores/app-store';
import type { ChangeHistoryEntry } from '../../types/change-history';

function generateCommands(entries: ChangeHistoryEntry[]): string[] {
  const cmds = new Set<string>();

  // Non-logic pillar changes (data / interface / infrastructure) → --all
  const hasPillarChanges = entries.some(
    (e) =>
      e.scope.pillar === 'data' ||
      e.scope.pillar === 'interface' ||
      e.scope.pillar === 'infrastructure'
  );
  if (hasPillarChanges) cmds.add('/ddd-implement --all');

  // L3 logic flow changes
  const l3Entries = entries.filter(
    (e) => e.scope.level === 'L3' && e.scope.pillar === 'logic'
  );
  const l3Domains = [
    ...new Set(l3Entries.map((e) => e.scope.domain).filter(Boolean)),
  ] as string[];

  if (l3Domains.length >= 3) {
    cmds.add('/ddd-implement --all');
  } else {
    for (const domain of l3Domains) {
      const domainFlows = l3Entries.filter((e) => e.scope.domain === domain);
      if (domainFlows.length >= 3) {
        cmds.add(`/ddd-implement ${domain}`);
      } else {
        for (const entry of domainFlows) {
          if (entry.scope.flow) {
            cmds.add(`/ddd-implement ${domain}/${entry.scope.flow}`);
          }
        }
      }
    }
  }

  // L2 domain config changes
  const l2Entries = entries.filter((e) => e.scope.level === 'L2');
  for (const entry of l2Entries) {
    if (entry.scope.domain) cmds.add(`/ddd-implement ${entry.scope.domain}`);
  }

  // L1 non-pillar entries (domain.yaml structural changes)
  const l1NoPillar = entries.filter(
    (e) => e.scope.level === 'L1' && !e.scope.pillar
  );
  if (l1NoPillar.length > 0) cmds.add('/ddd-sync');

  const result = [...cmds];
  result.push('/ddd-test --all');
  return result;
}

export function SaveNotification() {
  const notification = useChangeHistoryStore((s) => s.notification);
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

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(dismissNotification, 2000);
  }, [clearTimer, dismissNotification]);

  useEffect(() => {
    if (notification.length > 0) startTimer();
    return clearTimer;
  }, [notification, startTimer, clearTimer]);

  // Undefined (old settings without the key) should default to showing
  if (saveNotificationEnabled === false || notification.length === 0) return null;

  const cmds = generateCommands(notification);

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] w-80 animate-in slide-in-from-bottom-2 fade-in"
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
    >
      <div className="card border border-accent/50 bg-surface-overlay shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-accent shrink-0" />
            <span className="text-sm font-medium text-text-primary">
              {notification.length} spec{notification.length > 1 ? 's' : ''} saved
            </span>
          </div>
          <button onClick={dismissNotification} className="btn-icon -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 py-2 space-y-0.5 border-b border-border-subtle max-h-24 overflow-y-auto">
          {notification.map((entry) => (
            <div key={entry.id} className="text-xs text-text-muted font-mono truncate">
              {entry.spec_file}
            </div>
          ))}
        </div>

        <div className="px-3 pt-2 pb-1">
          <p className="text-xs text-text-muted mb-1">Run next:</p>
          <div className="space-y-0.5">
            {cmds.map((cmd, i) => (
              <div key={i} className="text-xs text-accent font-mono">
                {cmd}
              </div>
            ))}
          </div>
        </div>

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
