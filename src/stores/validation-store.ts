import { create } from 'zustand';
import { useFlowStore } from './flow-store';
import { useProjectStore } from './project-store';
import { useSheetStore } from './sheet-store';
import { validateFlow, validateDomain, validateSystem } from '../utils/flow-validator';
import type { ValidationResult, ValidationScope, ValidationIssue, ImplementGateState } from '../types/validation';

export type PanelScope = ValidationScope | 'all';

interface ValidationState {
  flowResults: Record<string, ValidationResult>;
  domainResults: Record<string, ValidationResult>;
  systemResult: ValidationResult | null;
  panelOpen: boolean;
  panelScope: PanelScope;

  validateCurrentFlow: () => void;
  validateDomain: (domainId: string) => void;
  validateSystem: () => void;
  validateAll: () => void;
  togglePanel: () => void;
  setPanelScope: (scope: PanelScope) => void;
  getNodeIssues: (flowKey: string, nodeId: string) => ValidationIssue[];
  getCurrentFlowResult: () => ValidationResult | null;
  checkImplementGate: (flowId: string, domainId: string) => ImplementGateState;
  reset: () => void;
}

export const useValidationStore = create<ValidationState>((set, get) => ({
  flowResults: {},
  domainResults: {},
  systemResult: null,
  panelOpen: false,
  panelScope: 'flow',

  validateCurrentFlow: () => {
    const flow = useFlowStore.getState().currentFlow;
    if (!flow || !flow.flow) return;

    const result = validateFlow(flow);
    const key = `${flow.flow.domain}/${flow.flow.id}`;

    set((s) => ({
      flowResults: { ...s.flowResults, [key]: result },
    }));
  },

  validateDomain: (domainId: string) => {
    const domainConfigs = useProjectStore.getState().domainConfigs;
    const config = domainConfigs[domainId];
    if (!config) return;

    const result = validateDomain(domainId, config, domainConfigs);

    set((s) => ({
      domainResults: { ...s.domainResults, [domainId]: result },
    }));
  },

  validateSystem: () => {
    const domainConfigs = useProjectStore.getState().domainConfigs;
    const result = validateSystem(domainConfigs);
    set({ systemResult: result });
  },

  validateAll: () => {
    const { validateCurrentFlow, validateDomain: valDomain, validateSystem: valSystem } = get();
    const sheet = useSheetStore.getState().current;

    validateCurrentFlow();

    if (sheet.domainId) {
      valDomain(sheet.domainId);
    }

    valSystem();
  },

  togglePanel: () => {
    set((s) => ({ panelOpen: !s.panelOpen }));
  },

  setPanelScope: (scope: PanelScope) => {
    set({ panelScope: scope });
  },

  getNodeIssues: (flowKey: string, nodeId: string) => {
    const result = get().flowResults[flowKey];
    if (!result) return [];
    return result.issues.filter((i) => i.nodeId === nodeId);
  },

  getCurrentFlowResult: () => {
    const flow = useFlowStore.getState().currentFlow;
    if (!flow || !flow.flow) return null;
    const key = `${flow.flow.domain}/${flow.flow.id}`;
    return get().flowResults[key] ?? null;
  },

  checkImplementGate: (flowId: string, domainId: string) => {
    const flowKey = `${domainId}/${flowId}`;
    const { flowResults, domainResults, systemResult } = get();

    const flowValidation = flowResults[flowKey] ?? null;
    const domainValidation = domainResults[domainId] ?? null;

    const hasErrors =
      (flowValidation?.errorCount ?? 0) > 0 ||
      (domainValidation?.errorCount ?? 0) > 0 ||
      (systemResult?.errorCount ?? 0) > 0;

    const hasWarnings =
      (flowValidation?.warningCount ?? 0) > 0 ||
      (domainValidation?.warningCount ?? 0) > 0 ||
      (systemResult?.warningCount ?? 0) > 0;

    return {
      flowValidation,
      domainValidation,
      systemValidation: systemResult,
      canImplement: !hasErrors,
      hasWarnings,
    };
  },

  reset: () => {
    set({
      flowResults: {},
      domainResults: {},
      systemResult: null,
      panelOpen: false,
      panelScope: 'flow',
    });
  },
}));
