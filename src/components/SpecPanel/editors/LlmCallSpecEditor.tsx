import type { LlmCallSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: LlmCallSpec;
  onChange: (spec: LlmCallSpec) => void;
}

export function LlmCallSpecEditor({ spec, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Model</label>
        <input
          className="input"
          value={spec.model ?? ''}
          onChange={(e) => onChange({ ...spec, model: e.target.value })}
          placeholder="e.g. claude-sonnet, gpt-4o"
        />
      </div>
      <div>
        <label className="label">System Prompt</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.system_prompt ?? ''}
          onChange={(e) => onChange({ ...spec, system_prompt: e.target.value })}
          placeholder="System instructions for the LLM..."
        />
      </div>
      <div>
        <label className="label">Prompt Template</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.prompt_template ?? ''}
          onChange={(e) => onChange({ ...spec, prompt_template: e.target.value })}
          placeholder="User prompt template with {{variables}}..."
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Temperature</label>
          <input
            type="number"
            className="input"
            value={spec.temperature ?? 0.7}
            onChange={(e) => onChange({ ...spec, temperature: parseFloat(e.target.value) || 0 })}
            min={0}
            max={2}
            step={0.1}
          />
        </div>
        <div>
          <label className="label">Max Tokens</label>
          <input
            type="number"
            className="input"
            value={spec.max_tokens ?? 4096}
            onChange={(e) => onChange({ ...spec, max_tokens: parseInt(e.target.value, 10) || 0 })}
            min={1}
          />
        </div>
      </div>
      <div>
        <label className="label">Structured Output</label>
        <textarea
          className="input min-h-[60px] resize-y font-mono text-xs"
          value={JSON.stringify(spec.structured_output ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...spec, structured_output: JSON.parse(e.target.value) });
            } catch {
              // Keep raw while editing
            }
          }}
          placeholder='{"field": "type"}'
        />
      </div>
      <div>
        <label className="label">Context Sources</label>
        <textarea
          className="input min-h-[60px] resize-y font-mono text-xs"
          value={JSON.stringify(spec.context_sources ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...spec, context_sources: JSON.parse(e.target.value) });
            } catch {
              // Keep raw while editing
            }
          }}
          placeholder='{"history": {"from": "memory.conversation", "transform": "last_10"}}'
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Retry Attempts</label>
          <input
            type="number"
            className="input"
            value={spec.retry?.max_attempts ?? 3}
            onChange={(e) => onChange({ ...spec, retry: { ...spec.retry, max_attempts: parseInt(e.target.value, 10) || 0 } })}
            min={0}
          />
        </div>
        <div>
          <label className="label">Backoff (ms)</label>
          <input
            type="number"
            className="input"
            value={spec.retry?.backoff_ms ?? 1000}
            onChange={(e) => onChange({ ...spec, retry: { ...spec.retry, backoff_ms: parseInt(e.target.value, 10) || 0 } })}
            min={0}
          />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe what this LLM call does..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="llm_call" onChange={onChange} />
    </div>
  );
}
