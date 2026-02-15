import type { ParseSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: ParseSpec;
  onChange: (spec: ParseSpec) => void;
}

export function ParseSpecEditor({ spec, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Format</label>
        <select
          className="input"
          value={spec.format ?? 'json'}
          onChange={(e) => onChange({ ...spec, format: e.target.value as ParseSpec['format'] })}
        >
          <option value="rss">RSS</option>
          <option value="atom">Atom</option>
          <option value="html">HTML</option>
          <option value="xml">XML</option>
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="markdown">Markdown</option>
        </select>
      </div>
      <div>
        <label className="label">Input</label>
        <input
          className="input"
          value={spec.input ?? ''}
          onChange={(e) => onChange({ ...spec, input: e.target.value })}
          placeholder="e.g. raw_body, response_text"
        />
      </div>
      <div>
        <label className="label">Strategy</label>
        <select
          className="input"
          value={spec.strategy ?? 'strict'}
          onChange={(e) => onChange({ ...spec, strategy: e.target.value as ParseSpec['strategy'] })}
        >
          <option value="strict">Strict</option>
          <option value="lenient">Lenient</option>
          <option value="streaming">Streaming</option>
        </select>
      </div>
      <div>
        <label className="label">Library</label>
        <input
          className="input"
          value={spec.library ?? ''}
          onChange={(e) => onChange({ ...spec, library: e.target.value })}
          placeholder="e.g. cheerio, csv-parse"
        />
      </div>
      <div>
        <label className="label">Output</label>
        <input
          className="input"
          value={spec.output ?? ''}
          onChange={(e) => onChange({ ...spec, output: e.target.value })}
          placeholder="e.g. parsed_data"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this parse operation..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="parse" onChange={onChange} />
    </div>
  );
}
