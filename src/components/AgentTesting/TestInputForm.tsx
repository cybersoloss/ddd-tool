import { useState } from 'react';
import { Play } from 'lucide-react';
import { useFlowStore } from '../../stores/flow-store';
import type { InputSpec } from '../../types/flow';

interface Props {
  onSubmit: (input: Record<string, unknown>) => void;
}

export function TestInputForm({ onSubmit }: Props) {
  const currentFlow = useFlowStore((s) => s.currentFlow);
  const [values, setValues] = useState<Record<string, string>>({});

  if (!currentFlow) return null;

  // Extract fields from trigger + input nodes
  const fields: Array<{ name: string; type: string; required?: boolean }> = [];

  const allNodes = [currentFlow.trigger, ...currentFlow.nodes];
  for (const node of allNodes) {
    if (node.type === 'input') {
      const spec = (node.spec ?? {}) as InputSpec;
      if (spec.fields) {
        for (const field of spec.fields) {
          if (!fields.some((f) => f.name === field.name)) {
            fields.push(field);
          }
        }
      }
    }
  }

  // If no fields found, add a generic message input
  if (fields.length === 0) {
    fields.push({ name: 'message', type: 'string', required: true });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(values)) {
      input[key] = val;
    }
    onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-text-secondary">Configure test input values:</p>

      {fields.map((field) => (
        <div key={field.name}>
          <label className="text-[10px] text-text-muted">
            {field.name} ({field.type}){field.required && <span className="text-danger"> *</span>}
          </label>
          <input
            className="input py-1 text-xs"
            value={values[field.name] ?? ''}
            onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
            placeholder={`Enter ${field.name}...`}
          />
        </div>
      ))}

      <button type="submit" className="btn-primary w-full text-xs">
        <Play className="w-3.5 h-3.5" />
        Run Test
      </button>
    </form>
  );
}
