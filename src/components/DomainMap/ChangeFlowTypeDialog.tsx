interface Props {
  flowId: string;
  currentType: 'traditional' | 'agent';
  onClose: () => void;
  onConfirm: (newType: 'traditional' | 'agent') => void;
}

export function ChangeFlowTypeDialog({ flowId, currentType, onClose, onConfirm }: Props) {
  const newType = currentType === 'traditional' ? 'agent' : 'traditional';
  const isDowngrade = currentType === 'agent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="card p-6 w-[400px] space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-text-primary">Change Flow Type</h3>
        <p className="text-sm text-text-secondary">
          Change <strong>{flowId}</strong> from <strong>{currentType}</strong> to <strong>{newType}</strong>?
        </p>

        {isDowngrade && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-xs text-amber-400">
              Converting from agent to traditional will remove agent-specific nodes
              (agent_loop, guardrail, human_gate) from this flow.
            </p>
          </div>
        )}

        {!isDowngrade && (
          <p className="text-xs text-text-muted">
            An agent_loop node will be added and connected to the trigger.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className={isDowngrade ? 'btn-danger' : 'btn-primary'}
            onClick={() => onConfirm(newType)}
          >
            {isDowngrade ? 'Convert to Traditional' : 'Convert to Agent'}
          </button>
        </div>
      </div>
    </div>
  );
}
