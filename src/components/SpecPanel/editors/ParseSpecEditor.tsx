import { Plus, Trash2 } from 'lucide-react';
import type { ParseSpec, ParseSelectorDef } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: ParseSpec;
  onChange: (spec: ParseSpec) => void;
}

function isObjectStrategy(
  strategy: ParseSpec['strategy'],
): strategy is { selectors: ParseSelectorDef[] } {
  return typeof strategy === 'object' && strategy !== null && 'selectors' in strategy;
}

function getSelectors(strategy: ParseSpec['strategy']): ParseSelectorDef[] {
  if (isObjectStrategy(strategy)) {
    return Array.isArray(strategy.selectors) ? strategy.selectors : [];
  }
  return [];
}

function getStringStrategy(strategy: ParseSpec['strategy']): string {
  if (typeof strategy === 'string') return strategy;
  return 'strict';
}

export function ParseSpecEditor({ spec, onChange }: Props) {
  const useSelectors = spec.format === 'html' && isObjectStrategy(spec.strategy);
  const selectors = getSelectors(spec.strategy);

  const toggleSelectorMode = (useSel: boolean) => {
    if (useSel) {
      onChange({ ...spec, strategy: { selectors: selectors.length > 0 ? selectors : [{ name: '', css: '' }] } });
    } else {
      onChange({ ...spec, strategy: 'strict' });
    }
  };

  const updateSelector = (index: number, patch: Partial<ParseSelectorDef>) => {
    const updated = selectors.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange({ ...spec, strategy: { selectors: updated } });
  };

  const addSelector = () => {
    onChange({ ...spec, strategy: { selectors: [...selectors, { name: '', css: '' }] } });
  };

  const removeSelector = (index: number) => {
    onChange({ ...spec, strategy: { selectors: selectors.filter((_, i) => i !== index) } });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Format</label>
        <select
          className="input"
          value={spec.format ?? 'json'}
          onChange={(e) => {
            const newFormat = e.target.value as ParseSpec['format'];
            // When switching away from html, reset object strategy to string
            if (newFormat !== 'html' && isObjectStrategy(spec.strategy)) {
              onChange({ ...spec, format: newFormat, strategy: 'strict' });
            } else {
              onChange({ ...spec, format: newFormat });
            }
          }}
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
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Strategy</label>
          {spec.format === 'html' && (
            <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={useSelectors}
                onChange={(e) => toggleSelectorMode(e.target.checked)}
                className="rounded border-border"
              />
              CSS Selectors
            </label>
          )}
        </div>
        {useSelectors ? (
          <div className="space-y-2">
            {selectors.map((sel, i) => (
              <div key={i} className="bg-bg-primary/50 border border-border rounded-md p-2 space-y-1.5">
                <div className="flex items-center gap-1">
                  <input
                    className="input flex-1 !py-1 text-xs"
                    value={sel.name}
                    onChange={(e) => updateSelector(i, { name: e.target.value })}
                    placeholder="Field name"
                  />
                  <input
                    className="input flex-1 !py-1 text-xs"
                    value={sel.css}
                    onChange={(e) => updateSelector(i, { css: e.target.value })}
                    placeholder="CSS selector"
                  />
                  <button className="btn-icon !p-1" onClick={() => removeSelector(i)} title="Remove selector">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="input flex-1 !py-1 text-xs"
                    value={sel.extract ?? ''}
                    onChange={(e) => updateSelector(i, { extract: e.target.value || undefined })}
                    placeholder="Extract (e.g. text, href)"
                  />
                  <label className="flex items-center gap-1 text-xs text-text-muted whitespace-nowrap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sel.multiple ?? false}
                      onChange={(e) => updateSelector(i, { multiple: e.target.checked || undefined })}
                      className="rounded border-border"
                    />
                    Multiple
                  </label>
                </div>
              </div>
            ))}
            <button
              className="btn-icon !p-1 flex items-center gap-1 text-xs text-text-muted hover:text-text-primary"
              onClick={addSelector}
              title="Add selector"
            >
              <Plus className="w-3.5 h-3.5" /> Add selector
            </button>
          </div>
        ) : (
          <select
            className="input"
            value={getStringStrategy(spec.strategy)}
            onChange={(e) => onChange({ ...spec, strategy: e.target.value as 'strict' | 'lenient' | 'streaming' })}
          >
            <option value="strict">Strict</option>
            <option value="lenient">Lenient</option>
            <option value="streaming">Streaming</option>
          </select>
        )}
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
