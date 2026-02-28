import { useState, useCallback, useEffect } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useFlowStore } from '../../stores/flow-store';

interface ContractInput {
  name: string;
  type: string;
  required?: boolean;
  ref?: string;
}

interface ContractOutput {
  name: string;
  type: string;
}

interface FlowAuth {
  required: boolean;
  roles: string[];
  strategy: 'jwt' | 'api_key' | 'none';
}

interface FlowMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  labels: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FlowSettingsDialog({ open, onClose }: Props) {
  const currentFlow = useFlowStore((s) => s.currentFlow);
  const restoreFlow = useFlowStore((s) => s.restoreFlow);

  const flow = currentFlow?.flow;

  const [isTemplate, setIsTemplate] = useState(flow?.template ?? false);
  const [parameters, setParameters] = useState<Record<string, { type: string; values?: string[] }>>(
    flow?.parameters ?? {}
  );
  const [contractInputs, setContractInputs] = useState<ContractInput[]>(
    flow?.contract?.inputs ?? []
  );
  const [contractOutputs, setContractOutputs] = useState<ContractOutput[]>(
    flow?.contract?.outputs ?? []
  );
  const [newParamName, setNewParamName] = useState('');
  const [auth, setAuth] = useState<FlowAuth>({
    required: flow?.auth?.required ?? false,
    roles: flow?.auth?.roles ?? [],
    strategy: flow?.auth?.strategy ?? 'jwt',
  });
  const [rolesInput, setRolesInput] = useState((flow?.auth?.roles ?? []).join(', '));
  const [metrics, setMetrics] = useState<FlowMetric[]>(
    (flow?.metrics ?? []).map((m) => ({ ...m, labels: m.labels ?? [] }))
  );
  const [authOpen, setAuthOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);

