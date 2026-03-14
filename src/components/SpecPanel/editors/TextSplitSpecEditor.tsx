import type { TextSplitSpec } from '../../../types/flow';

interface Props {
  spec: TextSplitSpec;
  onChange: (spec: TextSplitSpec) => void;
}

export function TextSplitSpecEditor({ spec, onChange }: Props) {
  const update = (field: string, value: unknown) => {
    onChange({ ...spec, [field]: value });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Input field</label>
        <input
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm"
          value={spec.input ?? ''}
          onChange={(e) => update('input', e.target.value)}
          placeholder="$.article.body"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Max length</label>
        <input
          type="number"
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm"
          value={spec.max_length ?? ''}
          onChange={(e) => update('max_length', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="280"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Split strategy</label>
        <select
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm"
          value={spec.split_strategy ?? ''}
          onChange={(e) => update('split_strategy', e.target.value || undefined)}
        >
          <option value="">— select —</option>
          <option value="word">word</option>
          <option value="sentence">sentence</option>
          <option value="paragraph">paragraph</option>
          <option value="character">character</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Prefix template</label>
        <input
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm"
          value={spec.prefix_template ?? ''}
          onChange={(e) => update('prefix_template', e.target.value || undefined)}
          placeholder="{{index+1}}/{{total}} "
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Suffix template</label>
        <input
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm"
          value={spec.suffix_template ?? ''}
          onChange={(e) => update('suffix_template', e.target.value || undefined)}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Output variable</label>
        <input
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm"
          value={spec.output ?? ''}
          onChange={(e) => update('output', e.target.value)}
          placeholder="chunks"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
        <input
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm"
          value={spec.description ?? ''}
          onChange={(e) => update('description', e.target.value || undefined)}
        />
      </div>
    </div>
  );
}
