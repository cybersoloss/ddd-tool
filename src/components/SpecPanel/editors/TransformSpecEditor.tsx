import type { TransformSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: TransformSpec;
  onChange: (spec: TransformSpec) => void;
}

export function TransformSpecEditor({ spec, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Input Schema</label>
        <input
          className="input"
          value={spec.input_schema ?? ''}
          onChange={(e) => onChange({ ...spec, input_schema: e.target.value })}
          placeholder="e.g. TwitterApiResponse"
        />
      </div>
      <div>
        <label className="label">Output Schema</label>
        <input
          className="input"
          value={spec.output_schema ?? ''}
          onChange={(e) => onChange({ ...spec, output_schema: e.target.value })}
          placeholder="e.g. ContentItem"
        />
      </div>
      <div>
        <label className="label">Field Mappings</label>
        <textarea
          className="input min-h-[60px] resize-y font-mono text-xs"
          value={JSON.stringify(spec.field_mappings ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...spec, field_mappings: JSON.parse(e.target.value) });
            } catch {
              // Keep raw while editing
            }
          }}
          placeholder='{"output_field": "input_field"}'
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this transformation..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="transform" onChange={onChange} />
    </div>
  );
}
