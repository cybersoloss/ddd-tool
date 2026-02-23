import type { WebSocketBroadcastSpec, NodeSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: WebSocketBroadcastSpec;
  onChange: (spec: WebSocketBroadcastSpec) => void;
}

export function WebSocketBroadcastSpecEditor({ spec, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Channel</label>
        <input
          className="input"
          value={spec.channel ?? ''}
          onChange={(e) => onChange({ ...spec, channel: e.target.value })}
          placeholder="e.g. shipment-$.shipment_id or live-metrics"
        />
        <p className="text-[10px] text-text-muted mt-0.5">Socket.io room / WS topic. Supports interpolation (e.g., user-{'$.user_id'}).</p>
      </div>
      <div>
        <label className="label">Event Name</label>
        <input
          className="input"
          value={spec.event_name ?? ''}
          onChange={(e) => onChange({ ...spec, event_name: e.target.value })}
          placeholder="e.g. position_update or metric_tick"
        />
        <p className="text-[10px] text-text-muted mt-0.5">WS event identifier sent to clients.</p>
      </div>
      <div>
        <label className="label">Payload</label>
        <input
          className="input"
          value={typeof spec.payload === 'string' ? spec.payload : JSON.stringify(spec.payload ?? {})}
          onChange={(e) => {
            const val = e.target.value;
            try {
              onChange({ ...spec, payload: JSON.parse(val) });
            } catch {
              onChange({ ...spec, payload: val });
            }
          }}
          placeholder="e.g. $.metrics_snapshot or {lat: '$.lat', lng: '$.lng'}"
        />
        <p className="text-[10px] text-text-muted mt-0.5">Variable reference ($.field) or inline object template.</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="include_sender"
          checked={spec.include_sender ?? false}
          onChange={(e) => onChange({ ...spec, include_sender: e.target.checked })}
        />
        <label htmlFor="include_sender" className="label mb-0">Include Sender</label>
        <span className="text-[10px] text-text-muted">Echo broadcast back to originating connection</span>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this broadcast..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="websocket_broadcast" onChange={onChange as (spec: NodeSpec) => void} />
    </div>
  );
}
