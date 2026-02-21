import { useCallback, useRef, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Server, GripVertical } from 'lucide-react';
import { useSpecsStore } from '../../stores/specs-store';
import { useProjectStore } from '../../stores/project-store';
import type { InfrastructureSpec, ServiceConfig, DeploymentConfig, EnvironmentDeployment } from '../../types/specs';

const SERVICE_TYPES = ['server', 'datastore', 'worker', 'proxy'];
const DEPLOYMENT_STRATEGIES = ['process-manager', 'docker-compose', 'kubernetes', 'serverless', 'platform'];

export function InfrastructureEditor() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const infrastructure = useSpecsStore((s) => s.infrastructure);
  const saveInfrastructure = useSpecsStore((s) => s.saveInfrastructure);

  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    services: true,
    startup: false,
    deployment: false,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = useCallback(
    (updated: InfrastructureSpec) => {
      if (!projectPath) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        saveInfrastructure(projectPath, updated);
      }, 500);
    },
    [projectPath, saveInfrastructure],
  );

  const infra = infrastructure ?? { services: [] };

  const toggleSection = (section: string) => {
    setExpandedSections((s) => ({ ...s, [section]: !s[section] }));
  };

  const updateService = (index: number, updates: Partial<ServiceConfig>) => {
    const services = [...infra.services];
    services[index] = { ...services[index], ...updates };
    save({ ...infra, services });
  };

  const addService = () => {
    const services = [...infra.services, { id: '', type: 'server' }];
    save({ ...infra, services });
  };

  const removeService = (index: number) => {
    const services = infra.services.filter((_, i) => i !== index);
    save({ ...infra, services });
    setExpandedService(null);
  };

  const updateDeployment = (env: keyof DeploymentConfig, updates: Partial<EnvironmentDeployment>) => {
    const deployment = { ...(infra.deployment ?? {}) };
    deployment[env] = { ...(deployment[env] ?? {}), ...updates };
    save({ ...infra, deployment });
  };

  const typeBadgeColor = (type: string) => {
    switch (type) {
      case 'server': return 'bg-blue-500/20 text-blue-400';
      case 'datastore': return 'bg-purple-500/20 text-purple-400';
      case 'worker': return 'bg-amber-500/20 text-amber-400';
      case 'proxy': return 'bg-green-500/20 text-green-400';
      default: return 'bg-bg-hover text-text-muted';
    }
  };

  const SectionHeader = ({ id, label, count }: { id: string; label: string; count: number }) => (
    <button
      className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
      onClick={() => toggleSection(id)}
    >
      {expandedSections[id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      {label}
      <span className="text-[10px] text-text-muted">({count})</span>
    </button>
  );

  if (!projectPath) return null;

  return (
    <div className="flex flex-col">
      {/* Services */}
      <SectionHeader id="services" label="Services" count={infra.services.length} />
      {expandedSections.services && (
        <div className="px-3 pb-2 space-y-1">
          {infra.services.map((service, i) => {
            const isExpanded = expandedService === service.id;
            return (
              <div key={i} className="border border-border rounded">
                <button
                  className="flex items-center gap-2 px-2 py-1.5 w-full text-left hover:bg-bg-hover transition-colors"
                  onClick={() => setExpandedService(isExpanded ? null : service.id)}
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3 text-text-muted" /> : <ChevronRight className="w-3 h-3 text-text-muted" />}
                  <Server className="w-3 h-3 text-text-muted" />
                  <span className="text-xs text-text-primary flex-1 truncate">
                    {service.id || '(unnamed)'}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeBadgeColor(service.type)}`}>
                    {service.type}
                  </span>
                  {service.port && (
                    <span className="text-[10px] text-text-muted">:{service.port}</span>
                  )}
                </button>

                {isExpanded && (
                  <div className="px-2 pb-2 space-y-1.5 border-t border-border pt-2">
                    <div className="flex gap-2">
                      <input
                        className="input text-xs flex-1"
                        value={service.id}
                        onChange={(e) => updateService(i, { id: e.target.value })}
                        placeholder="service id"
                      />
                      <select
                        className="input text-xs w-24"
                        value={service.type}
                        onChange={(e) => updateService(i, { type: e.target.value })}
                      >
                        {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    {(service.type === 'server' || service.type === 'worker') && (
                      <>
                        <input
                          className="input text-xs w-full"
                          value={service.runtime ?? ''}
                          onChange={(e) => updateService(i, { runtime: e.target.value || undefined })}
                          placeholder="runtime (e.g. Node.js 20)"
                        />
                        <input
                          className="input text-xs w-full"
                          value={service.framework ?? ''}
                          onChange={(e) => updateService(i, { framework: e.target.value || undefined })}
                          placeholder="framework (e.g. Express 4)"
                        />
                        <input
                          className="input text-xs w-full"
                          value={service.entry ?? ''}
                          onChange={(e) => updateService(i, { entry: e.target.value || undefined })}
                          placeholder="entry point"
                        />
                      </>
                    )}

                    {service.type === 'datastore' && (
                      <input
                        className="input text-xs w-full"
                        value={service.engine ?? ''}
                        onChange={(e) => updateService(i, { engine: e.target.value || undefined })}
                        placeholder="engine (e.g. PostgreSQL 16)"
                      />
                    )}

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="label">Port</label>
                        <input
                          className="input text-xs w-full"
                          type="number"
                          value={service.port ?? ''}
                          onChange={(e) =>
                            updateService(i, { port: e.target.value ? Number(e.target.value) : undefined })
                          }
                          placeholder="port"
                        />
                      </div>
                      {service.type === 'server' && (
                        <div className="flex-1">
                          <label className="label">Health</label>
                          <input
                            className="input text-xs w-full"
                            value={service.health ?? ''}
                            onChange={(e) => updateService(i, { health: e.target.value || undefined })}
                            placeholder="/health"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="label">Depends On</label>
                      <input
                        className="input text-xs w-full"
                        value={(service.depends_on ?? []).join(', ')}
                        onChange={(e) =>
                          updateService(i, {
                            depends_on: e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
                          })
                        }
                        placeholder="service ids (comma-separated)"
                      />
                    </div>

                    <div>
                      <label className="label">Dev Command</label>
                      <input
                        className="input text-xs w-full"
                        value={service.dev_command ?? ''}
                        onChange={(e) => updateService(i, { dev_command: e.target.value || undefined })}
                        placeholder="npm run dev"
                      />
                    </div>

                    <div>
                      <label className="label">Setup</label>
                      <input
                        className="input text-xs w-full"
                        value={service.setup ?? ''}
                        onChange={(e) => updateService(i, { setup: e.target.value || undefined })}
                        placeholder="setup command"
                      />
                    </div>

                    {service.type === 'proxy' && (
                      <div>
                        <label className="label">Config</label>
                        <input
                          className="input text-xs w-full"
                          value={service.config ?? ''}
                          onChange={(e) => updateService(i, { config: e.target.value || undefined })}
                          placeholder="config file path"
                        />
                      </div>
                    )}

                    <button
                      className="flex items-center gap-1 text-[10px] text-danger hover:text-danger"
                      onClick={() => removeService(i)}
                    >
                      <Trash2 className="w-3 h-3" /> Remove service
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {infra.services.length === 0 && (
            <div className="px-1 py-4 text-center">
              <Server className="w-6 h-6 text-text-muted mx-auto mb-1" />
              <p className="text-[10px] text-text-muted">No services defined</p>
            </div>
          )}

          <button
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
            onClick={addService}
          >
            <Plus className="w-3 h-3" /> Add service
          </button>
        </div>
      )}

      {/* Startup Order */}
      <SectionHeader id="startup" label="Startup Order" count={infra.startup_order?.length ?? 0} />
      {expandedSections.startup && (
        <div className="px-3 pb-2 space-y-1">
          {(infra.startup_order ?? []).map((id, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1 border border-border rounded">
              <GripVertical className="w-3 h-3 text-text-muted" />
              <span className="text-xs text-text-primary flex-1">{i + 1}. {id}</span>
              <button
                className="btn-icon !p-0.5"
                onClick={() => {
                  const order = (infra.startup_order ?? []).filter((_, si) => si !== i);
                  save({ ...infra, startup_order: order });
                }}
              >
                <Trash2 className="w-3 h-3 text-danger" />
              </button>
            </div>
          ))}
          <div>
            <label className="label">Edit Order (one service id per line)</label>
            <textarea
              className="input text-xs w-full min-h-[40px] resize-y"
              value={(infra.startup_order ?? []).join('\n')}
              onChange={(e) =>
                save({
                  ...infra,
                  startup_order: e.target.value.split('\n').map((v) => v.trim()).filter(Boolean),
                })
              }
              placeholder="service-id (one per line)"
            />
          </div>
        </div>
      )}

      {/* Deployment */}
      <SectionHeader id="deployment" label="Deployment" count={infra.deployment ? 1 : 0} />
      {expandedSections.deployment && (
        <div className="px-3 pb-2 space-y-3">
          {(['local', 'staging', 'production'] as const).map((env) => (
            <div key={env} className="space-y-1.5">
              <div className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">
                {env}
              </div>
              <div>
                <label className="label">Strategy</label>
                <select
                  className="input text-xs w-full"
                  value={infra.deployment?.[env]?.strategy ?? ''}
                  onChange={(e) => updateDeployment(env, { strategy: e.target.value || undefined })}
                >
                  <option value="">—</option>
                  {DEPLOYMENT_STRATEGIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {env !== 'local' && (
                <>
                  <input
                    className="input text-xs w-full"
                    value={infra.deployment?.[env]?.reverse_proxy ?? ''}
                    onChange={(e) => updateDeployment(env, { reverse_proxy: e.target.value || undefined })}
                    placeholder="reverse proxy (nginx, haproxy)"
                  />
                  <input
                    className="input text-xs w-full"
                    value={infra.deployment?.[env]?.ssl ?? ''}
                    onChange={(e) => updateDeployment(env, { ssl: e.target.value || undefined })}
                    placeholder="SSL (letsencrypt, custom)"
                  />
                </>
              )}
              {env === 'production' && (
                <input
                  className="input text-xs w-full"
                  value={infra.deployment?.production?.registry ?? ''}
                  onChange={(e) => updateDeployment('production', { registry: e.target.value || undefined })}
                  placeholder="container registry"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state when no infrastructure */}
      {!infrastructure && infra.services.length === 0 && (
        <div className="px-4 py-8 text-center">
          <Server className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="text-xs text-text-muted mb-1">No infrastructure defined</p>
          <p className="text-[10px] text-text-muted">
            Add services or use /ddd-create to generate specs
          </p>
        </div>
      )}
    </div>
  );
}
