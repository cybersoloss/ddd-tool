import { useCallback, useRef } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useSpecsStore } from '../../stores/specs-store';
import { useProjectStore } from '../../stores/project-store';
import type { PagesConfig, NavigationItem, SharedComponent } from '../../types/specs';

const NAV_TYPES = ['sidebar', 'topbar', 'tabs', 'drawer', 'none'];
const COLOR_SCHEMES = ['light', 'dark', 'system'];
const LAYOUT_OPTIONS = ['sidebar', 'full', 'centered', 'split', 'stacked'];

interface Props {
  onBack: () => void;
}

export function UIPagesConfigEditor({ onBack }: Props) {
  const projectPath = useProjectStore((s) => s.projectPath);
  const pagesConfig = useSpecsStore((s) => s.pagesConfig);
  const savePagesConfig = useSpecsStore((s) => s.savePagesConfig);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = useCallback(
    (updated: PagesConfig) => {
      if (!projectPath) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        savePagesConfig(projectPath, updated);
      }, 500);
    },
    [projectPath, savePagesConfig],
  );

  const config = pagesConfig ?? { pages: [] };

  const updateConfig = (updates: Partial<PagesConfig>) => {
    save({ ...config, ...updates });
  };

  const updateNavItem = (index: number, updates: Partial<NavigationItem>) => {
    const items = [...(config.navigation?.items ?? [])];
    items[index] = { ...items[index], ...updates };
    save({ ...config, navigation: { ...(config.navigation ?? { type: 'sidebar', items: [] }), items } });
  };

  const addNavItem = () => {
    const items = [...(config.navigation?.items ?? []), { page: '', icon: '', label: '' }];
    save({ ...config, navigation: { ...(config.navigation ?? { type: 'sidebar', items: [] }), items } });
  };

  const removeNavItem = (index: number) => {
    const items = (config.navigation?.items ?? []).filter((_, i) => i !== index);
    save({ ...config, navigation: { ...(config.navigation ?? { type: 'sidebar', items: [] }), items } });
  };

  const updateSharedComponent = (index: number, updates: Partial<SharedComponent>) => {
    const components = [...(config.shared_components ?? [])];
    components[index] = { ...components[index], ...updates };
    save({ ...config, shared_components: components });
  };

  const addSharedComponent = () => {
    const components = [...(config.shared_components ?? []), { id: '', description: '' }];
    save({ ...config, shared_components: components });
  };

  const removeSharedComponent = (index: number) => {
    const components = (config.shared_components ?? []).filter((_, i) => i !== index);
    save({ ...config, shared_components: components });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <button className="btn-icon !p-1" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-medium text-text-primary">App Config</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* App settings */}
        <div className="px-3 py-2 space-y-2 border-b border-border">
          <div className="text-xs font-medium text-text-secondary mb-1">Application</div>
          <div>
            <label className="label">App Type</label>
            <input
              className="input text-xs w-full"
              value={config.app_type ?? ''}
              onChange={(e) => updateConfig({ app_type: e.target.value })}
              placeholder="web / mobile / desktop / cli"
            />
          </div>
          <div>
            <label className="label">Framework</label>
            <input
              className="input text-xs w-full"
              value={config.framework ?? ''}
              onChange={(e) => updateConfig({ framework: e.target.value })}
              placeholder="e.g. Next.js 14"
            />
          </div>
          <div>
            <label className="label">Router</label>
            <input
              className="input text-xs w-full"
              value={config.router ?? ''}
              onChange={(e) => updateConfig({ router: e.target.value })}
              placeholder="app / pages / hash / native"
            />
          </div>
          <div>
            <label className="label">State Management</label>
            <input
              className="input text-xs w-full"
              value={config.state_management ?? ''}
              onChange={(e) => updateConfig({ state_management: e.target.value })}
              placeholder="zustand / redux / context"
            />
          </div>
          <div>
            <label className="label">Component Library</label>
            <input
              className="input text-xs w-full"
              value={config.component_library ?? ''}
              onChange={(e) => updateConfig({ component_library: e.target.value })}
              placeholder="shadcn/ui / mui / radix"
            />
          </div>
        </div>

        {/* Theme */}
        <div className="px-3 py-2 space-y-2 border-b border-border">
          <div className="text-xs font-medium text-text-secondary mb-1">Theme</div>
          <div>
            <label className="label">Color Scheme</label>
            <select
              className="input text-xs w-full"
              value={config.theme?.color_scheme ?? 'system'}
              onChange={(e) =>
                updateConfig({ theme: { ...config.theme, color_scheme: e.target.value } })
              }
            >
              {COLOR_SCHEMES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Primary Color</label>
            <div className="flex gap-2">
              <input
                className="input text-xs flex-1"
                value={config.theme?.primary_color ?? ''}
                onChange={(e) =>
                  updateConfig({ theme: { ...config.theme, primary_color: e.target.value } })
                }
                placeholder="#2563eb"
              />
              {config.theme?.primary_color && (
                <div
                  className="w-7 h-7 rounded border border-border flex-shrink-0"
                  style={{ backgroundColor: config.theme.primary_color }}
                />
              )}
            </div>
          </div>
          <div>
            <label className="label">Font Family</label>
            <input
              className="input text-xs w-full"
              value={config.theme?.font_family ?? ''}
              onChange={(e) =>
                updateConfig({ theme: { ...config.theme, font_family: e.target.value } })
              }
              placeholder="Inter, system-ui"
            />
          </div>
          <div>
            <label className="label">Border Radius (px)</label>
            <input
              className="input text-xs w-full"
              type="number"
              value={config.theme?.border_radius ?? ''}
              onChange={(e) =>
                updateConfig({
                  theme: { ...config.theme, border_radius: e.target.value ? Number(e.target.value) : undefined },
                })
              }
              placeholder="8"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="px-3 py-2 space-y-2 border-b border-border">
          <div className="text-xs font-medium text-text-secondary mb-1">Navigation</div>
          <div>
            <label className="label">Type</label>
            <select
              className="input text-xs w-full"
              value={config.navigation?.type ?? 'sidebar'}
              onChange={(e) =>
                updateConfig({
                  navigation: { ...(config.navigation ?? { type: 'sidebar', items: [] }), type: e.target.value },
                })
              }
            >
              {NAV_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {(config.navigation?.items ?? []).map((item, i) => (
            <div key={i} className="border border-border rounded p-2 space-y-1.5 group relative">
              <button
                className="absolute top-1 right-1 btn-icon !p-0.5 opacity-0 group-hover:opacity-100"
                onClick={() => removeNavItem(i)}
              >
                <Trash2 className="w-3 h-3 text-danger" />
              </button>
              <div className="flex gap-2">
                <input
                  className="input text-xs flex-1"
                  value={item.page}
                  onChange={(e) => updateNavItem(i, { page: e.target.value })}
                  placeholder="page id"
                />
                <input
                  className="input text-xs w-20"
                  value={item.icon ?? ''}
                  onChange={(e) => updateNavItem(i, { icon: e.target.value })}
                  placeholder="icon"
                />
              </div>
              <div className="flex gap-2">
                <input
                  className="input text-xs flex-1"
                  value={item.label}
                  onChange={(e) => updateNavItem(i, { label: e.target.value })}
                  placeholder="label"
                />
                <input
                  className="input text-xs w-20"
                  value={item.badge ?? ''}
                  onChange={(e) => updateNavItem(i, { badge: e.target.value || undefined })}
                  placeholder="badge"
                />
              </div>
            </div>
          ))}
          <button
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
            onClick={addNavItem}
          >
            <Plus className="w-3 h-3" /> Add nav item
          </button>
        </div>

        {/* Shared Components */}
        <div className="px-3 py-2 space-y-2 border-b border-border">
          <div className="text-xs font-medium text-text-secondary mb-1">Shared Components</div>
          {(config.shared_components ?? []).map((comp, i) => (
            <div key={i} className="border border-border rounded p-2 space-y-1.5 group relative">
              <button
                className="absolute top-1 right-1 btn-icon !p-0.5 opacity-0 group-hover:opacity-100"
                onClick={() => removeSharedComponent(i)}
              >
                <Trash2 className="w-3 h-3 text-danger" />
              </button>
              <input
                className="input text-xs w-full"
                value={comp.id}
                onChange={(e) => updateSharedComponent(i, { id: e.target.value })}
                placeholder="component id"
              />
              <input
                className="input text-xs w-full"
                value={comp.description ?? ''}
                onChange={(e) => updateSharedComponent(i, { description: e.target.value })}
                placeholder="description"
              />
              <input
                className="input text-xs w-full"
                value={(comp.used_by ?? []).join(', ')}
                onChange={(e) =>
                  updateSharedComponent(i, {
                    used_by: e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
                  })
                }
                placeholder="used by (comma-separated page ids)"
              />
            </div>
          ))}
          <button
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
            onClick={addSharedComponent}
          >
            <Plus className="w-3 h-3" /> Add component
          </button>
        </div>

        {/* Page Defaults */}
        <div className="px-3 py-2 space-y-2">
          <div className="text-xs font-medium text-text-secondary mb-1">Pages</div>
          {(config.pages ?? []).map((page, i) => (
            <div key={page.id} className="border border-border rounded p-2 space-y-1.5">
              <div className="flex gap-2">
                <input
                  className="input text-xs flex-1"
                  value={page.id}
                  onChange={(e) => {
                    const pages = [...config.pages];
                    pages[i] = { ...pages[i], id: e.target.value };
                    updateConfig({ pages });
                  }}
                  placeholder="id"
                />
                <select
                  className="input text-xs w-24"
                  value={page.layout ?? 'sidebar'}
                  onChange={(e) => {
                    const pages = [...config.pages];
                    pages[i] = { ...pages[i], layout: e.target.value };
                    updateConfig({ pages });
                  }}
                >
                  {LAYOUT_OPTIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <input
                className="input text-xs w-full"
                value={page.route}
                onChange={(e) => {
                  const pages = [...config.pages];
                  pages[i] = { ...pages[i], route: e.target.value };
                  updateConfig({ pages });
                }}
                placeholder="route"
              />
              <input
                className="input text-xs w-full"
                value={page.name}
                onChange={(e) => {
                  const pages = [...config.pages];
                  pages[i] = { ...pages[i], name: e.target.value };
                  updateConfig({ pages });
                }}
                placeholder="name"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
