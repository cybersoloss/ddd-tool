import { useCallback, useRef, useState } from 'react';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useSpecsStore } from '../../stores/specs-store';
import { useProjectStore } from '../../stores/project-store';
import type { UIPageSpec, PageSection, FormSpec, FormField } from '../../types/specs';
import { UIPagePreview } from './UIPagePreview';

const POSITION_OPTIONS = ['top', 'main', 'sidebar', 'footer', 'top-left', 'top-right', 'bottom'];
const FORM_POSITION_OPTIONS = ['modal', 'sidebar', 'inline', 'drawer'];
const FORM_FIELD_TYPES = [
  'text', 'number', 'select', 'multi-select', 'search-select',
  'date', 'datetime', 'textarea', 'toggle', 'tag-input', 'file', 'color', 'slider',
];
const LOADING_OPTIONS = ['skeleton', 'spinner', 'blur'];
const ERROR_OPTIONS = ['retry-banner', 'error-page', 'toast'];
const REFRESH_OPTIONS = ['pull-to-refresh', 'auto-5s', 'auto-10s', 'auto-30s', 'manual', 'none'];

interface Props {
  pageId: string;
  spec: UIPageSpec;
  onBack: () => void;
}

export function UIPageEditor({ pageId, spec, onBack }: Props) {
  const projectPath = useProjectStore((s) => s.projectPath);
  const savePageSpec = useSpecsStore((s) => s.savePageSpec);

  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    sections: true,
    forms: false,
    state: false,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = useCallback(
    (updated: UIPageSpec) => {
      if (!projectPath) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        savePageSpec(projectPath, pageId, updated);
      }, 500);
    },
    [projectPath, pageId, savePageSpec],
  );

  const toggleSection = (section: string) => {
    setExpanded((s) => ({ ...s, [section]: !s[section] }));
  };

  // Section helpers
  const updateSection = (index: number, updates: Partial<PageSection>) => {
    const sections = [...(spec.sections ?? [])];
    sections[index] = { ...sections[index], ...updates };
    save({ ...spec, sections });
  };

  const addSection = () => {
    const sections = [...(spec.sections ?? []), { id: '', component: '', position: 'main' }];
    save({ ...spec, sections });
  };

  const removeSection = (index: number) => {
    const sections = (spec.sections ?? []).filter((_, i) => i !== index);
    save({ ...spec, sections });
  };

  // Form helpers
  const updateForm = (index: number, updates: Partial<FormSpec>) => {
    const forms = [...(spec.forms ?? [])];
    forms[index] = { ...forms[index], ...updates };
    save({ ...spec, forms });
  };

  const addForm = () => {
    const forms = [
      ...(spec.forms ?? []),
      { id: '', label: '', fields: [], submit: { flow: '', label: 'Submit' } },
    ];
    save({ ...spec, forms });
  };

  const removeForm = (index: number) => {
    const forms = (spec.forms ?? []).filter((_, i) => i !== index);
    save({ ...spec, forms });
  };

  const updateFormField = (formIndex: number, fieldIndex: number, updates: Partial<FormField>) => {
    const forms = [...(spec.forms ?? [])];
    const fields = [...(forms[formIndex].fields ?? [])];
    fields[fieldIndex] = { ...fields[fieldIndex], ...updates };
    forms[formIndex] = { ...forms[formIndex], fields };
    save({ ...spec, forms });
  };

  const addFormField = (formIndex: number) => {
    const forms = [...(spec.forms ?? [])];
    const fields = [...(forms[formIndex].fields ?? []), { name: '', type: 'text', label: '' }];
    forms[formIndex] = { ...forms[formIndex], fields };
    save({ ...spec, forms });
  };

  const removeFormField = (formIndex: number, fieldIndex: number) => {
    const forms = [...(spec.forms ?? [])];
    const fields = (forms[formIndex].fields ?? []).filter((_, i) => i !== fieldIndex);
    forms[formIndex] = { ...forms[formIndex], fields };
    save({ ...spec, forms });
  };

  const SectionHeader = ({ id, label, count }: { id: string; label: string; count: number }) => (
    <button
      className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
      onClick={() => toggleSection(id)}
    >
      {expanded[id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      {label}
      <span className="text-[10px] text-text-muted">({count})</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <button className="btn-icon !p-1" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-text-primary truncate">{spec.page || pageId}</div>
          <div className="text-[10px] text-text-muted">{spec.route}</div>
        </div>
        <div className="flex shrink-0 border border-border rounded overflow-hidden ml-auto">
          <button
            className={`px-2 py-0.5 text-[10px] transition-colors ${
              mode === 'edit' ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-hover'
            }`}
            onClick={() => setMode('edit')}
          >Edit</button>
          <button
            className={`px-2 py-0.5 text-[10px] transition-colors ${
              mode === 'preview' ? 'bg-accent text-white' : 'text-text-muted hover:bg-bg-hover'
            }`}
            onClick={() => setMode('preview')}
          >Preview</button>
        </div>
      </div>

      {mode === 'preview' && (
        <div className="flex-1 overflow-y-auto p-2">
          <UIPagePreview spec={spec} pageId={pageId} />
        </div>
      )}

      {mode === 'edit' && <>
      {/* Meta */}
      <div className="px-3 py-2 space-y-2 border-b border-border">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="label">Loading</label>
            <select
              className="input text-xs w-full"
              value={spec.loading ?? ''}
              onChange={(e) => save({ ...spec, loading: e.target.value || undefined })}
            >
              <option value="">—</option>
              {LOADING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="label">Error</label>
            <select
              className="input text-xs w-full"
              value={spec.error ?? ''}
              onChange={(e) => save({ ...spec, error: e.target.value || undefined })}
            >
              <option value="">—</option>
              {ERROR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Refresh</label>
          <select
            className="input text-xs w-full"
            value={spec.refresh ?? ''}
            onChange={(e) => save({ ...spec, refresh: e.target.value || undefined })}
          >
            <option value="">—</option>
            {REFRESH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Sections */}
        <SectionHeader id="sections" label="Sections" count={spec.sections?.length ?? 0} />
        {expanded.sections && (
          <div className="px-3 pb-2 space-y-2">
            {(spec.sections ?? []).map((section, i) => (
              <div key={i} className="border border-border rounded p-2 space-y-1.5 group relative">
                <button
                  className="absolute top-1 right-1 btn-icon !p-0.5 opacity-0 group-hover:opacity-100"
                  onClick={() => removeSection(i)}
                >
                  <Trash2 className="w-3 h-3 text-danger" />
                </button>
                <div className="flex gap-2">
                  <input
                    className="input text-xs flex-1"
                    value={section.id}
                    onChange={(e) => updateSection(i, { id: e.target.value })}
                    placeholder="section id"
                  />
                  <select
                    className="input text-xs w-24"
                    value={section.position ?? 'main'}
                    onChange={(e) => updateSection(i, { position: e.target.value })}
                  >
                    {POSITION_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <input
                  className="input text-xs w-full"
                  value={section.component}
                  onChange={(e) => updateSection(i, { component: e.target.value })}
                  placeholder="component"
                />
                <input
                  className="input text-xs w-full"
                  value={section.label ?? ''}
                  onChange={(e) => updateSection(i, { label: e.target.value })}
                  placeholder="label"
                />
                <input
                  className="input text-xs w-full"
                  value={section.data_source ?? ''}
                  onChange={(e) => updateSection(i, { data_source: e.target.value || undefined })}
                  placeholder="data_source (domain/flow-id)"
                />
                <input
                  className="input text-xs w-full"
                  value={section.visible_when ?? ''}
                  onChange={(e) => updateSection(i, { visible_when: e.target.value || undefined })}
                  placeholder="visible_when (condition)"
                />
              </div>
            ))}
            <button
              className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
              onClick={addSection}
            >
              <Plus className="w-3 h-3" /> Add section
            </button>
          </div>
        )}

        {/* Forms */}
        <SectionHeader id="forms" label="Forms" count={spec.forms?.length ?? 0} />
        {expanded.forms && (
          <div className="px-3 pb-2 space-y-2">
            {(spec.forms ?? []).map((form, fi) => (
              <div key={fi} className="border border-border rounded p-2 space-y-1.5 group relative">
                <button
                  className="absolute top-1 right-1 btn-icon !p-0.5 opacity-0 group-hover:opacity-100"
                  onClick={() => removeForm(fi)}
                >
                  <Trash2 className="w-3 h-3 text-danger" />
                </button>
                <div className="flex gap-2">
                  <input
                    className="input text-xs flex-1"
                    value={form.id}
                    onChange={(e) => updateForm(fi, { id: e.target.value })}
                    placeholder="form id"
                  />
                  <select
                    className="input text-xs w-24"
                    value={form.position ?? 'modal'}
                    onChange={(e) => updateForm(fi, { position: e.target.value })}
                  >
                    {FORM_POSITION_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <input
                  className="input text-xs w-full"
                  value={form.label}
                  onChange={(e) => updateForm(fi, { label: e.target.value })}
                  placeholder="label"
                />
                <input
                  className="input text-xs w-full"
                  value={form.description ?? ''}
                  onChange={(e) => updateForm(fi, { description: e.target.value })}
                  placeholder="description"
                />

                {/* Submit */}
                <div className="text-[10px] text-text-muted font-medium mt-1">Submit</div>
                <div className="flex gap-2">
                  <input
                    className="input text-xs flex-1"
                    value={form.submit?.flow ?? ''}
                    onChange={(e) =>
                      updateForm(fi, { submit: { ...(form.submit ?? { flow: '', label: '' }), flow: e.target.value } })
                    }
                    placeholder="flow (domain/flow-id)"
                  />
                  <input
                    className="input text-xs w-24"
                    value={form.submit?.label ?? ''}
                    onChange={(e) =>
                      updateForm(fi, { submit: { ...(form.submit ?? { flow: '', label: '' }), label: e.target.value } })
                    }
                    placeholder="label"
                  />
                </div>

                {/* Fields */}
                <div className="text-[10px] text-text-muted font-medium mt-1">
                  Fields ({form.fields?.length ?? 0})
                </div>
                {(form.fields ?? []).map((field, ffi) => (
                  <div key={ffi} className="ml-2 border-l-2 border-border pl-2 space-y-1 relative">
                    <button
                      className="absolute top-0 right-0 btn-icon !p-0.5 opacity-0 group-hover:opacity-100"
                      onClick={() => removeFormField(fi, ffi)}
                    >
                      <Trash2 className="w-2.5 h-2.5 text-danger" />
                    </button>
                    <div className="flex gap-1">
                      <input
                        className="input text-[10px] flex-1"
                        value={field.name}
                        onChange={(e) => updateFormField(fi, ffi, { name: e.target.value })}
                        placeholder="name"
                      />
                      <select
                        className="input text-[10px] w-20"
                        value={field.type}
                        onChange={(e) => updateFormField(fi, ffi, { type: e.target.value })}
                      >
                        {FORM_FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <input
                      className="input text-[10px] w-full"
                      value={field.label}
                      onChange={(e) => updateFormField(fi, ffi, { label: e.target.value })}
                      placeholder="label"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[10px] text-text-muted">
                        <input
                          type="checkbox"
                          checked={field.required ?? false}
                          onChange={(e) => updateFormField(fi, ffi, { required: e.target.checked })}
                        />
                        required
                      </label>
                    </div>
                  </div>
                ))}
                <button
                  className="flex items-center gap-1 text-[10px] text-accent hover:text-accent-hover ml-2"
                  onClick={() => addFormField(fi)}
                >
                  <Plus className="w-2.5 h-2.5" /> Add field
                </button>
              </div>
            ))}
            <button
              className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
              onClick={addForm}
            >
              <Plus className="w-3 h-3" /> Add form
            </button>
          </div>
        )}

        {/* State */}
        <SectionHeader id="state" label="State" count={spec.state?.initial_fetch?.length ?? 0} />
        {expanded.state && (
          <div className="px-3 pb-2 space-y-2">
            <div>
              <label className="label">Store</label>
              <input
                className="input text-xs w-full"
                value={spec.state?.store ?? ''}
                onChange={(e) =>
                  save({ ...spec, state: { ...(spec.state ?? {}), store: e.target.value } })
                }
                placeholder="store name"
              />
            </div>
            <div>
              <label className="label">Initial Fetch</label>
              <textarea
                className="input text-xs w-full min-h-[40px] resize-y"
                value={(spec.state?.initial_fetch ?? []).join('\n')}
                onChange={(e) =>
                  save({
                    ...spec,
                    state: {
                      ...(spec.state ?? {}),
                      initial_fetch: e.target.value.split('\n').map((v) => v.trim()).filter(Boolean),
                    },
                  })
                }
                placeholder="domain/flow-id (one per line)"
              />
            </div>
          </div>
        )}
      </div>
      </>}
    </div>
  );
}
