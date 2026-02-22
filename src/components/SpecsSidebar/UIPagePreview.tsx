import { useSpecsStore } from '../../stores/specs-store';
import type { UIPageSpec, PageSection, FormSpec, NavigationConfig } from '../../types/specs';

interface Props {
  spec: UIPageSpec;
  pageId: string;
}

// ── Field type → input mock ───────────────────────────────────────────────────

function FieldMock({ type }: { type: string }) {
  switch (type) {
    case 'textarea':
      return (
        <div className="border border-border rounded h-10 bg-bg-primary text-[10px] text-text-muted px-2 flex items-start pt-1 w-full">
          ___
        </div>
      );
    case 'select':
    case 'multi-select':
    case 'search-select':
      return (
        <div className="border border-border rounded h-6 bg-bg-primary text-[10px] text-text-muted px-2 flex items-center justify-between w-full">
          <span>Select...</span>
          <span>▾</span>
        </div>
      );
    case 'toggle':
    case 'boolean':
      return <div className="text-[10px] text-text-muted">○</div>;
    case 'date':
    case 'datetime':
      return (
        <div className="border border-border rounded h-6 bg-bg-primary text-[10px] text-text-muted px-2 flex items-center w-full">
          yyyy-mm-dd
        </div>
      );
    case 'file':
      return (
        <div className="border border-border rounded h-6 bg-bg-primary text-[10px] text-text-muted px-2 flex items-center w-full">
          [Choose file]
        </div>
      );
    case 'slider':
      return (
        <div className="border border-border rounded h-6 bg-bg-primary text-[10px] text-text-muted px-2 flex items-center w-full">
          ──●─────
        </div>
      );
    case 'tag-input':
      return (
        <div className="border border-border rounded h-6 bg-bg-primary text-[10px] text-text-muted px-2 flex items-center gap-1 w-full">
          <span className="border border-border rounded px-1">[tag]</span>
          <span>[+]</span>
        </div>
      );
    default:
      // text, email, url, password, number, color
      return (
        <div className="border border-border rounded h-6 bg-bg-primary text-[10px] text-text-muted px-2 flex items-center w-full">
          _____________
        </div>
      );
  }
}

// ── Form block ────────────────────────────────────────────────────────────────

