import { useEffect } from 'react';
import { X, FlaskConical, RotateCcw } from 'lucide-react';
import { useAgentTestStore } from '../../stores/agent-test-store';
import { useFlowStore } from '../../stores/flow-store';
import { useSheetStore } from '../../stores/sheet-store';
import { TestInputForm } from './TestInputForm';
import { ExecutionTimeline } from './ExecutionTimeline';

export function AgentTestPanel() {
  const panelState = useAgentTestStore((s) => s.panelState);
  const currentSession = useAgentTestStore((s) => s.currentSession);
  const togglePanel = useAgentTestStore((s) => s.togglePanel);
  const startNewTest = useAgentTestStore((s) => s.startNewTest);
  const setInput = useAgentTestStore((s) => s.setInput);
  const runTest = useAgentTestStore((s) => s.runTest);
  const currentFlow = useFlowStore((s) => s.currentFlow);
  const current = useSheetStore((s) => s.current);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        togglePanel();
      }
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [togglePanel]);

  const handleStartTest = () => {
    if (current.domainId && current.flowId) {
      startNewTest(current.flowId, current.domainId);
    }
  };

  const handleSubmitInput = (input: Record<string, unknown>) => {
    setInput(input);
    runTest();
  };

  return (
    <div className="w-[380px] bg-bg-secondary border-l border-border flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <FlaskConical className="w-4 h-4 text-accent shrink-0" />
        <span className="text-sm font-medium text-text-primary flex-1">Agent Testing</span>
        <button className="btn-icon !p-1" onClick={togglePanel}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Idle: no flow or not agent flow */}
        {panelState === 'idle' && (
          <div className="text-center py-8 space-y-3">
            {!currentFlow || currentFlow.flow?.type !== 'agent' ? (
              <>
                <p className="text-xs text-text-muted">No agent flow selected.</p>
                <p className="text-[10px] text-text-muted">Navigate to an agent flow to test it.</p>
              </>
            ) : (
              <>
                <p className="text-xs text-text-secondary">
                  Ready to test: <strong>{currentFlow.flow?.name}</strong>
                </p>
                <button className="btn-primary text-xs" onClick={handleStartTest}>
                  <FlaskConical className="w-3.5 h-3.5" />
                  Configure Test
                </button>
              </>
            )}
          </div>
        )}

        {/* Configuring: input form */}
        {panelState === 'configuring' && (
          <TestInputForm onSubmit={handleSubmitInput} />
        )}

        {/* Running / Results: timeline */}
        {(panelState === 'running' || panelState === 'results') && currentSession && (
          <div className="space-y-4">
            {/* Status banner */}
            <div className={`rounded px-3 py-2 text-xs ${
              currentSession.status === 'running'
                ? 'bg-accent/10 text-accent'
                : currentSession.status === 'completed'
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger'
            }`}>
              {currentSession.status === 'running' && 'Running test...'}
              {currentSession.status === 'completed' && 'Test completed successfully'}
              {currentSession.status === 'failed' && 'Test failed'}
            </div>

            <ExecutionTimeline steps={currentSession.steps} />

            {panelState === 'results' && (
              <button
                className="btn-secondary w-full text-xs"
                onClick={handleStartTest}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Run Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
