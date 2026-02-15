import type { CollectionSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: CollectionSpec;
  onChange: (spec: CollectionSpec) => void;
}

export function CollectionSpecEditor({ spec, onChange }: Props) {
  const showAccumulator = spec.operation === 'reduce' || spec.operation === 'aggregate';
  const accum = spec.accumulator;
  const isAccumObj = typeof accum === 'object' && accum !== null;
  const accumInit = isAccumObj ? JSON.stringify(accum.init ?? '', null, 2) : '';
  const accumExpr = isAccumObj ? (accum.expression ?? '') : (typeof accum === 'string' ? accum : '');

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Operation</label>
        <select
          className="input"
          value={spec.operation ?? 'filter'}
          onChange={(e) => onChange({ ...spec, operation: e.target.value as CollectionSpec['operation'] })}
        >
          <option value="filter">Filter</option>
          <option value="sort">Sort</option>
          <option value="deduplicate">Deduplicate</option>
          <option value="merge">Merge</option>
          <option value="group_by">Group By</option>
          <option value="aggregate">Aggregate</option>
          <option value="reduce">Reduce</option>
          <option value="flatten">Flatten</option>
        </select>
      </div>
      <div>
        <label className="label">Input</label>
        <input
          className="input"
          value={spec.input ?? ''}
          onChange={(e) => onChange({ ...spec, input: e.target.value })}
          placeholder="e.g. items, results"
        />
      </div>
      {(spec.operation === 'filter' || spec.operation === 'deduplicate') && (
        <div>
          <label className="label">Predicate</label>
          <input
            className="input"
            value={spec.predicate ?? ''}
            onChange={(e) => onChange({ ...spec, predicate: e.target.value })}
            placeholder="e.g. item.active === true"
          />
        </div>
      )}
      {(spec.operation === 'sort' || spec.operation === 'group_by' || spec.operation === 'aggregate') && (
        <div>
          <label className="label">Key</label>
          <input
            className="input"
            value={spec.key ?? ''}
            onChange={(e) => onChange({ ...spec, key: e.target.value })}
            placeholder="e.g. created_at, category"
          />
        </div>
      )}
      {spec.operation === 'sort' && (
        <div>
          <label className="label">Direction</label>
          <select
            className="input"
            value={spec.direction ?? 'asc'}
            onChange={(e) => onChange({ ...spec, direction: e.target.value as 'asc' | 'desc' })}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      )}
      {showAccumulator && (
        <>
          <div>
            <label className="label">Accumulator Expression</label>
            <input
              className="input"
              value={accumExpr}
              onChange={(e) => {
                if (isAccumObj) {
                  onChange({ ...spec, accumulator: { ...accum, expression: e.target.value } });
                } else {
                  onChange({ ...spec, accumulator: e.target.value });
                }
              }}
              placeholder="e.g. sum, count, or an expression"
            />
          </div>
          <div>
            <label className="label">Accumulator Init</label>
            <textarea
              className="input min-h-[40px] resize-y font-mono text-xs"
              value={accumInit}
              onChange={(e) => {
                let initVal: unknown;
                try {
                  initVal = JSON.parse(e.target.value);
                } catch {
                  initVal = e.target.value;
                }
                const expr = isAccumObj ? (accum.expression ?? '') : (typeof accum === 'string' ? accum : '');
                onChange({ ...spec, accumulator: { init: initVal, expression: expr } });
              }}
              placeholder="Initial value (JSON), e.g. 0, [], {}"
            />
          </div>
        </>
      )}
      <div>
        <label className="label">Output</label>
        <input
          className="input"
          value={spec.output ?? ''}
          onChange={(e) => onChange({ ...spec, output: e.target.value })}
          placeholder="e.g. filtered_items"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this collection operation..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="collection" onChange={onChange} />
    </div>
  );
}
