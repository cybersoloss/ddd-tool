import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';
import type { EventWiring } from '../../types/domain';

interface EventWiringDialogProps {
  domainId: string;
  isLocked: boolean;
  onClose: () => void;
}

export function EventWiringDialog({ domainId, isLocked, onClose }: EventWiringDialogProps) {
  const domainConfigs = useProjectStore((s) => s.domainConfigs);
  const addEventWiring = useProjectStore((s) => s.addEventWiring);
  const updateEventWiring = useProjectStore((s) => s.updateEventWiring);
  const removeEventWiring = useProjectStore((s) => s.removeEventWiring);

  const domain = domainConfigs[domainId];
  if (!domain) return null;

  const flowOptions = domain.flows.map((f) => f.id);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="card p-6 w-[560px] max-h-[80vh] overflow-y-auto space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">
            Event Wiring: {domain.name}
          </h3>
          <button className="btn-ghost p-1" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <EventSection
          title="Published Events"
          events={domain.publishes_events}
          flowField="from_flow"
          flowOptions={flowOptions}
          isLocked={isLocked}
          onAdd={() => addEventWiring(domainId, 'publish', { event: '' })}
          onUpdate={(i, w) => updateEventWiring(domainId, 'publish', i, w)}
          onRemove={(i) => removeEventWiring(domainId, 'publish', i)}
        />

        <EventSection
          title="Consumed Events"
          events={domain.consumes_events}
          flowField="handled_by_flow"
          flowOptions={flowOptions}
          isLocked={isLocked}
          onAdd={() => addEventWiring(domainId, 'consume', { event: '' })}
          onUpdate={(i, w) => updateEventWiring(domainId, 'consume', i, w)}
          onRemove={(i) => removeEventWiring(domainId, 'consume', i)}
        />

        <div className="flex justify-end">
          <button className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface EventSectionProps {
  title: string;
  events: EventWiring[];
  flowField: 'from_flow' | 'handled_by_flow';
  flowOptions: string[];
  isLocked: boolean;
  onAdd: () => void;
  onUpdate: (index: number, wiring: EventWiring) => void;
  onRemove: (index: number) => void;
}

function EventSection({ title, events, flowField, flowOptions, isLocked, onAdd, onUpdate, onRemove }: EventSectionProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
        {title}
      </h4>

      {events.length === 0 && (
        <p className="text-xs text-text-muted italic">No events</p>
      )}

      {events.map((evt, index) => (
        <EventRow
          key={index}
          event={evt}
          flowField={flowField}
          flowOptions={flowOptions}
          isLocked={isLocked}
          onChange={(updated) => onUpdate(index, updated)}
          onRemove={() => onRemove(index)}
        />
      ))}

      {!isLocked && (
        <button
          className="btn-ghost text-xs flex items-center gap-1 text-accent"
          onClick={onAdd}
        >
          <Plus className="w-3 h-3" />
          Add Event
        </button>
      )}
    </div>
  );
}

interface EventRowProps {
  event: EventWiring;
  flowField: 'from_flow' | 'handled_by_flow';
  flowOptions: string[];
  isLocked: boolean;
  onChange: (updated: EventWiring) => void;
  onRemove: () => void;
}

function EventRow({ event, flowField, flowOptions, isLocked, onChange, onRemove }: EventRowProps) {
  const [localEvent, setLocalEvent] = useState(event.event);
  const [localFlow, setLocalFlow] = useState(event[flowField] || '');
  const [localDesc, setLocalDesc] = useState(event.description || '');

  const commit = (overrides: Partial<EventWiring> = {}) => {
    const updated: EventWiring = {
      ...event,
      event: localEvent,
      [flowField]: localFlow || undefined,
      description: localDesc || undefined,
      ...overrides,
    };
    onChange(updated);
  };

  return (
    <div className="flex items-start gap-2 p-2 bg-bg-tertiary rounded-lg">
      <div className="flex-1 space-y-1.5">
        <input
          className="w-full bg-bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
          placeholder="Event name"
          value={localEvent}
          disabled={isLocked}
          onChange={(e) => setLocalEvent(e.target.value)}
          onBlur={() => commit()}
        />
        <div className="flex gap-2">
          <select
            className="flex-1 bg-bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
            value={localFlow}
            disabled={isLocked}
            onChange={(e) => { setLocalFlow(e.target.value); commit({ [flowField]: e.target.value || undefined }); }}
          >
            <option value="">({flowField === 'from_flow' ? 'Publishing flow' : 'Consuming flow'})</option>
            {flowOptions.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <input
            className="flex-1 bg-bg-primary border border-border rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
            placeholder="Description"
            value={localDesc}
            disabled={isLocked}
            onChange={(e) => setLocalDesc(e.target.value)}
            onBlur={() => commit()}
          />
        </div>
      </div>
      {!isLocked && (
        <button
          className="p-1 text-text-muted hover:text-danger transition-colors shrink-0"
          onClick={onRemove}
          title="Remove event"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
