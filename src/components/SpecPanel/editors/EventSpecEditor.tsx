import { useMemo } from 'react';
import type { EventNodeSpec } from '../../../types/flow';
import { useProjectStore } from '../../../stores/project-store';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: EventNodeSpec;
  onChange: (spec: EventNodeSpec) => void;
}

export function EventSpecEditor({ spec, onChange }: Props) {
  const direction = spec.direction ?? 'emit';
  const domainConfigs = useProjectStore((s) => s.domainConfigs);

  // Collect event names from domain config for autocomplete
  const eventSuggestions = useMemo(() => {
    const events = new Set<string>();
    for (const config of Object.values(domainConfigs)) {
      for (const e of config.publishes_events) {
        if (e.event) events.add(e.event);
      }
      for (const e of config.consumes_events) {
        if (e.event) events.add(e.event);
      }
    }
    return Array.from(events).sort();
  }, [domainConfigs]);

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Direction</label>
        <div className="flex gap-1">
          <button
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              direction === 'emit'
                ? 'bg-accent text-white'
                : 'bg-surface-2 text-text-muted hover:text-text-primary'
            }`}
            onClick={() => onChange({ ...spec, direction: 'emit' })}
          >
            Emit
          </button>
          <button
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              direction === 'consume'
                ? 'bg-accent text-white'
                : 'bg-surface-2 text-text-muted hover:text-text-primary'
            }`}
            onClick={() => onChange({ ...spec, direction: 'consume' })}
          >
            Consume
          </button>
        </div>
      </div>
      <div>
        <label className="label">Event Name</label>
        <input
          className="input"
          list="event-name-suggestions"
          value={spec.event_name ?? ''}
          onChange={(e) => onChange({ ...spec, event_name: e.target.value })}
          placeholder="e.g. order.created"
        />
        {eventSuggestions.length > 0 && (
          <datalist id="event-name-suggestions">
            {eventSuggestions.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
        )}
      </div>
      <div>
        <label className="label">Payload</label>
        <textarea
          className="input min-h-[60px] resize-y font-mono text-xs"
          value={JSON.stringify(spec.payload ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...spec, payload: JSON.parse(e.target.value) });
            } catch {
              // Keep raw while editing
            }
          }}
          placeholder="{}"
        />
      </div>
      <div>
        <label className="label">Payload Source</label>
        <input
          className="input"
          value={spec.payload_source ?? ''}
          onChange={(e) => onChange({ ...spec, payload_source: e.target.value })}
          placeholder="e.g. step.validate_order.output"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="label flex-1">Async</label>
        <button
          className={`relative w-9 h-5 rounded-full transition-colors ${
            spec.async ? 'bg-accent' : 'bg-surface-2'
          }`}
          onClick={() => onChange({ ...spec, async: !spec.async })}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              spec.async ? 'translate-x-4' : ''
            }`}
          />
        </button>
      </div>
      {direction === 'emit' && (
        <div className="border-t border-border/50 pt-2 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
            Queue Settings
          </p>
          <div>
            <label className="label">Target Queue</label>
            <input
              className="input"
              value={spec.target_queue ?? ''}
              onChange={(e) => onChange({ ...spec, target_queue: e.target.value || undefined })}
              placeholder="e.g. notifications"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label">Priority</label>
              <input
                type="number"
                className="input"
                value={spec.priority ?? ''}
                onChange={(e) => onChange({ ...spec, priority: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0"
              />
            </div>
            <div className="flex-1">
              <label className="label">Delay (ms)</label>
              <input
                type="number"
                className="input"
                value={spec.delay_ms ?? ''}
                onChange={(e) => onChange({ ...spec, delay_ms: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="label">Dedup Key</label>
            <input
              className="input"
              value={spec.dedup_key ?? ''}
              onChange={(e) => onChange({ ...spec, dedup_key: e.target.value || undefined })}
              placeholder="e.g. order_id"
            />
          </div>
        </div>
      )}
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this event..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="event" onChange={onChange} />
    </div>
  );
}
