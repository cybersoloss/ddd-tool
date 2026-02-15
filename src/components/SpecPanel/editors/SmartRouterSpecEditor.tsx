import { nanoid } from 'nanoid';
import { Plus, Trash2 } from 'lucide-react';
import type { SmartRouterSpec, SmartRouterRule } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: SmartRouterSpec;
  onChange: (spec: SmartRouterSpec) => void;
}

export function SmartRouterSpecEditor({ spec, onChange }: Props) {
  const rules = Array.isArray(spec.rules) ? spec.rules : [];
  const llm = spec.llm_routing ?? { enabled: false, model: 'claude-haiku', routing_prompt: '', confidence_threshold: 0.8, routes: {} };
  const fallbackChain = Array.isArray(spec.fallback_chain) ? spec.fallback_chain : [];
  const policies = spec.policies ?? {};
  const retry = policies.retry ?? { max_attempts: 3, on_failure: 'fallback' };
  const timeout = policies.timeout ?? { per_route: 30, total: 120 };
  const cb = policies.circuit_breaker ?? { enabled: false, failure_threshold: 5, timeout_seconds: 60 };

  const addRule = () => {
    const rule: SmartRouterRule = { id: nanoid(6), condition: '', route: '', priority: 0 };
    onChange({ ...spec, rules: [...rules, rule] });
  };

  const updateRule = (index: number, updates: Partial<SmartRouterRule>) => {
    const updated = rules.map((r, i) => (i === index ? { ...r, ...updates } : r));
    onChange({ ...spec, rules: updated });
  };

  const removeRule = (index: number) => {
    onChange({ ...spec, rules: rules.filter((_, i) => i !== index) });
  };

  const updateLlm = (updates: Partial<typeof llm>) => {
    onChange({ ...spec, llm_routing: { ...llm, ...updates } });
  };

  const updatePolicies = (section: string, updates: Record<string, unknown>) => {
    onChange({
      ...spec,
      policies: {
        ...policies,
        [section]: { ...(policies as Record<string, unknown>)[section] as Record<string, unknown>, ...updates },
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Rules */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label !mb-0">Rules</label>
          <button type="button" className="btn-icon !p-0.5" onClick={addRule} title="Add rule">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {rules.length === 0 && (
          <p className="text-xs text-text-muted">No rules defined</p>
        )}
        <div className="space-y-2">
          {rules.map((rule, i) => (
            <div key={rule.id} className="bg-bg-primary rounded p-2 space-y-1.5">
              <div className="flex items-center gap-1">
                <input
                  className="input py-1 text-xs flex-1"
                  value={rule.condition}
                  onChange={(e) => updateRule(i, { condition: e.target.value })}
                  placeholder="Condition"
                />
                <button type="button" className="btn-icon !p-0.5" onClick={() => removeRule(i)}>
                  <Trash2 className="w-3 h-3 text-text-muted hover:text-red-400" />
                </button>
              </div>
              <div className="flex gap-1">
                <input
                  className="input py-1 text-xs flex-1"
                  value={rule.route}
                  onChange={(e) => updateRule(i, { route: e.target.value })}
                  placeholder="Route target"
                />
                <input
                  type="number"
                  className="input py-1 text-xs w-16"
                  value={rule.priority ?? 0}
                  onChange={(e) => updateRule(i, { priority: parseInt(e.target.value) || 0 })}
                  placeholder="Pri"
                  title="Priority"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LLM Routing */}
      <div>
        <label className="label">LLM Routing</label>
        <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer mb-2">
          <input
            type="checkbox"
            className="accent-accent"
            checked={llm.enabled ?? false}
            onChange={(e) => updateLlm({ enabled: e.target.checked })}
          />
          Enable LLM-based routing
        </label>
        {llm.enabled && (
          <div className="space-y-2 pl-2 border-l-2 border-cyan-500/30">
            <div>
              <label className="text-[10px] text-text-muted">Model</label>
              <select
                className="input py-1 text-xs"
                value={llm.model ?? 'claude-haiku'}
                onChange={(e) => updateLlm({ model: e.target.value })}
              >
                {['claude-haiku', 'claude-sonnet', 'gpt-4o-mini', 'custom'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-text-muted">Routing Prompt</label>
              <textarea
                className="input min-h-[60px] resize-y text-xs"
                value={llm.routing_prompt ?? ''}
                onChange={(e) => updateLlm({ routing_prompt: e.target.value })}
                placeholder="Classify the user intent..."
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted">
                Confidence Threshold: {(llm.confidence_threshold ?? 0.8).toFixed(2)}
              </label>
              <input
                type="range"
                className="w-full accent-accent"
                min={0}
                max={1}
                step={0.05}
                value={llm.confidence_threshold ?? 0.8}
                onChange={(e) => updateLlm({ confidence_threshold: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-[10px] text-text-muted">Routes (intent → target)</label>
              <textarea
                className="input min-h-[60px] resize-y font-mono text-xs"
                value={JSON.stringify(llm.routes ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    updateLlm({ routes: JSON.parse(e.target.value) });
                  } catch {
                    // Keep raw while editing
                  }
                }}
                placeholder='{"billing": "billing-agent", "technical": "tech-support"}'
              />
            </div>
          </div>
        )}
      </div>

      {/* Fallback Chain */}
      <div>
        <label className="label">Fallback Chain</label>
        <input
          className="input"
          value={fallbackChain.join(', ')}
          onChange={(e) => onChange({ ...spec, fallback_chain: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          placeholder="route1, route2, route3"
        />
        <p className="text-[10px] text-text-muted mt-0.5">Comma-separated route names</p>
      </div>

      {/* Policies */}
      <div>
        <label className="label">Policies</label>

        {/* Retry */}
        <div className="bg-bg-primary rounded p-2 space-y-1.5 mb-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Retry</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-text-muted">Max Attempts</label>
              <input
                type="number"
                className="input py-1 text-xs"
                value={retry.max_attempts ?? 3}
                onChange={(e) => updatePolicies('retry', { max_attempts: parseInt(e.target.value) || 3 })}
                min={1}
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-text-muted">On Failure</label>
              <input
                className="input py-1 text-xs"
                value={retry.on_failure ?? 'fallback'}
                onChange={(e) => updatePolicies('retry', { on_failure: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Timeout */}
        <div className="bg-bg-primary rounded p-2 space-y-1.5 mb-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Timeout (seconds)</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-text-muted">Per Route</label>
              <input
                type="number"
                className="input py-1 text-xs"
                value={timeout.per_route ?? 30}
                onChange={(e) => updatePolicies('timeout', { per_route: parseInt(e.target.value) || 30 })}
                min={1}
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-text-muted">Total</label>
              <input
                type="number"
                className="input py-1 text-xs"
                value={timeout.total ?? 120}
                onChange={(e) => updatePolicies('timeout', { total: parseInt(e.target.value) || 120 })}
                min={1}
              />
            </div>
          </div>
        </div>

        {/* Circuit Breaker */}
        <div className="bg-bg-primary rounded p-2 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Circuit Breaker</p>
          <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              className="accent-accent"
              checked={cb.enabled ?? false}
              onChange={(e) => updatePolicies('circuit_breaker', { enabled: e.target.checked })}
            />
            Enabled
          </label>
          {cb.enabled && (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-text-muted">Failure Threshold</label>
                  <input
                    type="number"
                    className="input py-1 text-xs"
                    value={cb.failure_threshold ?? 5}
                    onChange={(e) => updatePolicies('circuit_breaker', { failure_threshold: parseInt(e.target.value) || 5 })}
                    min={1}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-text-muted">Timeout (s)</label>
                  <input
                    type="number"
                    className="input py-1 text-xs"
                    value={cb.timeout_seconds ?? 60}
                    onChange={(e) => updatePolicies('circuit_breaker', { timeout_seconds: parseInt(e.target.value) || 60 })}
                    min={1}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-text-muted">Simulated State</label>
                <select
                  className="input py-1 text-xs"
                  value={cb.runtime_state ?? 'closed'}
                  onChange={(e) => updatePolicies('circuit_breaker', { runtime_state: e.target.value })}
                >
                  <option value="closed">Closed (healthy)</option>
                  <option value="open">Open (failing)</option>
                  <option value="half_open">Half Open (testing)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <ExtraFieldsEditor spec={spec} nodeType="smart_router" onChange={onChange} />
    </div>
  );
}
