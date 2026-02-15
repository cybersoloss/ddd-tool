import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useCallback } from 'react';
import type { NodeSpec, DddNodeType } from '../../../types/flow';

// Known (typed) keys per node type — anything else is an "extra field"
const KNOWN_KEYS: Record<DddNodeType, Set<string>> = {
  trigger: new Set(['event', 'source', 'filter', 'description']),
  input: new Set(['fields', 'validation', 'description']),
  process: new Set(['action', 'service', 'category', 'inputs', 'outputs', 'description']),
  decision: new Set(['condition', 'trueLabel', 'falseLabel', 'description']),
  terminal: new Set(['outcome', 'description', 'status', 'body', 'response_type', 'headers']),
  agent_loop: new Set(['model', 'system_prompt', 'max_iterations', 'temperature', 'stop_conditions', 'tools', 'memory', 'on_max_iterations']),
  guardrail: new Set(['position', 'checks', 'on_block']),
  human_gate: new Set(['notification_channels', 'approval_options', 'timeout', 'context_for_human']),
  orchestrator: new Set(['strategy', 'model', 'supervisor_prompt', 'agents', 'fallback_chain', 'shared_memory', 'supervision', 'result_merge_strategy']),
  smart_router: new Set(['rules', 'llm_routing', 'fallback_chain', 'policies']),
  handoff: new Set(['mode', 'target', 'context_transfer', 'on_complete', 'on_failure', 'notify_customer']),
  agent_group: new Set(['name', 'description', 'members', 'shared_memory', 'coordination']),
  data_store: new Set(['operation', 'model', 'data', 'query', 'description', 'pagination', 'sort', 'batch', 'upsert_key', 'include', 'returning']),
  service_call: new Set(['method', 'url', 'headers', 'body', 'timeout_ms', 'retry', 'error_mapping', 'request_config', 'integration', 'description']),
  event: new Set(['direction', 'event_name', 'payload', 'payload_source', 'async', 'target_queue', 'priority', 'delay_ms', 'dedup_key', 'description']),
  loop: new Set(['collection', 'iterator', 'break_condition', 'on_error', 'accumulate', 'description']),
  parallel: new Set(['branches', 'join', 'join_count', 'timeout_ms', 'description']),
  sub_flow: new Set(['flow_ref', 'input_mapping', 'output_mapping', 'description']),
  llm_call: new Set(['model', 'system_prompt', 'prompt_template', 'temperature', 'max_tokens', 'structured_output', 'context_sources', 'retry', 'description']),
  delay: new Set(['min_ms', 'max_ms', 'strategy', 'description']),
  cache: new Set(['key', 'ttl_ms', 'store', 'description']),
  transform: new Set(['input_schema', 'output_schema', 'field_mappings', 'description']),
  collection: new Set(['operation', 'input', 'predicate', 'key', 'direction', 'accumulator', 'output', 'description']),
  parse: new Set(['format', 'input', 'strategy', 'library', 'output', 'description']),
  crypto: new Set(['operation', 'algorithm', 'key_source', 'input_fields', 'output_field', 'encoding', 'description']),
  batch: new Set(['input', 'operation_template', 'concurrency', 'on_error', 'output', 'description']),
  transaction: new Set(['isolation', 'steps', 'rollback_on_error', 'description']),
};

interface Props {
  spec: NodeSpec;
  nodeType: DddNodeType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (spec: any) => void;
}

export function ExtraFieldsEditor({ spec, nodeType, onChange }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [newKey, setNewKey] = useState('');

  const known = KNOWN_KEYS[nodeType] ?? new Set();
  const record = spec as Record<string, unknown>;
  const extraKeys = Object.keys(record).filter((k) => !known.has(k) && record[k] !== undefined);

  const addField = useCallback(() => {
    const key = newKey.trim();
    if (!key || known.has(key) || key in record) return;
    onChange({ ...spec, [key]: '' } as NodeSpec);
    setNewKey('');
  }, [newKey, known, record, spec, onChange]);

  const updateField = useCallback((key: string, value: string) => {
    onChange({ ...spec, [key]: value } as NodeSpec);
  }, [spec, onChange]);

  const removeField = useCallback((key: string) => {
    const { [key]: _, ...rest } = record;
    onChange(rest as NodeSpec);
  }, [record, onChange]);

  if (extraKeys.length === 0 && !expanded) {
    return (
      <button
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors mt-3"
        onClick={() => setExpanded(true)}
      >
        <Plus className="w-3 h-3" />
        Add custom field
      </button>
    );
  }

  return (
    <div className="mt-4 pt-3 border-t border-border/50">
      <button
        className="flex items-center gap-1.5 mb-2 w-full"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
        )}
        <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
          Custom Fields
        </span>
        {extraKeys.length > 0 && (
          <span className="text-[10px] text-accent ml-1">({extraKeys.length})</span>
        )}
      </button>

      {expanded && (
        <div className="space-y-2">
          {extraKeys.map((key) => {
            const val = record[key];
            const displayValue = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '');
            const isObject = typeof val === 'object' && val !== null;

            return (
              <div key={key} className="group">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <label className="text-[10px] uppercase tracking-wider text-accent font-medium flex-1 truncate">
                    {key}
                  </label>
                  <button
                    className="btn-icon !p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-danger"
                    onClick={() => removeField(key)}
                    title="Remove field"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {isObject ? (
                  <textarea
                    className="input text-xs font-mono min-h-[60px] resize-y"
                    value={displayValue}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        updateField(key, parsed);
                      } catch {
                        // Keep raw string while editing
                        onChange({ ...spec, [key]: e.target.value } as NodeSpec);
                      }
                    }}
                  />
                ) : (
                  <input
                    className="input text-xs"
                    value={displayValue}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                )}
              </div>
            );
          })}

          {/* Add new field */}
          <div className="flex items-center gap-1.5 mt-2">
            <input
              className="input flex-1 text-xs"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addField(); }}
              placeholder="field_name"
            />
            <button
              className="btn-icon !p-1 text-accent"
              onClick={addField}
              disabled={!newKey.trim()}
              title="Add field"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
