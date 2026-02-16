import { useState } from 'react';
import { useProjectStore } from '../../stores/project-store';

interface Props {
  flowId: string;
  currentDomainId: string;
  onClose: () => void;
  onMove: (targetDomainId: string) => void;
}

export function MoveFlowDialog({ flowId, currentDomainId, onClose, onMove }: Props) {
  const domainConfigs = useProjectStore((s) => s.domainConfigs);
  const otherDomains = Object.entries(domainConfigs).filter(
    ([id]) => id !== currentDomainId
  );
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="card p-6 w-[400px] space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-text-primary">Move Flow</h3>
        <p className="text-sm text-text-secondary">
          Move <strong>{flowId}</strong> to another domain:
        </p>

        {otherDomains.length === 0 ? (
          <p className="text-sm text-text-muted">No other domains available.</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {otherDomains.map(([id, config]) => (
              <label
                key={id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  selected === id ? 'bg-accent/10 border border-accent' : 'hover:bg-bg-hover border border-transparent'
                }`}
              >
                <input
                  type="radio"
                  name="target-domain"
                  value={id}
                  checked={selected === id}
                  onChange={() => setSelected(id)}
                  className="accent-accent"
                />
                <div>
                  <div className="text-sm text-text-primary">{config.name}</div>
                  {config.description && (
                    <div className="text-[10px] text-text-muted">{config.description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!selected}
            onClick={() => { if (selected) onMove(selected); }}
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
