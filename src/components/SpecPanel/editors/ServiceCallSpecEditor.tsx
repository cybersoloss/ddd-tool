import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import type { ServiceCallSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: ServiceCallSpec;
  onChange: (spec: ServiceCallSpec) => void;
}

export function ServiceCallSpecEditor({ spec, onChange }: Props) {
  const [reqConfigOpen, setReqConfigOpen] = useState(false);
  const [oauthOpen, setOauthOpen] = useState(!!spec.oauth_config);
  const [oauth1aOpen, setOauth1aOpen] = useState(!!spec.oauth1a_config);
  const [fallbackOpen, setFallbackOpen] = useState(!!spec.fallback);
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
      <div>
        <label className="label">Capture Headers</label>
        <div className="space-y-1">
          {(spec.capture_headers ?? []).map((h, i) => (
            <div key={i} className="flex gap-1 items-center">
              <input
                className="input text-xs flex-1"
                value={h}
                onChange={(e) => {
                  const updated = [...(spec.capture_headers ?? [])];
                  updated[i] = e.target.value;
                  onChange({ ...spec, capture_headers: updated });
                }}
                placeholder="x-restli-id"
              />
              <button
                className="btn-icon !p-0.5"
                onClick={() => {
                  const updated = (spec.capture_headers ?? []).filter((_, j) => j !== i);
                  onChange({ ...spec, capture_headers: updated.length ? updated : undefined });
                }}
              >
                <X className="w-3 h-3 text-danger" />
              </button>
            </div>
          ))}
          <button
            className="flex items-center gap-1 text-[10px] text-accent hover:text-accent-hover"
            onClick={() => onChange({ ...spec, capture_headers: [...(spec.capture_headers ?? []), ''] })}
          >
            <Plus className="w-2.5 h-2.5" /> Add header
          </button>
        </div>
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

      {/* OAuth Config */}
      <div className="border-t border-border/50 pt-2">
        <button
          className="flex items-center gap-1.5 w-full"
          onClick={() => setOauthOpen(!oauthOpen)}
        >
          {oauthOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          )}
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
            OAuth Config
          </span>
        </button>
        {oauthOpen && (
          <div className="space-y-2 ml-2 mt-2">
            <div>
              <label className="label">Token Store</label>
              <input
                className="input"
                value={spec.oauth_config?.token_store ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v && !spec.oauth_config?.refresh_url && !spec.oauth_config?.client_id_env && !spec.oauth_config?.client_secret_env) {
                    onChange({ ...spec, oauth_config: undefined });
                  } else {
                    onChange({ ...spec, oauth_config: { token_store: v, refresh_url: spec.oauth_config?.refresh_url ?? '', client_id_env: spec.oauth_config?.client_id_env ?? '', client_secret_env: spec.oauth_config?.client_secret_env ?? '' } });
                  }
                }}
                placeholder="e.g. $.oauth_tokens.google"
              />
            </div>
            <div>
              <label className="label">Refresh URL</label>
              <input
                className="input"
                value={spec.oauth_config?.refresh_url ?? ''}
                onChange={(e) => onChange({ ...spec, oauth_config: { token_store: spec.oauth_config?.token_store ?? '', refresh_url: e.target.value, client_id_env: spec.oauth_config?.client_id_env ?? '', client_secret_env: spec.oauth_config?.client_secret_env ?? '' } })}
                placeholder="e.g. https://oauth2.googleapis.com/token"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label">Client ID Env</label>
                <input
                  className="input"
                  value={spec.oauth_config?.client_id_env ?? ''}
                  onChange={(e) => onChange({ ...spec, oauth_config: { token_store: spec.oauth_config?.token_store ?? '', refresh_url: spec.oauth_config?.refresh_url ?? '', client_id_env: e.target.value, client_secret_env: spec.oauth_config?.client_secret_env ?? '' } })}
                  placeholder="e.g. GOOGLE_CLIENT_ID"
                />
              </div>
              <div className="flex-1">
                <label className="label">Client Secret Env</label>
                <input
                  className="input"
                  value={spec.oauth_config?.client_secret_env ?? ''}
                  onChange={(e) => onChange({ ...spec, oauth_config: { token_store: spec.oauth_config?.token_store ?? '', refresh_url: spec.oauth_config?.refresh_url ?? '', client_id_env: spec.oauth_config?.client_id_env ?? '', client_secret_env: e.target.value } })}
                  placeholder="e.g. GOOGLE_CLIENT_SECRET"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* OAuth 1.0a Config */}
      <div className="border-t border-border/50 pt-2">
        <button
          className="flex items-center gap-1.5 w-full"
          onClick={() => setOauth1aOpen(!oauth1aOpen)}
        >
          {oauth1aOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          )}
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
            OAuth 1.0a Config
          </span>
        </button>
        {oauth1aOpen && (
          <div className="space-y-2 ml-2 mt-2">
            <p className="text-[10px] text-text-muted">HMAC-SHA1 signing. All 4 credential fields required. Reference decrypted values from flow context.</p>
            {(
              [
                { key: 'api_key_field', label: 'API Key Field', placeholder: '$.credentials.api_key' },
                { key: 'api_key_secret_field', label: 'API Key Secret Field', placeholder: '$.credentials.api_key_secret' },
                { key: 'access_token_field', label: 'Access Token Field', placeholder: '$.credentials.access_token' },
                { key: 'access_token_secret_field', label: 'Access Token Secret Field', placeholder: '$.credentials.access_token_secret' },
              ] as const
            ).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input
                  className="input"
                  value={spec.oauth1a_config?.[key] ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    const current = spec.oauth1a_config ?? { api_key_field: '', api_key_secret_field: '', access_token_field: '', access_token_secret_field: '' };
                    const updated = { ...current, [key]: v };
                    const isEmpty = Object.values(updated).every(s => !s);
                    onChange({ ...spec, oauth1a_config: isEmpty ? undefined : updated });
                  }}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fallback */}
      <div className="border-t border-border/50 pt-2">
        <button
          className="flex items-center gap-1.5 w-full"
          onClick={() => setFallbackOpen(!fallbackOpen)}
        >
          {fallbackOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          )}
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
            Fallback
          </span>
        </button>
        {fallbackOpen && (
          <div className="space-y-2 ml-2 mt-2">
            <div>
              <label className="label">Fallback Value (JSON)</label>
              <textarea
                className="input min-h-[60px] resize-y font-mono text-xs"
                value={spec.fallback?.value !== undefined ? JSON.stringify(spec.fallback.value, null, 2) : ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw.trim()) {
                    onChange({ ...spec, fallback: spec.fallback?.log ? { value: null, log: spec.fallback.log } : undefined });
                    return;
                  }
                  try {
                    onChange({ ...spec, fallback: { ...spec.fallback, value: JSON.parse(raw) } });
                  } catch {
                    // Keep raw while editing
                  }
                }}
                placeholder="null"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                className="accent-accent"
                checked={spec.fallback?.log ?? false}
                onChange={(e) => onChange({ ...spec, fallback: { value: spec.fallback?.value ?? null, log: e.target.checked } })}
              />
              Log Fallback
            </label>
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
