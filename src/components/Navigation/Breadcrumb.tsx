import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ArrowLeft, GitBranch, Map, Lock, Unlock, Search, MessageSquare, BookOpen } from 'lucide-react';
import { useSheetStore } from '../../stores/sheet-store';
import { useProjectStore } from '../../stores/project-store';
import { useAppStore } from '../../stores/app-store';
import { useGitStore } from '../../stores/git-store';
import { useValidationStore } from '../../stores/validation-store';
import { useImplementationStore } from '../../stores/implementation-store';
import { useUndoStore } from '../../stores/undo-store';
import { useFlowStore } from '../../stores/flow-store';
import { useUiStore } from '../../stores/ui-store';
import { UnsavedChangesDialog } from '../shared/UnsavedChangesDialog';
import { ValidationBadge } from '../Validation/ValidationBadge';
import type { BreadcrumbSegment } from '../../types/sheet';

export function Breadcrumb() {
  const current = useSheetStore((s) => s.current);
  const navigateTo = useSheetStore((s) => s.navigateTo);
  const navigateUp = useSheetStore((s) => s.navigateUp);
  const domainConfigs = useProjectStore((s) => s.domainConfigs);
  const setView = useAppStore((s) => s.setView);
  const isDirty = useFlowStore((s) => s.isDirty);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const gitBranch = useGitStore((s) => s.branch);
  const gitPanelOpen = useGitStore((s) => s.panelOpen);
  const gitStaged = useGitStore((s) => s.staged);
  const gitUnstaged = useGitStore((s) => s.unstaged);
  const gitUntracked = useGitStore((s) => s.untracked);
  const toggleGitPanel = useGitStore((s) => s.togglePanel);
  const minimapVisible = useUiStore((s) => s.minimapVisible);
  const toggleMinimap = useUiStore((s) => s.toggleMinimap);
  const isLocked = useUiStore((s) => s.isLocked);
  const toggleLock = useUiStore((s) => s.toggleLock);
  const specsPanelOpen = useUiStore((s) => s.specsPanelOpen);
  const toggleSpecsPanel = useUiStore((s) => s.toggleSpecsPanel);
  const syncFlash = useUiStore((s) => s.syncFlash);
  const syncScore = useImplementationStore((s) => s.syncScore);
  const pendingAnnotations = syncScore?.annotated ?? 0;
  const totalChanges = gitStaged.length + gitUnstaged.length + gitUntracked.length;

  const requestGoToLauncher = () => {
    if (isDirty) {
      setShowUnsavedDialog(true);
    } else {
      setView('launcher');
    }
  };

  const segments = useMemo(() => {
    const result: BreadcrumbSegment[] = [
      { label: 'System', location: { level: 'system' } },
    ];

    if (current.level === 'domain' || current.level === 'flow') {
      const domainId = current.domainId!;
      const domainName = domainConfigs[domainId]?.name ?? domainId;
      result.push({
        label: domainName,
        location: { level: 'domain', domainId },
      });
    }

    if (current.level === 'flow') {
      const domainId = current.domainId!;
      const flowId = current.flowId!;
      const domain = domainConfigs[domainId];
      const flowName =
        domain?.flows.find((f) => f.id === flowId)?.name ?? flowId;
      result.push({
        label: flowName,
        location: { level: 'flow', domainId, flowId },
      });
    }

    return result;
  }, [current, domainConfigs]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+S — flush debounce and save current flow immediately (global, works from text inputs too)
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        if (useFlowStore.getState().currentFlow) {
          e.preventDefault();
          useFlowStore.getState().saveNow();
        }
        return;
      }

      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target.isContentEditable) {
        return;
      }

      // Cmd+Z / Cmd+Shift+Z / Cmd+Y — undo/redo
      if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
        const flowId = useFlowStore.getState().currentFlow?.flow?.id;
        if (flowId) {
          e.preventDefault();
          if (e.shiftKey) {
            useUndoStore.getState().redo(flowId);
          } else {
            useUndoStore.getState().undo(flowId);
          }
        }
        return;
      }

      // Cmd+Y — alternative redo
      if (e.key === 'y' && (e.metaKey || e.ctrlKey)) {
        const flowId = useFlowStore.getState().currentFlow?.flow?.id;
        if (flowId) {
          e.preventDefault();
          useUndoStore.getState().redo(flowId);
        }
        return;
      }

      // Cmd+Shift+M toggles Minimap
      if (e.key === 'm' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        toggleMinimap();
        return;
      }

      // Cmd+R reloads project from disk
      if (e.key === 'r' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        useProjectStore.getState().reloadProject();
        return;
      }

      // Cmd+K opens search palette
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        useUiStore.getState().openSearch();
        return;
      }

      // Cmd+Shift+L toggles project lock
      if (e.key === 'l' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        toggleLock();
        return;
      }

      if (e.key === 'Escape') {
        if (useValidationStore.getState().panelOpen) return;
        e.preventDefault();
        if (current.level === 'system') {
          requestGoToLauncher();
        } else {
          navigateUp();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [current.level, navigateUp, setView, toggleMinimap, toggleLock, isDirty]);

  return (
    <>
    {showUnsavedDialog && (
      <UnsavedChangesDialog
        onSave={async () => {
          await useFlowStore.getState().saveNow();
          setShowUnsavedDialog(false);
          setView('launcher');
        }}
        onDiscard={() => {
          setShowUnsavedDialog(false);
          setView('launcher');
        }}
        onCancel={() => setShowUnsavedDialog(false)}
      />
    )}
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-secondary min-h-[44px]">
      <button
        className="btn-ghost text-xs px-2 py-1"
        onClick={requestGoToLauncher}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Launcher
      </button>

      <div className="w-px h-5 bg-border mx-1" />

      <nav className="flex items-center gap-1">
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          return (
            <div key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              )}
              {isLast ? (
                <span className="flex items-center gap-1 text-sm font-medium text-text-primary px-1.5 py-0.5">
                  {segment.label}
                  {isDirty && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                      title="Unsaved changes"
                    />
                  )}
                </span>
              ) : (
                <button
                  className="text-sm text-text-secondary hover:text-text-primary px-1.5 py-0.5 rounded transition-colors"
                  onClick={() => navigateTo(segment.location)}
                >
                  {segment.label}
                </button>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex-1" />

      {syncFlash && (
        <span className="flex items-center gap-1 text-xs text-green-400 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          Synced
        </span>
      )}

      {pendingAnnotations > 0 && (
        <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full">
          <MessageSquare className="w-3 h-3" />
          {pendingAnnotations} annotation{pendingAnnotations !== 1 ? 's' : ''}
        </span>
      )}

      <button
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        onClick={() => useUiStore.getState().openSearch()}
        title="Search (Cmd+K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="text-[10px] text-text-muted bg-bg-secondary border border-border rounded px-1 py-0.5 ml-1">
          ⌘K
        </kbd>
      </button>

      <ValidationBadge />

      <button
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
          specsPanelOpen
            ? 'bg-accent/20 text-accent'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
        }`}
        onClick={toggleSpecsPanel}
        title="Toggle Project Specs panel"
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Specs</span>
      </button>

      <button
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
          isLocked
            ? 'bg-amber-500/20 text-amber-400'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
        }`}
        onClick={toggleLock}
        title="Toggle project lock (Cmd+Shift+L)"
      >
        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        <span>{isLocked ? 'Locked' : 'Lock'}</span>
      </button>

      <button
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
          minimapVisible
            ? 'bg-accent/20 text-accent'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
        }`}
        onClick={toggleMinimap}
        title="Toggle minimap (Cmd+Shift+M)"
      >
        <Map className="w-3.5 h-3.5" />
      </button>

      <button
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
          gitPanelOpen
            ? 'bg-accent/20 text-accent'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
        }`}
        onClick={toggleGitPanel}
        title="Toggle Git panel"
      >
        <GitBranch className="w-3.5 h-3.5" />
        <span className="truncate max-w-[100px]">{gitBranch || 'git'}</span>
        {totalChanges > 0 && (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-accent text-white text-[10px] font-medium leading-none">
            {totalChanges > 9 ? '9+' : totalChanges}
          </span>
        )}
      </button>
    </div>
    </>
  );
}
