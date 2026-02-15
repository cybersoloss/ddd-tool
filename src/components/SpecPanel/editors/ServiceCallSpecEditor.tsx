import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ServiceCallSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: ServiceCallSpec;
  onChange: (spec: ServiceCallSpec) => void;
}

export function ServiceCallSpecEditor({ spec, onChange }: Props) {
  const [reqConfigOpen, setReqConfigOpen] = useState(false);
  const reqConfig = spec.request_config ?? {};

  const updateReqConfig = (updates: Partial<NonNullable<ServiceCallSpec['request_config']>>) => {
    onChange({ ...spec, request_config: { ...reqConfig, ...updates } });
  };

  const delay = reqConfig.delay ?? {};
  const updateDelay = (updates: Partial<NonNullable<typeof delay>>) => {
    updateReqConfig({ delay: { ...delay, ...updates } });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Method</label>
        <select
          className="input"
          value={spec.method ?? 'GET'}
          onChange={(e) => onChange({ ...spec, method: e.target.value as ServiceCallSpec['method'] })}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>
      <div>
        <label className="label">URL</label>
        <input
          className="input"
          value={spec.url ?? ''}
          onChange={(e) => onChange({ ...spec, url: e.target.value })}
          placeholder="e.g. https://api.example.com/resource"
        />
      </div>
      <div>
        <label className="label">Headers</label>
        <textarea
          className="input min-h-[60px] resize-y font-mono text-xs"
          value={JSON.stringify(spec.headers ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...spec, headers: JSON.parse(e.target.value) });
            } catch {
              // Keep raw while editing
            }
          }}
          placeholder='{"Content-Type": "application/json"}'
        />
      </div>
      <div>
        <label className="label">Body</label>
        <textarea
          className="input min-h-[60px] resize-y font-mono text-xs"
          value={JSON.stringify(spec.body ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...spec, body: JSON.parse(e.target.value) });
            } catch {
              // Keep raw while editing
            }
          }}
          placeholder="{}"
        />
      </div>
      <div>
        <label className="label">Timeout (ms)</label>
        <input
          type="number"
          className="input"
          value={spec.timeout_ms ?? 5000}
          onChange={(e) => onChange({ ...spec, timeout_ms: Number(e.target.value) })}
        />
      </div>
      <div>
        <label className="label text-xs font-medium text-text-muted uppercase tracking-wider">Retry</label>
        <div className="space-y-2 ml-2 mt-1">
          <div>
            <label className="label">Max Attempts</label>
            <input
              type="number"
              className="input"
              value={spec.retry?.max_attempts ?? 3}
              onChange={(e) =>
                onChange({
                  ...spec,
                  retry: { ...spec.retry, max_attempts: Number(e.target.value) },
                })
              }
            />
          </div>
          <div>
            <label className="label">Backoff (ms)</label>
            <input
              type="number"
              className="input"
              value={spec.retry?.backoff_ms ?? 1000}
              onChange={(e) =>
                onChange({
                  ...spec,
                  retry: { ...spec.retry, backoff_ms: Number(e.target.value) },
                })
              }
            />
          </div>
          <div>
            <label className="label">Strategy</label>
            <select
              className="input"
              value={spec.retry?.strategy ?? 'fixed'}
              onChange={(e) =>
                onChange({
                  ...spec,
                  retry: { ...spec.retry, strategy: e.target.value as 'fixed' | 'linear' | 'exponential' },
                })
              }
            >
              <option value="fixed">Fixed</option>
              <option value="linear">Linear</option>
              <option value="exponential">Exponential</option>
            </select>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              className="accent-accent"
              checked={spec.retry?.jitter ?? false}
              onChange={(e) =>
                onChange({
                  ...spec,
                  retry: { ...spec.retry, jitter: e.target.checked },
                })
              }
            />
            Jitter
          </label>
        </div>
      </div>
      <div>
        <label className="label">Error Mapping</label>
        <textarea
          className="input min-h-[60px] resize-y font-mono text-xs"
          value={JSON.stringify(spec.error_mapping ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...spec, error_mapping: JSON.parse(e.target.value) });
            } catch {
              // Keep raw while editing
            }
          }}
          placeholder='{"404": "not_found", "500": "server_error"}'
        />
      </div>
      <div>
        <label className="label">Integration</label>
        <input
          className="input"
          value={spec.integration ?? ''}
          onChange={(e) => onChange({ ...spec, integration: e.target.value || undefined })}
          placeholder="e.g. stripe, twilio (ref to system.yaml)"
        />
      </div>

      {/* Request Config */}
      <div className="border-t border-border/50 pt-2">
        <button
          className="flex items-center gap-1.5 w-full"
          onClick={() => setReqConfigOpen(!reqConfigOpen)}
        >
          {reqConfigOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          )}
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
            Request Config
          </span>
        </button>
        {reqConfigOpen && (
          <div className="space-y-2 ml-2 mt-2">
            <div>
              <label className="label">User Agent</label>
              <select
                className="input"
                value={reqConfig.user_agent ?? ''}
                onChange={(e) => updateReqConfig({ user_agent: (e.target.value || undefined) as ServiceCallSpec['request_config'] extends infer T ? T extends { user_agent?: infer U } ? U : never : never })}
              >
                <option value="">Default</option>
                <option value="rotate">Rotate</option>
                <option value="browser">Browser</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label">Delay Min (ms)</label>
                <input
                  type="number"
                  className="input"
                  value={delay.min_ms ?? ''}
                  onChange={(e) => updateDelay({ min_ms: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                />
              </div>
              <div className="flex-1">
                <label className="label">Delay Max (ms)</label>
                <input
                  type="number"
                  className="input"
                  value={delay.max_ms ?? ''}
                  onChange={(e) => updateDelay({ max_ms: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="label">Delay Strategy</label>
              <select
                className="input"
                value={delay.strategy ?? ''}
                onChange={(e) => updateDelay({ strategy: (e.target.value || undefined) as 'random' | 'fixed' | undefined })}
              >
                <option value="">Default</option>
                <option value="random">Random</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
            <div>
              <label className="label">Cookie Jar</label>
              <select
                className="input"
                value={reqConfig.cookie_jar ?? ''}
                onChange={(e) => updateReqConfig({ cookie_jar: (e.target.value || undefined) as 'per_domain' | 'shared' | 'none' | undefined })}
              >
                <option value="">Default</option>
                <option value="per_domain">Per Domain</option>
                <option value="shared">Shared</option>
                <option value="none">None</option>
              </select>
            </div>
            <div>
              <label className="label">Proxy</label>
              <select
                className="input"
                value={reqConfig.proxy ?? ''}
                onChange={(e) => updateReqConfig({ proxy: (e.target.value || undefined) as 'pool' | 'direct' | 'tor' | undefined })}
              >
                <option value="">Default</option>
                <option value="pool">Pool</option>
                <option value="direct">Direct</option>
                <option value="tor">Tor</option>
              </select>
            </div>
            <div>
              <label className="label">TLS Fingerprint</label>
              <select
                className="input"
                value={reqConfig.tls_fingerprint ?? ''}
                onChange={(e) => updateReqConfig({ tls_fingerprint: (e.target.value || undefined) as 'randomize' | 'chrome' | 'firefox' | 'default' | undefined })}
              >
                <option value="">Default</option>
                <option value="randomize">Randomize</option>
                <option value="chrome">Chrome</option>
                <option value="firefox">Firefox</option>
                <option value="default">Browser Default</option>
              </select>
            </div>
            <div>
              <label className="label">Fallback</label>
              <select
                className="input"
                value={reqConfig.fallback ?? ''}
                onChange={(e) => updateReqConfig({ fallback: (e.target.value || undefined) as 'headless_browser' | 'none' | undefined })}
              >
                <option value="">Default</option>
                <option value="headless_browser">Headless Browser</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this service call..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="service_call" onChange={onChange} />
    </div>
  );
}
