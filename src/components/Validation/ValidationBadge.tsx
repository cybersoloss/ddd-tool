import { useCallback } from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { useValidationStore } from '../../stores/validation-store';
import { useSheetStore } from '../../stores/sheet-store';

export function ValidationBadge() {
  const panelOpen = useValidationStore((s) => s.panelOpen);
  const togglePanel = useValidationStore((s) => s.togglePanel);
  const getCurrentFlowResult = useValidationStore((s) => s.getCurrentFlowResult);
  const flowResults = useValidationStore((s) => s.flowResults);
  const domainResults = useValidationStore((s) => s.domainResults);
  const systemResult = useValidationStore((s) => s.systemResult);
  const validateProject = useValidationStore((s) => s.validateProject);
  const level = useSheetStore((s) => s.current.level);

  // At L3 (flow): show current flow result only
  // At L1/L2: show aggregated counts from ALL results
  let errorCount = 0;
  let warningCount = 0;

  if (level === 'flow') {
    const result = getCurrentFlowResult();
    errorCount = result?.errorCount ?? 0;
    warningCount = result?.warningCount ?? 0;
  } else {
    // Aggregate all flow results
    for (const fr of Object.values(flowResults)) {
      errorCount += fr.errorCount;
      warningCount += fr.warningCount;
    }
    // Aggregate all domain results
    for (const dr of Object.values(domainResults)) {
      errorCount += dr.errorCount;
      warningCount += dr.warningCount;
    }
    // Add system results
    if (systemResult) {
      errorCount += systemResult.errorCount;
      warningCount += systemResult.warningCount;
    }
  }

  const totalIssues = errorCount + warningCount;
  const Icon = errorCount > 0 ? ShieldX : warningCount > 0 ? ShieldAlert : ShieldCheck;

  const handleClick = useCallback(() => {
    if (level !== 'flow') {
      // At L1/L2: if no results exist yet, run project validation
      const hasResults =
        Object.keys(useValidationStore.getState().flowResults).length > 0 ||
        Object.keys(useValidationStore.getState().domainResults).length > 0 ||
        useValidationStore.getState().systemResult !== null;
      if (!hasResults) {
        validateProject();
      }
    }
    togglePanel();
  }, [level, togglePanel, validateProject]);

  return (
    <button
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
        panelOpen
          ? 'bg-accent/20 text-accent'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
      }`}
      onClick={handleClick}
      title="Toggle validation panel"
    >
      <Icon className="w-3.5 h-3.5" />
      <span>Validate</span>
      {totalIssues > 0 && (
        <span
          className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[10px] font-medium leading-none ${
            errorCount > 0 ? 'bg-red-500' : 'bg-amber-500'
          }`}
        >
          {totalIssues > 9 ? '9+' : totalIssues}
        </span>
      )}
    </button>
  );
}
