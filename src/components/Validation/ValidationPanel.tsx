import { useEffect } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, X, AlertCircle, AlertTriangle, Info, MousePointerClick } from 'lucide-react';
import { useValidationStore } from '../../stores/validation-store';
import { useFlowStore } from '../../stores/flow-store';
import type { ValidationIssue, ValidationScope } from '../../types/validation';

const SCOPE_TABS: { scope: ValidationScope; label: string }[] = [
  { scope: 'flow', label: 'Flow' },
  { scope: 'domain', label: 'Domain' },
  { scope: 'system', label: 'System' },
];

function SeverityIcon({ severity }: { severity: ValidationIssue['severity'] }) {
  switch (severity) {
    case 'error':
      return <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
    case 'warning':
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case 'info':
      return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  }
}

function IssueRow({ issue, onSelectNode }: { issue: ValidationIssue; onSelectNode?: (nodeId: string) => void }) {
  return (
    <div className="px-4 py-2 border-b border-border/50 hover:bg-bg-hover transition-colors">
      <div className="flex items-start gap-2">
        <SeverityIcon severity={issue.severity} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-primary">{issue.message}</p>
          {issue.suggestion && (
            <p className="text-[11px] text-text-muted mt-0.5">{issue.suggestion}</p>
          )}
        </div>
        {issue.nodeId && onSelectNode && (
          <button
            className="text-[10px] text-accent hover:text-accent/80 shrink-0 flex items-center gap-0.5"
            onClick={() => onSelectNode(issue.nodeId!)}
            title="Select node on canvas"
          >
            <MousePointerClick className="w-3 h-3" />
            Select
          </button>
        )}
      </div>
    </div>
  );
}

export function ValidationPanel() {
  const togglePanel = useValidationStore((s) => s.togglePanel);
  const panelScope = useValidationStore((s) => s.panelScope);
  const setPanelScope = useValidationStore((s) => s.setPanelScope);
  const domainResults = useValidationStore((s) => s.domainResults);
  const systemResult = useValidationStore((s) => s.systemResult);
  const getCurrentFlowResult = useValidationStore((s) => s.getCurrentFlowResult);
  const selectNode = useFlowStore((s) => s.selectNode);

  // Close on Escape — capture phase so it's handled before Breadcrumb navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        togglePanel();
      }
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [togglePanel]);

  // Get issues for current scope
  let issues: ValidationIssue[] = [];
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  if (panelScope === 'flow') {
    const result = getCurrentFlowResult();
    if (result) {
      issues = result.issues;
      errorCount = result.errorCount;
      warningCount = result.warningCount;
      infoCount = result.infoCount;
    }
  } else if (panelScope === 'domain') {
    // Aggregate all domain results
    for (const result of Object.values(domainResults)) {
      issues = [...issues, ...result.issues];
      errorCount += result.errorCount;
      warningCount += result.warningCount;
      infoCount += result.infoCount;
    }
  } else if (panelScope === 'system') {
    if (systemResult) {
      issues = systemResult.issues;
      errorCount = systemResult.errorCount;
      warningCount = systemResult.warningCount;
      infoCount = systemResult.infoCount;
    }
  }

  // Group by severity
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  const handleSelectNode = (nodeId: string) => {
    selectNode(nodeId);
  };

  // Header icon
  const HeaderIcon = errorCount > 0 ? ShieldX : warningCount > 0 ? ShieldAlert : ShieldCheck;
  const headerIconColor = errorCount > 0 ? 'text-red-400' : warningCount > 0 ? 'text-amber-400' : 'text-green-400';

  return (
    <div className="w-[340px] bg-bg-secondary border-l border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <HeaderIcon className={`w-4 h-4 ${headerIconColor} shrink-0`} />
        <span className="text-sm font-medium text-text-primary flex-1">
          Validation
        </span>
        <button
          className="btn-icon !p-1 shrink-0"
          onClick={togglePanel}
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scope tabs */}
      <div className="flex border-b border-border">
        {SCOPE_TABS.map((tab) => (
          <button
            key={tab.scope}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              panelScope === tab.scope
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setPanelScope(tab.scope)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary line */}
      <div className="px-4 py-2 border-b border-border text-xs text-text-secondary">
        {errorCount === 0 && warningCount === 0 && infoCount === 0 ? (
          <span className="text-text-muted">No issues found</span>
        ) : (
          <span>
            {errorCount > 0 && <span className="text-red-400">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>}
            {errorCount > 0 && (warningCount > 0 || infoCount > 0) && ', '}
            {warningCount > 0 && <span className="text-amber-400">{warningCount} warning{warningCount !== 1 ? 's' : ''}</span>}
            {warningCount > 0 && infoCount > 0 && ', '}
            {infoCount > 0 && <span className="text-blue-400">{infoCount} info</span>}
          </span>
        )}
      </div>

      {/* Scrollable issue list */}
      <div className="flex-1 overflow-y-auto">
        {issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
            <ShieldCheck className="w-8 h-8 text-green-400" />
            <p className="text-sm">All checks passed</p>
          </div>
        ) : (
          <>
            {errors.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-red-500/5 text-[10px] uppercase tracking-wider text-red-400 font-medium">
                  Errors ({errors.length})
                </div>
                {errors.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    onSelectNode={panelScope === 'flow' ? handleSelectNode : undefined}
                  />
                ))}
              </div>
            )}
            {warnings.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-amber-500/5 text-[10px] uppercase tracking-wider text-amber-400 font-medium">
                  Warnings ({warnings.length})
                </div>
                {warnings.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    onSelectNode={panelScope === 'flow' ? handleSelectNode : undefined}
                  />
                ))}
              </div>
            )}
            {infos.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-blue-500/5 text-[10px] uppercase tracking-wider text-blue-400 font-medium">
                  Info ({infos.length})
                </div>
                {infos.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    onSelectNode={panelScope === 'flow' ? handleSelectNode : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