  // Reset when flow changes
  useEffect(() => {
    if (flow) {
      setIsTemplate(flow.template ?? false);
      setParameters(flow.parameters ?? {});
      setContractInputs(flow.contract?.inputs ?? []);
      setContractOutputs(flow.contract?.outputs ?? []);
      const a = flow.auth;
      setAuth({ required: a?.required ?? false, roles: a?.roles ?? [], strategy: a?.strategy ?? 'jwt' });
      setRolesInput((a?.roles ?? []).join(', '));
      setMetrics((flow.metrics ?? []).map((m) => ({ ...m, labels: m.labels ?? [] })));
    }
  }, [flow?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(() => {
    if (!currentFlow) return;

    const contract = (contractInputs.length > 0 || contractOutputs.length > 0)
      ? {
          inputs: contractInputs.length > 0 ? contractInputs : undefined,
          outputs: contractOutputs.length > 0 ? contractOutputs : undefined,
        }
      : undefined;

    const parsedRoles = rolesInput.split(',').map((r) => r.trim()).filter(Boolean);
    const authValue = auth.required || parsedRoles.length > 0
      ? { required: auth.required, roles: parsedRoles.length > 0 ? parsedRoles : undefined, strategy: auth.strategy }
      : undefined;

    const metricsValue = metrics.length > 0
      ? metrics.map((m) => ({ name: m.name, type: m.type, labels: m.labels.length > 0 ? m.labels : undefined }))
      : undefined;

    restoreFlow({
      ...currentFlow,
      flow: {
        ...currentFlow.flow,
        template: isTemplate || undefined,
        parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
        contract,
        auth: authValue,
        metrics: metricsValue,
      },
    });
    onClose();
  }, [currentFlow, isTemplate, parameters, contractInputs, contractOutputs, auth, rolesInput, metrics, restoreFlow, onClose]);

  if (!open || !flow) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-secondary border border-border rounded-lg w-[480px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium text-text-primary">Flow Settings</h2>
          <button className="btn-icon !p-1" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Template */}
          <div className="flex items-center gap-2">
            <label className="label flex-1 !mb-0">Template Flow</label>
            <button
              className={`relative w-9 h-5 rounded-full transition-colors ${
                isTemplate ? 'bg-accent' : 'bg-surface-2'
              }`}
              onClick={() => setIsTemplate(!isTemplate)}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  isTemplate ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-text-muted -mt-2">Mark this flow as a reusable template with parameters</p>

          {/* Parameters (shown when template) */}
          {isTemplate && (
            <div>
              <label className="label">Parameters</label>
              {Object.entries(parameters).map(([name, param]) => (
                <div key={name} className="flex items-start gap-1 mb-1.5">
                  <div className="flex-1 space-y-1">
                    <div className="flex gap-1">
                      <span className="input py-1 text-xs bg-surface-2 flex-1">{name}</span>
                      <select
                        className="input py-1 text-xs w-24"
                        value={param.type}
                        onChange={(e) =>
                          setParameters({ ...parameters, [name]: { ...param, type: e.target.value } })
                        }
                      >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="enum">enum</option>
                      </select>
                    </div>
                    {param.type === 'enum' && (
                      <input
                        className="input py-1 text-xs"
                        value={(param.values ?? []).join(', ')}
                        onChange={(e) =>
                          setParameters({
                            ...parameters,
                            [name]: {
                              ...param,
                              values: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                            },
                          })
                        }
                        placeholder="Comma-separated values"
                      />
                    )}
                  </div>
                  <button
                    className="btn-icon !p-0.5 mt-1"
                    onClick={() => {
                      const { [name]: _, ...rest } = parameters;
                      setParameters(rest);
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-text-muted hover:text-red-400" />
                  </button>
                </div>
              ))}
              <div className="flex gap-1 mt-1">
                <input
                  className="input py-1 text-xs flex-1"
                  value={newParamName}
                  onChange={(e) => setNewParamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newParamName.trim()) {
                      setParameters({ ...parameters, [newParamName.trim()]: { type: 'string' } });
                      setNewParamName('');
                    }
                  }}
                  placeholder="Parameter name"
                />
                <button
                  className="btn-icon !p-1 text-accent"
                  disabled={!newParamName.trim()}
                  onClick={() => {
                    if (newParamName.trim()) {
                      setParameters({ ...parameters, [newParamName.trim()]: { type: 'string' } });
                      setNewParamName('');
                    }
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Contract - Inputs */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label !mb-0">Contract Inputs</label>
              <button
                className="btn-icon !p-0.5"
                onClick={() => setContractInputs([...contractInputs, { name: '', type: 'string' }])}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {contractInputs.length === 0 && (
              <p className="text-xs text-text-muted">No contract inputs</p>
            )}
            {contractInputs.map((inp, i) => (
              <div key={i} className="flex items-center gap-1 mb-1">
                <input
                  className="input py-1 text-xs flex-1"
                  value={inp.name}
                  onChange={(e) => {
                    const updated = [...contractInputs];
                    updated[i] = { ...updated[i], name: e.target.value };
                    setContractInputs(updated);
                  }}
                  placeholder="Name"
                />
                <input
                  className="input py-1 text-xs w-20"
                  value={inp.type}
                  onChange={(e) => {
                    const updated = [...contractInputs];
                    updated[i] = { ...updated[i], type: e.target.value };
                    setContractInputs(updated);
                  }}
                  placeholder="Type"
                />
                <label className="flex items-center gap-0.5 text-[10px] text-text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={inp.required ?? false}
                    onChange={(e) => {
                      const updated = [...contractInputs];
                      updated[i] = { ...updated[i], required: e.target.checked };
                      setContractInputs(updated);
                    }}
                  />
                  Req
                </label>
                <button
                  className="btn-icon !p-0.5"
                  onClick={() => setContractInputs(contractInputs.filter((_, j) => j !== i))}
                >
                  <Trash2 className="w-3 h-3 text-text-muted hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>

          {/* Contract - Outputs */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label !mb-0">Contract Outputs</label>
              <button
                className="btn-icon !p-0.5"
                onClick={() => setContractOutputs([...contractOutputs, { name: '', type: 'string' }])}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {contractOutputs.length === 0 && (
              <p className="text-xs text-text-muted">No contract outputs</p>
            )}
            {contractOutputs.map((out, i) => (
              <div key={i} className="flex items-center gap-1 mb-1">
                <input
                  className="input py-1 text-xs flex-1"
                  value={out.name}
                  onChange={(e) => {
                    const updated = [...contractOutputs];
                    updated[i] = { ...updated[i], name: e.target.value };
                    setContractOutputs(updated);
                  }}
                  placeholder="Name"
                />
                <input
                  className="input py-1 text-xs w-20"
                  value={out.type}
                  onChange={(e) => {
                    const updated = [...contractOutputs];
                    updated[i] = { ...updated[i], type: e.target.value };
                    setContractOutputs(updated);
                  }}
                  placeholder="Type"
                />
                <button
                  className="btn-icon !p-0.5"
                  onClick={() => setContractOutputs(contractOutputs.filter((_, j) => j !== i))}
                >
                  <Trash2 className="w-3 h-3 text-text-muted hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
          {/* Auth */}
          <div>
            <button
              type="button"
              className="flex items-center gap-1 w-full text-left"
              onClick={() => setAuthOpen((v) => !v)}
            >
              {authOpen ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
              <span className="label !mb-0 cursor-pointer">Auth</span>
            </button>
            {authOpen && (
              <div className="mt-2 space-y-2 pl-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-secondary flex-1">Required</label>
                  <button
                    type="button"
                    className={`relative w-9 h-5 rounded-full transition-colors ${auth.required ? 'bg-accent' : 'bg-surface-2'}`}
                    onClick={() => setAuth({ ...auth, required: !auth.required })}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${auth.required ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-secondary w-16">Strategy</label>
                  <select
                    className="input py-1 text-xs flex-1"
                    value={auth.strategy}
                    onChange={(e) => setAuth({ ...auth, strategy: e.target.value as FlowAuth['strategy'] })}
                  >
                    <option value="jwt">jwt</option>
                    <option value="api_key">api_key</option>
                    <option value="none">none</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-secondary w-16">Roles</label>
                  <input
                    className="input py-1 text-xs flex-1"
                    value={rolesInput}
                    onChange={(e) => setRolesInput(e.target.value)}
                    placeholder="admin, user (comma-separated)"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Metrics */}
          <div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex items-center gap-1 flex-1 text-left"
                onClick={() => setMetricsOpen((v) => !v)}
              >
                {metricsOpen ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
                <span className="label !mb-0 cursor-pointer">Metrics</span>
              </button>
              <button
                type="button"
                className="btn-icon !p-0.5"
                title="Add metric"
                onClick={() => { setMetricsOpen(true); setMetrics([...metrics, { name: '', type: 'counter', labels: [] }]); }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {metricsOpen && (
              <div className="mt-2 space-y-2 pl-4">
                {metrics.length === 0 && <p className="text-xs text-text-muted">No metrics defined</p>}
                {metrics.map((m, i) => (
                  <div key={i} className="bg-bg-primary rounded p-2 space-y-1.5">
                    <div className="flex items-center gap-1">
                      <input
                        className="input py-1 text-xs flex-1"
                        value={m.name}
                        onChange={(e) => { const u = [...metrics]; u[i] = { ...u[i], name: e.target.value }; setMetrics(u); }}
                        placeholder="metric_name"
                      />
                      <select
                        className="input py-1 text-xs w-28"
                        value={m.type}
                        onChange={(e) => { const u = [...metrics]; u[i] = { ...u[i], type: e.target.value as FlowMetric['type'] }; setMetrics(u); }}
                      >
                        <option value="counter">counter</option>
                        <option value="gauge">gauge</option>
                        <option value="histogram">histogram</option>
                      </select>
                      <button type="button" className="btn-icon !p-0.5" onClick={() => setMetrics(metrics.filter((_, j) => j !== i))}>
                        <Trash2 className="w-3 h-3 text-text-muted hover:text-red-400" />
                      </button>
                    </div>
                    <input
                      className="input py-1 text-xs w-full"
                      value={m.labels.join(', ')}
                      onChange={(e) => { const u = [...metrics]; u[i] = { ...u[i], labels: e.target.value.split(',').map((l) => l.trim()).filter(Boolean) }; setMetrics(u); }}
                      placeholder="Labels (comma-separated)"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent/80"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
