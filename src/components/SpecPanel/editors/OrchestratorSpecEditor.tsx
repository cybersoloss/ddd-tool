import { nanoid } from 'nanoid';
import { Plus, Trash2 } from 'lucide-react';
import type { OrchestratorSpec, OrchestratorAgent, SharedMemoryEntry, SupervisionRule, NodeSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: OrchestratorSpec;
  onChange: (spec: OrchestratorSpec) => void;
}

const STRATEGY_OPTIONS: OrchestratorSpec['strategy'][] = ['supervisor', 'round_robin', 'broadcast', 'consensus'];
const MODEL_OPTIONS = ['claude-sonnet', 'claude-haiku', 'gpt-4o', 'custom'];
const MERGE_OPTIONS: OrchestratorSpec['result_merge_strategy'][] = ['last_wins', 'best_of', 'combine', 'supervisor_picks'];
const ACCESS_OPTIONS: SharedMemoryEntry['access'][] = ['read_write', 'read_only'];

export function OrchestratorSpecEditor({ spec, onChange }: Props) {
  const agents = Array.isArray(spec.agents) ? spec.agents : [];
  const sharedMemory = Array.isArray(spec.shared_memory) ? spec.shared_memory : [];
  const fallbackChain = Array.isArray(spec.fallback_chain) ? spec.fallback_chain : [];

  const addAgent = () => {
    const agent: OrchestratorAgent = { id: nanoid(6), flow: '', specialization: '', priority: 0 };
    onChange({ ...spec, agents: [...agents, agent] });
  };

  const updateAgent = (index: number, updates: Partial<OrchestratorAgent>) => {
    const updated = agents.map((a, i) => (i === index ? { ...a, ...updates } : a));
    onChange({ ...spec, agents: updated });
  };

  const removeAgent = (index: number) => {
    onChange({ ...spec, agents: agents.filter((_, i) => i !== index) });
  };

  const addMemory = () => {
    const mem: SharedMemoryEntry = { name: '', type: 'string', access: 'read_write' };
    onChange({ ...spec, shared_memory: [...sharedMemory, mem] });
  };

  const updateMemory = (index: number, updates: Partial<SharedMemoryEntry>) => {
    const updated = sharedMemory.map((m, i) => (i === index ? { ...m, ...updates } : m));
    onChange({ ...spec, shared_memory: updated });
  };

  const removeMemory = (index: number) => {
    onChange({ ...spec, shared_memory: sharedMemory.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      {/* Strategy */}
      <div>
        <label className="label">Strategy</label>
        <select
          className="input"
          value={spec.strategy ?? 'supervisor'}
          onChange={(e) => onChange({ ...spec, strategy: e.target.value as OrchestratorSpec['strategy'] })}
        >
          {STRATEGY_OPTIONS.map((s) => (
            <option key={s} value={s}>{s!.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Model */}
      <div>
        <label className="label">Model</label>
        <select
          className="input"
          value={spec.model ?? 'claude-sonnet'}
          onChange={(e) => onChange({ ...spec, model: e.target.value })}
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Supervisor Prompt */}
      <div>
        <label className="label">Supervisor Prompt</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.supervisor_prompt ?? ''}
          onChange={(e) => onChange({ ...spec, supervisor_prompt: e.target.value })}
          placeholder="Instructions for the supervisor..."
        />
      </div>

      {/* Agents */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label !mb-0">Agents</label>
          <button type="button" className="btn-icon !p-0.5" onClick={addAgent} title="Add agent">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {agents.length === 0 && (
          <p className="text-xs text-text-muted">No agents defined</p>
        )}
        <div className="space-y-2">
          {agents.map((agent, i) => (
            <div key={agent.id} className="bg-bg-primary rounded p-2 space-y-1.5">
              <div className="flex items-center gap-1">
                <input
                  className="input py-1 text-xs flex-1"
                  value={agent.flow}
                  onChange={(e) => updateAgent(i, { flow: e.target.value })}
                  placeholder="Flow name"
                />
                <button type="button" className="btn-icon !p-0.5" onClick={() => removeAgent(i)}>
                  <Trash2 className="w-3 h-3 text-text-muted hover:text-red-400" />
                </button>
              </div>
              <input
                className="input py-1 text-xs"
                value={agent.specialization ?? ''}
                onChange={(e) => updateAgent(i, { specialization: e.target.value })}
                placeholder="Specialization"
              />
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-text-muted">Priority</label>
                <input
                  type="number"
                  className="input py-1 text-xs w-20"
                  value={agent.priority ?? 0}
                  onChange={(e) => updateAgent(i, { priority: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fallback Chain */}
      <div>
        <label className="label">Fallback Chain</label>
        <input
          className="input"
          value={fallbackChain.join(', ')}
          onChange={(e) => onChange({ ...spec, fallback_chain: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          placeholder="agent1, agent2, agent3"
        />
        <p className="text-[10px] text-text-muted mt-0.5">Comma-separated flow names</p>
      </div>

      {/* Shared Memory */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label !mb-0">Shared Memory</label>
          <button type="button" className="btn-icon !p-0.5" onClick={addMemory} title="Add memory">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {sharedMemory.length === 0 && (
          <p className="text-xs text-text-muted">No shared memory</p>
        )}
        <div className="space-y-2">
          {sharedMemory.map((mem, i) => (
            <div key={i} className="bg-bg-primary rounded p-2 space-y-1.5">
              <div className="flex items-center gap-1">
                <input
                  className="input py-1 text-xs flex-1"
                  value={mem.name}
                  onChange={(e) => updateMemory(i, { name: e.target.value })}
                  placeholder="Name"
                />
                <button type="button" className="btn-icon !p-0.5" onClick={() => removeMemory(i)}>
                  <Trash2 className="w-3 h-3 text-text-muted hover:text-red-400" />
                </button>
              </div>
              <input
                className="input py-1 text-xs"
                value={mem.type}
                onChange={(e) => updateMemory(i, { type: e.target.value })}
                placeholder="Type (e.g. string, object)"
              />
              <select
                className="input py-1 text-xs"
                value={mem.access}
                onChange={(e) => updateMemory(i, { access: e.target.value as SharedMemoryEntry['access'] })}
              >
                {ACCESS_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Supervision */}
      <div>
        <label className="label">Supervision</label>
        <div className="bg-bg-primary rounded p-2 space-y-2">
          <div>
            <label className="text-[10px] text-text-muted">Monitor Iterations</label>
            <input
              type="number"
              className="input py-1 text-xs"
              value={spec.supervision?.monitor_iterations ?? ''}
              onChange={(e) =>
                onChange({
                  ...spec,
                  supervision: {
                    ...spec.supervision,
                    monitor_iterations: e.target.value ? parseInt(e.target.value) : undefined,
                  },
                })
              }
              placeholder="5"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-text-muted">Intervene On</label>
              <button
                type="button"
                className="btn-icon !p-0.5"
                onClick={() => {
                  const rules = spec.supervision?.intervene_on ?? [];
                  onChange({
                    ...spec,
                    supervision: {
                      ...spec.supervision,
                      intervene_on: [...rules, { condition: '', action: '' }],
                    },
                  });
                }}
                title="Add rule"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            {(spec.supervision?.intervene_on ?? []).map((rule: SupervisionRule, i: number) => (
              <div key={i} className="flex items-start gap-1 mb-1">
                <div className="flex-1 space-y-1">
                  <input
                    className="input py-1 text-xs"
                    value={rule.condition}
                    onChange={(e) => {
                      const rules = [...(spec.supervision?.intervene_on ?? [])];
                      rules[i] = { ...rules[i], condition: e.target.value };
                      onChange({ ...spec, supervision: { ...spec.supervision, intervene_on: rules } });
                    }}
                    placeholder="Condition"
                  />
                  <div className="flex gap-1">
                    <input
                      type="number"
                      className="input py-1 text-xs w-16"
                      value={rule.threshold ?? ''}
                      onChange={(e) => {
                        const rules = [...(spec.supervision?.intervene_on ?? [])];
                        rules[i] = { ...rules[i], threshold: e.target.value ? Number(e.target.value) : undefined };
                        onChange({ ...spec, supervision: { ...spec.supervision, intervene_on: rules } });
                      }}
                      placeholder="Thr"
                      title="Threshold"
                    />
                    <input
                      className="input py-1 text-xs flex-1"
                      value={rule.action}
                      onChange={(e) => {
                        const rules = [...(spec.supervision?.intervene_on ?? [])];
                        rules[i] = { ...rules[i], action: e.target.value };
                        onChange({ ...spec, supervision: { ...spec.supervision, intervene_on: rules } });
                      }}
                      placeholder="Action"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-icon !p-0.5 mt-1"
                  onClick={() => {
                    const rules = (spec.supervision?.intervene_on ?? []).filter((_: SupervisionRule, j: number) => j !== i);
                    onChange({ ...spec, supervision: { ...spec.supervision, intervene_on: rules } });
                  }}
                >
                  <Trash2 className="w-3 h-3 text-text-muted hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Result Merge Strategy */}
      <div>
        <label className="label">Result Merge Strategy</label>
        <select
          className="input"
          value={spec.result_merge_strategy ?? 'last_wins'}
          onChange={(e) => onChange({ ...spec, result_merge_strategy: e.target.value as OrchestratorSpec['result_merge_strategy'] })}
        >
          {MERGE_OPTIONS.map((m) => (
            <option key={m} value={m}>{m!.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <ExtraFieldsEditor spec={spec} nodeType="orchestrator" onChange={onChange as (spec: NodeSpec) => void} />
    </div>
  );
}
