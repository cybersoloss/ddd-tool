import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { TriggerSpec, JobConfig, JobRetryConfig, TriggerPattern } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: TriggerSpec;
  onChange: (spec: TriggerSpec) => void;
}

export function TriggerSpecEditor({ spec, onChange }: Props) {
  const [jobConfigOpen, setJobConfigOpen] = useState(false);
  const [patternOpen, setPatternOpen] = useState(false);

  const jobConfig = spec.job_config ?? {};
  const pattern = spec.pattern ?? {};
  const jobRetry = jobConfig.retry ?? {};

  const updateJobConfig = (updates: Partial<JobConfig>) => {
    onChange({ ...spec, job_config: { ...jobConfig, ...updates } });
  };

  const updateJobRetry = (updates: Partial<JobRetryConfig>) => {
    updateJobConfig({ retry: { ...jobRetry, ...updates } });
  };

  const updatePattern = (updates: Partial<TriggerPattern>) => {
    onChange({ ...spec, pattern: { ...pattern, ...updates } });
  };

  // Handle event as string or string[]
  const eventValue = Array.isArray(spec.event) ? spec.event.join(', ') : (spec.event ?? '');
  const isMultiEvent = Array.isArray(spec.event) && spec.event.length > 1;

  const handleEventChange = (raw: string) => {
    // If user types commas, store as array; otherwise keep as string
    if (raw.includes(',')) {
      const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
      onChange({ ...spec, event: parts.length > 1 ? parts : parts[0] ?? '' });
    } else {
      onChange({ ...spec, event: raw });
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Event {isMultiEvent && <span className="text-accent text-[10px] ml-1">(multi)</span>}</label>
        <input
          className="input"
          value={eventValue}
          onChange={(e) => handleEventChange(e.target.value)}
          placeholder='e.g. HTTP POST /api/users or "event:A, event:B"'
        />
        <p className="text-[10px] text-text-muted mt-0.5">Separate multiple events with commas</p>
      </div>
      <div>
        <label className="label">Source</label>
        <input
          className="input"
          value={spec.source ?? ''}
          onChange={(e) => onChange({ ...spec, source: e.target.value })}
          placeholder="e.g. API Gateway"
        />
      </div>
      <div>
        <label className="label">Filter</label>
        <textarea
          className="input min-h-[60px] resize-y font-mono text-xs"
          value={JSON.stringify(spec.filter ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...spec, filter: JSON.parse(e.target.value) });
            } catch {
              // Keep raw while editing
            }
          }}
          placeholder='{"status": "active"}'
        />
      </div>
      <div>
        <label className="label">Debounce (ms)</label>
        <input
          type="number"
          className="input"
          value={spec.debounce_ms ?? ''}
          onChange={(e) => onChange({ ...spec, debounce_ms: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="e.g. 300"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this trigger..."
        />
      </div>

      {/* Job Config */}
      <div className="border-t border-border/50 pt-2">
        <button
          className="flex items-center gap-1.5 w-full"
          onClick={() => setJobConfigOpen(!jobConfigOpen)}
        >
          {jobConfigOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          )}
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
            Job Config
          </span>
        </button>
        {jobConfigOpen && (
          <div className="space-y-2 ml-2 mt-2">
            <div>
              <label className="label">Queue</label>
              <input
                className="input"
                value={jobConfig.queue ?? ''}
                onChange={(e) => updateJobConfig({ queue: e.target.value || undefined })}
                placeholder="e.g. high-priority"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label">Concurrency</label>
                <input
                  type="number"
                  className="input"
                  value={jobConfig.concurrency ?? ''}
                  onChange={(e) => updateJobConfig({ concurrency: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="1"
                />
              </div>
              <div className="flex-1">
                <label className="label">Timeout (ms)</label>
                <input
                  type="number"
                  className="input"
                  value={jobConfig.timeout_ms ?? ''}
                  onChange={(e) => updateJobConfig({ timeout_ms: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="30000"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label">Priority</label>
                <input
                  type="number"
                  className="input"
                  value={jobConfig.priority ?? ''}
                  onChange={(e) => updateJobConfig({ priority: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                />
              </div>
              <div className="flex-1">
                <label className="label">Dedup Key</label>
                <input
                  className="input"
                  value={jobConfig.dedup_key ?? ''}
                  onChange={(e) => updateJobConfig({ dedup_key: e.target.value || undefined })}
                  placeholder="e.g. order_id"
                />
              </div>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                className="accent-accent"
                checked={jobConfig.dead_letter ?? false}
                onChange={(e) => updateJobConfig({ dead_letter: e.target.checked })}
              />
              Dead Letter
            </label>
            <p className="text-[10px] uppercase tracking-wider text-text-muted mt-1">Retry</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label">Max Attempts</label>
                <input
                  type="number"
                  className="input"
                  value={jobRetry.max_attempts ?? ''}
                  onChange={(e) => updateJobRetry({ max_attempts: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="3"
                />
              </div>
              <div className="flex-1">
                <label className="label">Backoff (ms)</label>
                <input
                  type="number"
                  className="input"
                  value={jobRetry.backoff_ms ?? ''}
                  onChange={(e) => updateJobRetry({ backoff_ms: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="1000"
                />
              </div>
            </div>
            <div>
              <label className="label">Strategy</label>
              <select
                className="input"
                value={jobRetry.strategy ?? ''}
                onChange={(e) => updateJobRetry({ strategy: (e.target.value || undefined) as JobRetryConfig['strategy'] })}
              >
                <option value="">Default</option>
                <option value="fixed">Fixed</option>
                <option value="linear">Linear</option>
                <option value="exponential">Exponential</option>
              </select>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                className="accent-accent"
                checked={jobRetry.jitter ?? false}
                onChange={(e) => updateJobRetry({ jitter: e.target.checked })}
              />
              Jitter
            </label>
            <div>
              <label className="label">Lock TTL (ms)</label>
              <input
                type="number"
                className="input"
                value={jobConfig.lock_ttl_ms ?? ''}
                onChange={(e) => updateJobConfig({ lock_ttl_ms: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="60000"
              />
            </div>
            <div>
              <label className="label">Jitter (ms)</label>
              <input
                type="number"
                className="input"
                value={jobConfig.jitter_ms ?? ''}
                onChange={(e) => updateJobConfig({ jitter_ms: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 5000"
              />
            </div>
          </div>
        )}
      </div>

      {/* Pattern */}
      <div className="border-t border-border/50 pt-2">
        <button
          className="flex items-center gap-1.5 w-full"
          onClick={() => setPatternOpen(!patternOpen)}
        >
          {patternOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
          )}
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
            Pattern
          </span>
        </button>
        {patternOpen && (
          <div className="space-y-2 ml-2 mt-2">
            <div>
              <label className="label">Event</label>
              <input
                className="input"
                value={pattern.event ?? ''}
                onChange={(e) => updatePattern({ event: e.target.value || undefined })}
                placeholder="e.g. payment.*"
              />
            </div>
            <div>
              <label className="label">Group By</label>
              <input
                className="input"
                value={pattern.group_by ?? ''}
                onChange={(e) => updatePattern({ group_by: e.target.value || undefined })}
                placeholder="e.g. user_id"
              />
            </div>
            <div>
              <label className="label">Threshold</label>
              <input
                type="number"
                className="input"
                value={pattern.threshold ?? ''}
                onChange={(e) => updatePattern({ threshold: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 3"
              />
            </div>
            <div>
              <label className="label">Window</label>
              <input
                className="input"
                value={pattern.window ?? ''}
                onChange={(e) => updatePattern({ window: e.target.value || undefined })}
                placeholder="e.g. 5m, 1h"
              />
            </div>
          </div>
        )}
      </div>

      <ExtraFieldsEditor spec={spec} nodeType="trigger" onChange={onChange} />
    </div>
  );
}