function FormBlock({ form }: { form: FormSpec }) {
  const isInline = !form.position || form.position === 'inline';

  if (!isInline) {
    return (
      <div className="border border-border rounded px-2 py-1.5 text-[10px] text-text-muted flex items-center gap-1.5 mb-1">
        <span>▣</span>
        <span>Open: {form.label || form.id}</span>
      </div>
    );
  }

  return (
    <div className="border border-dashed border-border-subtle rounded p-2 mb-2">
      {form.label && (
        <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1.5">
          {form.label}
        </div>
      )}
      <div className="space-y-1.5">
        {(form.fields ?? []).map((field, i) => (
          <div key={i}>
            <div className="text-[10px] text-text-muted mb-0.5">
              {field.label || field.name}
              {field.required && <span className="text-danger ml-0.5">*</span>}
            </div>
            <FieldMock type={field.type} />
          </div>
        ))}
      </div>
      {form.submit && (
        <div className="mt-2">
          <div className="border border-accent rounded px-2 py-0.5 text-[10px] text-accent inline-block">
            {form.submit.label || 'Submit'}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section block ─────────────────────────────────────────────────────────────

function SectionBlock({ section, forms }: { section: PageSection; forms: FormSpec[] }) {
  const comp = (section.component ?? '').toLowerCase();

  const label = section.label || section.id || section.component;

  // Table / List / Data
  if (/table|list|data-/.test(comp)) {
    const cols = section.fields ? Object.keys(section.fields as Record<string, unknown>) : ['col1', 'col2', 'col3'];
    return (
      <div className="border border-dashed border-border-subtle rounded p-2 mb-2">
        <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1.5">
          {label}
        </div>
        {/* Header row */}
        <div className="flex gap-1 mb-1">
          {cols.slice(0, 4).map((col) => (
            <div key={col} className="flex-1 bg-bg-hover rounded h-5 flex items-center px-1">
              <span className="text-[9px] text-text-muted truncate">{col}</span>
            </div>
          ))}
          {section.item_actions && section.item_actions.length > 0 && (
            <div className="w-12" />
          )}
        </div>
        {/* Skeleton rows */}
        {[0, 1, 2].map((r) => (
          <div key={r} className="flex gap-1 mb-1">
            {cols.slice(0, 4).map((col) => (
              <div key={col} className="flex-1 bg-bg-hover rounded h-2.5" />
            ))}
            {section.item_actions && section.item_actions.length > 0 && (
              <div className="w-12 flex gap-0.5">
                {section.item_actions.slice(0, 2).map((action, i) => (
                  <div key={i} className="border border-border rounded px-1 py-0.5 text-[9px] text-text-muted">
                    {action.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {/* Pagination */}
        {section.pagination && (
          <div className="flex justify-end gap-1 mt-1">
            <div className="border border-border rounded px-2 py-0.5 text-[10px] text-text-muted">‹</div>
            <div className="border border-border rounded px-2 py-0.5 text-[10px] text-text-muted">1</div>
            <div className="border border-border rounded px-2 py-0.5 text-[10px] text-text-muted">›</div>
          </div>
        )}
      </div>
    );
  }

  // Grid / Card / Tile
  if (/grid|card|tile/.test(comp)) {
    const fields = section.fields ? Object.keys(section.fields as Record<string, unknown>) : [];
    return (
      <div className="border border-dashed border-border-subtle rounded p-2 mb-2">
        <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1.5">
          {label}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded p-1.5 space-y-1">
              <div className="bg-bg-hover rounded h-8 w-full" />
              {fields.slice(0, 2).map((f) => (
                <div key={f} className="text-[9px] text-text-muted truncate">{f}</div>
              ))}
              {fields.length === 0 && (
                <div className="bg-bg-hover rounded h-2 w-3/4" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Stat / Metric / KPI
  if (/stat|metric|kpi/.test(comp)) {
    const statLabels = section.fields
      ? Object.keys(section.fields as Record<string, unknown>).slice(0, 4)
      : ['Stat 1', 'Stat 2', 'Stat 3'];
    return (
      <div className="border border-dashed border-border-subtle rounded p-2 mb-2">
        <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1.5">
          {label}
        </div>
        <div className="flex gap-1.5">
          {statLabels.map((s) => (
            <div key={s} className="border border-border rounded p-2 text-center flex-1">
              <div className="text-[9px] text-text-muted truncate">{s}</div>
              <div className="text-xs font-medium text-text-secondary mt-0.5">—</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Header / Hero / Page-header
  if (/header|hero|page-header/.test(comp)) {
    return (
      <div className="border border-dashed border-border-subtle rounded p-2 mb-2">
        <div className="bg-bg-hover rounded h-5 w-1/2 mb-1" />
        <div className="bg-bg-hover rounded h-2.5 w-3/4 mb-2" />
        {section.buttons && section.buttons.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {section.buttons.map((btn, i) => (
              <div key={i} className="border border-border rounded px-2 py-0.5 text-[10px] text-text-muted">
                {btn.label}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Form section (references a form by id)
  if (/form/.test(comp)) {
    const matchedForm = forms.find((f) => f.id === section.id || f.id === section.data_source);
    if (matchedForm) {
      return <FormBlock form={matchedForm} />;
    }
  }

  // Default: labeled dashed box
  return (
    <div className="border border-dashed border-border-subtle rounded p-2 mb-2">
      <div className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-[10px] text-text-muted opacity-60">
        {section.component}
        {section.data_source && (
          <span className="ml-1 opacity-70">← {section.data_source}</span>
        )}
      </div>
      <div className="bg-bg-hover rounded h-2.5 w-full mt-1.5" />
      <div className="bg-bg-hover rounded h-2.5 w-2/3 mt-1" />
    </div>
  );
}

// ── Navigation block ──────────────────────────────────────────────────────────

function NavigationBlock({
  nav,
  layout,
}: {
  nav: NavigationConfig;
  layout: 'sidebar' | 'topbar' | 'tabs' | 'none';
}) {
  if (layout === 'sidebar') {
    return (
      <div className="w-20 shrink-0 border border-dashed border-border-subtle rounded p-1.5 mr-2 space-y-1">
        <div className="text-[9px] font-medium text-text-muted uppercase tracking-wide mb-1">Nav</div>
        {(nav.items ?? []).map((item, i) => (
          <div key={i} className="text-[10px] text-text-muted truncate px-1 py-0.5 rounded hover:bg-bg-hover">
            {item.label || item.page}
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'topbar') {
    return (
      <div className="border border-dashed border-border-subtle rounded p-1.5 mb-2 flex items-center gap-2">
        <div className="text-[9px] font-medium text-text-muted uppercase tracking-wide mr-1">Nav</div>
        {(nav.items ?? []).map((item, i) => (
          <div key={i} className="text-[10px] text-text-muted px-1.5 py-0.5 rounded border border-border">
            {item.label || item.page}
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'tabs') {
    return (
      <div className="border-b border-border mb-2 flex items-center gap-0">
        {(nav.items ?? []).map((item, i) => (
          <div
            key={i}
            className={`text-[10px] px-2 py-1 border-b-2 ${
              i === 0 ? 'border-accent text-text-primary' : 'border-transparent text-text-muted'
            }`}
          >
            {item.label || item.page}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export function UIPagePreview({ spec, pageId }: Props) {
  const pagesConfig = useSpecsStore((s) => s.pagesConfig);

  const pageEntry = pagesConfig?.pages?.find((p) => p.id === pageId);
  const layout = pageEntry?.layout ?? 'full';
  const nav = pagesConfig?.navigation;
  const navType = (nav?.type ?? 'none') as 'sidebar' | 'topbar' | 'tabs' | 'none';

  const sections = spec.sections ?? [];
  const forms = spec.forms ?? [];
  const inlineForms = forms.filter((f) => !f.position || f.position === 'inline');
  const nonInlineForms = forms.filter((f) => f.position && f.position !== 'inline');

  const hasContent = sections.length > 0 || forms.length > 0;

  if (!hasContent) {
    return (
      <div className="text-[11px] text-text-muted text-center py-6 px-3">
        No sections defined yet — add sections in Edit mode
      </div>
    );
  }

  const contentArea = (
    <div className={layout === 'centered' ? 'max-w-xs mx-auto w-full' : layout === 'split' ? 'flex-1' : 'flex-1'}>
      {/* Top nav (topbar / tabs) */}
      {nav && (navType === 'topbar' || navType === 'tabs') && (
        <NavigationBlock nav={nav} layout={navType} />
      )}

      {/* Sections */}
      {sections.map((section, i) => (
        <SectionBlock key={section.id || i} section={section} forms={forms} />
      ))}

      {/* Inline forms not already rendered by a section */}
      {inlineForms.filter((f) => !sections.some((s) => s.id === f.id)).map((form) => (
        <FormBlock key={form.id} form={form} />
      ))}

      {/* Non-inline form triggers */}
      {nonInlineForms.length > 0 && (
        <div className="space-y-1 mt-1">
          {nonInlineForms.map((form) => (
            <FormBlock key={form.id} form={form} />
          ))}
        </div>
      )}
    </div>
  );

  // Sidebar layout: nav column + content
  if (layout === 'sidebar' && nav && navType === 'sidebar') {
    return (
      <div className="flex flex-row">
        <NavigationBlock nav={nav} layout="sidebar" />
        {contentArea}
      </div>
    );
  }

  // Split layout: two equal columns
  if (layout === 'split') {
    return (
      <div className="flex flex-row gap-2">
        <div className="flex-1">
          {sections.slice(0, Math.ceil(sections.length / 2)).map((section, i) => (
            <SectionBlock key={section.id || i} section={section} forms={forms} />
          ))}
        </div>
        <div className="flex-1">
          {sections.slice(Math.ceil(sections.length / 2)).map((section, i) => (
            <SectionBlock key={section.id || i} section={section} forms={forms} />
          ))}
        </div>
      </div>
    );
  }

  return contentArea;
}
