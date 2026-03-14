import { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, X, ChevronDown, ChevronRight, Loader2, ClipboardCopy, Check, ExternalLink } from 'lucide-react';
import { useValidationStore } from '../../stores/validation-store';
import { useSheetStore } from '../../stores/sheet-store';
import type { ProjectValidationDomain } from '../../stores/validation-store';
import type { ValidationIssue } from '../../types/validation';

export function ProjectValidationPanel() {
  const togglePanel = useValidationStore((s) => s.togglePanel);
  const validatingProject = useValidationStore((s) => s.validatingProject);
  const validateProject = useValidationStore((s) => s.validateProject);
  const getProjectValidationSummary = useValidationStore((s) => s.getProjectValidationSummary);
  const flowResults = useValidationStore((s) => s.flowResults);
  const domainResults = useValidationStore((s) => s.domainResults);
  const systemResult = useValidationStore((s) => s.systemResult);
  const navigateToFlow = useSheetStore((s) => s.navigateToFlow);

  const summary = getProjectValidationSummary();
  const { totalErrors, totalWarnings, domains } = summary;

  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedFlows, setExpandedFlows] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

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

  const toggleDomain = useCallback((domainId: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainId)) next.delete(domainId);
      else next.add(domainId);
      return next;
    });
  }, []);

  const toggleFlow = useCallback((flowKey: string) => {
    setExpandedFlows((prev) => {
      const next = new Set(prev);
      if (next.has(flowKey)) next.delete(flowKey);
      else next.add(flowKey);
      return next;
    });
  }, []);

  const handleFlowNavigate = useCallback(
    (domainId: string, flowId: string) => {
      navigateToFlow(domainId, flowId);
      togglePanel();
    },
    [navigateToFlow, togglePanel]
  );

  const handleValidateAll = useCallback(() => {
    validateProject();
  }, [validateProject]);

  // Build full text for copy
  const handleCopyAll = useCallback(async () => {
    const lines: string[] = [];

    for (const domain of domains) {
      if (domain.errorCount === 0 && domain.warningCount === 0) continue;

      for (const flow of domain.flows) {
        const flowKey = `${domain.domainId}/${flow.flowId}`;
        const fr = flowResults[flowKey];
        if (!fr || fr.issues.length === 0) continue;

        lines.push(`--- ${domain.name} / ${flow.name} ---`);
        for (const issue of fr.issues) {
          const tag = issue.severity === 'error' ? 'ERROR' : issue.severity === 'warning' ? 'WARNING' : 'INFO';
          lines.push(`[${tag}] [${issue.scope.toUpperCase()}] ${issue.message}`);
          if (issue.suggestion) lines.push(`  Suggestion: ${issue.suggestion}`);
        }
        lines.push('');
      }

      // Domain-level issues
      const dr = domainResults[domain.domainId];
      if (dr && dr.issues.length > 0) {
        lines.push(`--- ${domain.name} (domain-level) ---`);
        for (const issue of dr.issues) {
          const tag = issue.severity === 'error' ? 'ERROR' : issue.severity === 'warning' ? 'WARNING' : 'INFO';
          lines.push(`[${tag}] [${issue.scope.toUpperCase()}] ${issue.message}`);
          if (issue.suggestion) lines.push(`  Suggestion: ${issue.suggestion}`);
        }
        lines.push('');
      }
    }

    // System-level issues
    if (systemResult && systemResult.issues.length > 0) {
      lines.push('--- System ---');
      for (const issue of systemResult.issues) {
        const tag = issue.severity === 'error' ? 'ERROR' : issue.severity === 'warning' ? 'WARNING' : 'INFO';
        lines.push(`[${tag}] [${issue.scope.toUpperCase()}] ${issue.message}`);
        if (issue.suggestion) lines.push(`  Suggestion: ${issue.suggestion}`);
      }
    }

    const text = lines.length > 0 ? lines.join('\n') : 'No validation issues found.';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail
    }
  }, [domains, flowResults, domainResults, systemResult]);

  const HeaderIcon = totalErrors > 0 ? ShieldX : totalWarnings > 0 ? ShieldAlert : ShieldCheck;
  const headerIconColor = totalErrors > 0 ? 'text-red-400' : totalWarnings > 0 ? 'text-amber-400' : 'text-green-400';

  return (
    <div className="w-[340px] bg-bg-secondary border-l border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <HeaderIcon className={`w-4 h-4 ${headerIconColor} shrink-0`} />
        <span className="text-sm font-medium text-text-primary flex-1">
          Project Validation
        </span>
        <button
          className="btn-icon !p-1 shrink-0"
          onClick={togglePanel}
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Summary line + Copy All */}
      <div className="px-4 py-2 border-b border-border text-xs text-text-secondary flex items-center justify-between">
        <span>
          {totalErrors === 0 && totalWarnings === 0 ? (
            <span className="text-text-muted">No issues found</span>
          ) : (
            <>
              {totalErrors > 0 && <span className="text-red-400">{totalErrors} error{totalErrors !== 1 ? 's' : ''}</span>}
              {totalErrors > 0 && totalWarnings > 0 && ', '}
              {totalWarnings > 0 && <span className="text-amber-400">{totalWarnings} warning{totalWarnings !== 1 ? 's' : ''}</span>}
            </>
          )}
        </span>
        {(totalErrors > 0 || totalWarnings > 0) && (
          <button
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors ${
              copied ? 'text-green-400' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
            }`}
            onClick={handleCopyAll}
            title="Copy all issues to clipboard"
          >
            {copied ? <Check className="w-3 h-3" /> : <ClipboardCopy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy All'}
          </button>
        )}
      </div>

      {/* Validate All button */}
      <div className="px-4 py-3 border-b border-border">
        <button
          className="btn-primary w-full flex items-center justify-center gap-2 text-xs"
          onClick={handleValidateAll}
          disabled={validatingProject}
        >
          {validatingProject ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              Validate All
            </>
          )}
        </button>
      </div>

      {/* Scrollable domain list */}
      <div className="flex-1 overflow-y-auto">
        {domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
            <ShieldCheck className="w-8 h-8 text-green-400" />
            <p className="text-sm">No domains to validate</p>
          </div>
        ) : (
          domains.map((domain) => (
            <DomainSection
              key={domain.domainId}
              domain={domain}
              expanded={expandedDomains.has(domain.domainId)}
              expandedFlows={expandedFlows}
              flowResults={flowResults}
              domainIssues={domainResults[domain.domainId]?.issues ?? []}
              onToggle={toggleDomain}
              onFlowToggle={toggleFlow}
              onFlowNavigate={handleFlowNavigate}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DomainSection({
  domain,
  expanded,
  expandedFlows,
  flowResults,
  domainIssues,
  onToggle,
  onFlowToggle,
  onFlowNavigate,
}: {
  domain: ProjectValidationDomain;
  expanded: boolean;
  expandedFlows: Set<string>;
  flowResults: Record<string, { issues: ValidationIssue[] }>;
  domainIssues: ValidationIssue[];
  onToggle: (domainId: string) => void;
  onFlowToggle: (flowKey: string) => void;
  onFlowNavigate: (domainId: string, flowId: string) => void;
}) {
  const isClean = domain.errorCount === 0 && domain.warningCount === 0;
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="border-b border-border/50">
      <button
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-bg-hover transition-colors text-left"
        onClick={() => onToggle(domain.domainId)}
      >
        <Chevron className="w-3.5 h-3.5 text-text-muted shrink-0" />
        <span className="text-xs font-medium text-text-primary flex-1 truncate">
          {domain.name}
        </span>
        {isClean ? (
          <ShieldCheck className="w-3.5 h-3.5 text-green-400 shrink-0" />
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            {domain.errorCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-medium leading-none px-1">
                {domain.errorCount > 99 ? '99+' : domain.errorCount}
              </span>
            )}
            {domain.warningCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-medium leading-none px-1">
                {domain.warningCount > 99 ? '99+' : domain.warningCount}
              </span>
            )}
          </div>
        )}
      </button>

      {expanded && (
        <div>
          {/* Domain-level issues */}
          {domainIssues.length > 0 && (
            <div className="pl-10 pr-4 py-1">
              <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Domain issues</p>
              {domainIssues.map((issue, i) => (
                <IssueRow key={i} issue={issue} />
              ))}
            </div>
          )}

          {/* Flow rows */}
          {domain.flows.length === 0 ? (
            <p className="px-4 py-2 text-[11px] text-text-muted pl-10">No flows</p>
          ) : (
            domain.flows.map((flow) => {
              const flowKey = `${domain.domainId}/${flow.flowId}`;
              const flowClean = flow.errorCount === 0 && flow.warningCount === 0;
              const flowExpanded = expandedFlows.has(flowKey);
              const fr = flowResults[flowKey];
              const issues = fr?.issues ?? [];
              const FlowChevron = flowExpanded ? ChevronDown : ChevronRight;

              return (
                <div key={flow.flowId}>
                  <div className="flex items-center gap-1 px-4 pl-10 py-1.5 hover:bg-bg-hover transition-colors">
                    {/* Expand toggle (only if has issues) */}
                    {!flowClean ? (
                      <button
                        className="shrink-0 p-0.5"
                        onClick={() => onFlowToggle(flowKey)}
                        title="Show/hide issues"
                      >
                        <FlowChevron className="w-3 h-3 text-text-muted" />
                      </button>
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}

                    {/* Flow name */}
                    <span className="text-[11px] text-text-secondary flex-1 truncate">
                      {flow.name}
                    </span>

                    {/* Counts */}
                    {flowClean ? (
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        {flow.errorCount > 0 && (
                          <span className="text-[10px] text-red-400">{flow.errorCount}E</span>
                        )}
                        {flow.warningCount > 0 && (
                          <span className="text-[10px] text-amber-400">{flow.warningCount}W</span>
                        )}
                      </div>
                    )}

                    {/* Navigate button */}
                    <button
                      className="shrink-0 p-0.5 text-text-muted hover:text-accent transition-colors"
                      onClick={() => onFlowNavigate(domain.domainId, flow.flowId)}
                      title={`Open ${flow.name}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Expanded issue list */}
                  {flowExpanded && issues.length > 0 && (
                    <div className="pl-[60px] pr-4 pb-1">
                      {issues.map((issue, i) => (
                        <IssueRow key={i} issue={issue} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const color = issue.severity === 'error' ? 'text-red-400' : issue.severity === 'warning' ? 'text-amber-400' : 'text-blue-400';
  const tag = issue.severity === 'error' ? 'ERR' : issue.severity === 'warning' ? 'WRN' : 'INF';

  return (
    <div className="py-0.5">
      <p className="text-[10px] leading-tight">
        <span className={`${color} font-medium`}>[{tag}]</span>{' '}
        <span className="text-text-secondary">{issue.message}</span>
      </p>
      {issue.suggestion && (
        <p className="text-[9px] text-text-muted leading-tight ml-3">
          {issue.suggestion}
        </p>
      )}
    </div>
  );
}
