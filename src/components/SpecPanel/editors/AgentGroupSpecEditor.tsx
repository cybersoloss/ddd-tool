import { Plus, Trash2 } from 'lucide-react';
import type { AgentGroupSpec, AgentGroupMember, SharedMemoryEntry } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: AgentGroupSpec;
  onChange: (spec: AgentGroupSpec) => void;
}

const COMMUNICATION_OPTIONS: NonNullable<AgentGroupSpec['coordination']>['communication'][] = [
  'via_orchestrator',
  'direct',
  'blackboard',
];
const ACCESS_OPTIONS: SharedMemoryEntry['access'][] = ['read_write', 'read_only'];

export function AgentGroupSpecEditor({ spec, onChange }: Props) {
  const members = Array.isArray(spec.members) ? spec.members : [];
  const sharedMemory = Array.isArray(spec.shared_memory) ? spec.shared_memory : [];
  const coordination = spec.coordination ?? {
    communication: 'via_orchestrator',
    max_active_agents: 3,
    selection_strategy: 'round_robin',
    sticky_session: false,
  };

  const addMember = () => {
    const member: AgentGroupMember = { flow: '', domain: '' };
    onChange({ ...spec, members: [...members, member] });
  };

  const updateMember = (index: number, updates: Partial<AgentGroupMember>) => {
    const updated = members.map((m, i) => (i === index ? { ...m, ...updates } : m));
    onChange({ ...spec, members: updated });
  };

  const removeMember = (index: number) => {
    onChange({ ...spec, members: members.filter((_, i) => i !== index) });
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

  const updateCoordination = (updates: Partial<typeof coordination>) => {
    onChange({ ...spec, coordination: { ...coordination, ...updates } });
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className="label">Group Name</label>
        <input
          className="input"
          value={spec.name ?? ''}
          onChange={(e) => onChange({ ...spec, name: e.target.value })}
          placeholder="Agent group name"
        />
      </div>

      {/* Description */}
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[60px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="What this group does..."
        />
      </div>

      {/* Members */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label !mb-0">Members</label>
          <button type="button" className="btn-icon !p-0.5" onClick={addMember} title="Add member">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {members.length === 0 && (
          <p className="text-xs text-text-muted">No members defined</p>
        )}
        <div className="space-y-2">
          {members.map((member, i) => (
            <div key={i} className="bg-bg-primary rounded p-2 flex items-center gap-1">
              <input
                className="input py-1 text-xs flex-1"
                value={member.flow}
                onChange={(e) => updateMember(i, { flow: e.target.value })}
                placeholder="Flow name"
              />
              <input
                className="input py-1 text-xs flex-1"
                value={member.domain ?? ''}
                onChange={(e) => updateMember(i, { domain: e.target.value })}
                placeholder="Domain (optional)"
              />
              <button type="button" className="btn-icon !p-0.5" onClick={() => removeMember(i)}>
                <Trash2 className="w-3 h-3 text-text-muted hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
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

      {/* Coordination */}
      <div>
        <label className="label">Coordination</label>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-text-muted">Communication</label>
            <select
              className="input py-1 text-xs"
              value={coordination.communication ?? 'via_orchestrator'}
              onChange={(e) =>
                updateCoordination({
                  communication: e.target.value as NonNullable<AgentGroupSpec['coordination']>['communication'],
                })
              }
            >
              {COMMUNICATION_OPTIONS.map((c) => (
                <option key={c} value={c}>{c!.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-text-muted">Max Active Agents</label>
            <input
              type="number"
              className="input py-1 text-xs"
              value={coordination.max_active_agents ?? 3}
              onChange={(e) => updateCoordination({ max_active_agents: parseInt(e.target.value) || 3 })}
              min={1}
            />
          </div>

          <div>
            <label className="text-[10px] text-text-muted">Selection Strategy</label>
            <input
              className="input py-1 text-xs"
              value={coordination.selection_strategy ?? 'round_robin'}
              onChange={(e) => updateCoordination({ selection_strategy: e.target.value })}
              placeholder="round_robin, priority, random"
            />
          </div>

          <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              className="accent-accent"
              checked={coordination.sticky_session ?? false}
              onChange={(e) => updateCoordination({ sticky_session: e.target.checked })}
            />
            Sticky session
          </label>
        </div>
      </div>

      <ExtraFieldsEditor spec={spec} nodeType="agent_group" onChange={onChange} />
    </div>
  );
}
