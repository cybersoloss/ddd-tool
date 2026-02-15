import { useState } from 'react';
import { X } from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';

interface NewFlowEventDialogProps {
  domainId: string;
  sourceFlowId: string;
  targetFlowId: string;
  onClose: () => void;
}

export function NewFlowEventDialog({ domainId, sourceFlowId, targetFlowId, onClose }: NewFlowEventDialogProps) {
  const domainConfigs = useProjectStore((s) => s.domainConfigs);
  const addEventWiring = useProjectStore((s) => s.addEventWiring);

  const domain = domainConfigs[domainId];
  const sourceFlow = domain?.flows.find((f) => f.id === sourceFlowId);
  const targetFlow = domain?.flows.find((f) => f.id === targetFlowId);

  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!eventName.trim()) return;
    setSaving(true);
    try {
      await addEventWiring(domainId, 'publish', {
        event: eventName.trim(),
        from_flow: sourceFlowId,
        description: description.trim() || undefined,
      });
      await addEventWiring(domainId, 'consume', {
        event: eventName.trim(),
        handled_by_flow: targetFlowId,
        description: description.trim() || undefined,
      });
      onClose();
    } catch {
      // Silent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="card p-6 w-[380px] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">New Flow Event</h3>
          <button className="btn-ghost p-1" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 text-xs text-text-secondary">
          <span className="px-2 py-1 bg-bg-tertiary rounded">{sourceFlow?.name ?? sourceFlowId}</span>
          <span className="self-center">&rarr;</span>
          <span className="px-2 py-1 bg-bg-tertiary rounded">{targetFlow?.name ?? targetFlowId}</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Event Name *</label>
            <input
              className="w-full bg-bg-primary border border-border rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. order_validated"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Description</label>
            <input
              className="w-full bg-bg-primary border border-border rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!eventName.trim() || saving}
          >
            {saving ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
