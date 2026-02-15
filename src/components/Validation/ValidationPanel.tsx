import { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, X, AlertCircle, AlertTriangle, Info, MousePointerClick, Copy, Check, ClipboardCopy } from 'lucide-react';
import { useValidationStore } from '../../stores/validation-store';
import { useFlowStore } from '../../stores/flow-store';
import type { ValidationIssue } from '../../types/validation';
import type { PanelScope } from '../../stores/validation-store';

const SCOPE_TABS: { scope: PanelScope; label: string }[] = [
  { scope: 'all', label: 'All' },
  { scope: 'flow', label: 'Flow' },
  { scope: 'domain', label: 'Domain' },
  { scope: 'system', label: 'System' },
];

function formatIssueText(issue: ValidationIssue): string {
  const severity = issue.severity.toUpperCase();
  const scope = issue.scope.toUpperCase();
  let text = `[${severity}] [${scope}] ${issue.message}`;
  if (issue.suggestion) {
    text += `\n  Suggestion: ${issue.suggestion}`;
  }
  return text;
}

function formatAllIssuesText(issues: ValidationIssue[]): string {
  if (issues.length === 0) return 'No validation issues found.';

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  const sections: string[] = [];

  if (errors.length > 0) {
    sections.push(`ERRORS (${errors.length}):\n${errors.map((i) => formatIssueText(i)).join('\n')}`);
  }
  if (warnings.length > 0) {
    sections.push(`WARNINGS (${warnings.length}):\n${warnings.map((i) => formatIssueText(i)).join('\n')}`);
  }
  if (infos.length > 0) {
    sections.push(`INFO (${infos.length}):\n${infos.map((i) => formatIssueText(i)).join('\n')}`);
  }

  return sections.join('\n\n');
}

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

function CopyIssueButton({ issue }: { issue: ValidationIssue }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(formatIssueText(issue));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail
    }
  }, [issue]);

  return (
    <button
      className={`shrink-0 p-0.5 rounded transition-colors ${
        copied ? 'text-green-400' : 'text-text-muted hover:text-text-primary opacity-0 group-hover/row:opacity-100'
      }`}
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy issue'}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function IssueRow({ issue, onSelectNode }: { issue: ValidationIssue; onSelectNode?: (nodeId: string) => void }) {
  return (
    <div className="group/row px-4 py-2 border-b border-border/50 hover:bg-bg-hover transition-colors">
      <div className="flex items-start gap-2">
        <SeverityIcon severity={issue.severity} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-primary">{issue.message}</p>
          {issue.suggestion && (
            <p className="text-[11px] text-text-muted mt-0.5">{issue.suggestion}</p>
          )}
        </div>
        <CopyIssueButton issue={issue} />
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

  const [copiedAll, setCopiedAll] = useState(false);

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
  } else if (panelScope === 'all') {
    // Aggregate from all scopes
    const flowResult = getCurrentFlowResult();
    if (flowResult) {
      issues = [...issues, ...flowResult.issues];
      errorCount += flowResult.errorCount;
      warningCount += flowResult.warningCount;
      infoCount += flowResult.infoCount;
    }
    for (const result of Object.values(domainResults)) {
      issues = [...issues, ...result.issues];
      errorCount += result.errorCount;
      warningCount += result.warningCount;
      infoCount += result.infoCount;
    }
    if (systemResult) {
      issues = [...issues, ...systemResult.issues];
      errorCount += systemResult.errorCount;
      warningCount += systemResult.warningCount;
      infoCount += systemResult.infoCount;
    }
  }

  // Group by severity
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  const handleSelectNode = (nodeId: string) => {
    selectNode(nodeId);
  };

  const handleCopyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatAllIssuesText(issues));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      // Clipboard API may fail
    }
  }, [issues]);

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

      {/* Summary line with Copy All */}
      <div className="px-4 py-2 border-b border-border text-xs text-text-secondary flex items-center justify-between">
        <span>
          {errorCount === 0 && warningCount === 0 && infoCount === 0 ? (
            <span className="text-text-muted">No issues found</span>
          ) : (
            <>
              {errorCount > 0 && <span className="text-red-400">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>}
              {errorCount > 0 && (warningCount > 0 || infoCount > 0) && ', '}
              {warningCount > 0 && <span className="text-amber-400">{warningCount} warning{warningCount !== 1 ? 's' : ''}</span>}
              {warningCount > 0 && infoCount > 0 && ', '}
              {infoCount > 0 && <span className="text-blue-400">{infoCount} info</span>}
            </>
          )}
        </span>
        {issues.length > 0 && (
          <button
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors ${
              copiedAll
                ? 'text-green-400'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
            }`}
            onClick={handleCopyAll}
            title="Copy all issues to clipboard"
          >
            {copiedAll ? <Check className="w-3 h-3" /> : <ClipboardCopy className="w-3 h-3" />}
            {copiedAll ? 'Copied' : 'Copy All'}
          </button>
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
