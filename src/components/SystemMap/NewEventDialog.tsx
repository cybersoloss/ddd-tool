import { useState } from 'react';
import { X } from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';

interface NewEventDialogProps {
  sourceDomainId: string;
  targetDomainId: string;
  onClose: () => void;
}

export function NewEventDialog({ sourceDomainId, targetDomainId, onClose }: NewEventDialogProps) {
  const domainConfigs = useProjectStore((s) => s.domainConfigs);
  const addEventArrow = useProjectStore((s) => s.addEventArrow);

  const sourceDomain = domainConfigs[sourceDomainId];
  const targetDomain = domainConfigs[targetDomainId];

  const [eventName, setEventName] = useState('');
  const [fromFlow, setFromFlow] = useState('');
  const [handledByFlow, setHandledByFlow] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const sourceFlows = sourceDomain?.flows ?? [];
  const targetFlows = targetDomain?.flows ?? [];

  const handleSubmit = async () => {
    if (!eventName.trim()) return;
    setSaving(true);
    try {
      await addEventArrow(
        sourceDomainId,
        targetDomainId,
        eventName.trim(),
        fromFlow || undefined,
        handledByFlow || undefined,
        description.trim() || undefined
      );
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
        className="card p-6 w-[420px] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">New Event Arrow</h3>
          <button className="btn-ghost p-1" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 text-xs text-text-secondary">
          <span className="px-2 py-1 bg-bg-tertiary rounded">{sourceDomain?.name ?? sourceDomainId}</span>
          <span className="self-center">&rarr;</span>
          <span className="px-2 py-1 bg-bg-tertiary rounded">{targetDomain?.name ?? targetDomainId}</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Event Name *</label>
            <input
              className="w-full bg-bg-primary border border-border rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. order_placed"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-text-secondary mb-1 block">Publishing Flow</label>
              <select
                className="w-full bg-bg-primary border border-border rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                value={fromFlow}
                onChange={(e) => setFromFlow(e.target.value)}
              >
                <option value="">(none)</option>
                {sourceFlows.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-text-secondary mb-1 block">Consuming Flow</label>
              <select
                className="w-full bg-bg-primary border border-border rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                value={handledByFlow}
                onChange={(e) => setHandledByFlow(e.target.value)}
              >
                <option value="">(none)</option>
                {targetFlows.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
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
