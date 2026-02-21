import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { parse } from 'yaml';
import { useFlowStore } from './flow-store';
import { useProjectStore } from './project-store';
import { useSheetStore } from './sheet-store';
import { normalizeFlowDocument } from './flow-store';
import { useSpecsStore } from './specs-store';
import { validateFlow, validateDomain, validateSystem } from '../utils/flow-validator';
import type { ValidationResult, ValidationScope, ValidationIssue, ImplementGateState } from '../types/validation';
import type { FlowDocument } from '../types/flow';

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
  validateAllDomains: () => Promise<void>;
  validateDomainFlows: (domainId: string) => Promise<void>;
  togglePanel: () => void;
  setPanelScope: (scope: PanelScope) => void;
  getNodeIssues: (flowKey: string, nodeId: string) => ValidationIssue[];
  getCurrentFlowResult: () => ValidationResult | null;
  getDomainValidationSummary: (domainId: string) => { errorCount: number; warningCount: number } | null;
  getFlowValidationResult: (flowKey: string) => ValidationResult | null;
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

    const domainConfigs = useProjectStore.getState().domainConfigs;
    const result = validateFlow(flow, domainConfigs);
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
    const specsState = useSpecsStore.getState();
    const result = validateSystem(domainConfigs, {
      schemas: specsState.schemas,
      pagesConfig: specsState.pagesConfig,
      pageSpecs: specsState.pageSpecs,
      infrastructure: specsState.infrastructure,
    });
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

  validateAllDomains: async () => {
    const projectPath = useProjectStore.getState().projectPath;
    const domainConfigs = useProjectStore.getState().domainConfigs;
    if (!projectPath) return;

    const flowResults: Record<string, ValidationResult> = {};
    const domainResults: Record<string, ValidationResult> = {};

    for (const [domainId, config] of Object.entries(domainConfigs)) {
      // Load and validate all flows for this domain
      const flowDocs: FlowDocument[] = [];
      for (const flowEntry of config.flows) {
        try {
          const flowPath = `${projectPath}/specs/domains/${domainId}/flows/${flowEntry.id}.yaml`;
          const content: string = await invoke('read_file', { path: flowPath });
          const raw = parse(content) as Record<string, unknown>;
          const doc = normalizeFlowDocument(raw, domainId, flowEntry.id, flowEntry.type);
          flowDocs.push(doc);

          const flowKey = `${domainId}/${flowEntry.id}`;
          flowResults[flowKey] = validateFlow(doc, domainConfigs);
        } catch {
          // Skip unreadable flows
        }
      }

      // Aggregate flow results into domain summary
      let totalErrors = 0;
      let totalWarnings = 0;
      for (const fr of Object.values(flowResults)) {
        if (fr.targetId.startsWith(`${domainId}/`)) {
          totalErrors += fr.errorCount;
          totalWarnings += fr.warningCount;
        }
      }

      const domainResult = validateDomain(domainId, config, domainConfigs, flowDocs);
      totalErrors += domainResult.errorCount;
      totalWarnings += domainResult.warningCount;

      domainResults[domainId] = {
        ...domainResult,
        errorCount: totalErrors,
        warningCount: totalWarnings,
        isValid: totalErrors === 0,
      };
    }

    set((s) => ({
      flowResults: { ...s.flowResults, ...flowResults },
      domainResults: { ...s.domainResults, ...domainResults },
    }));
  },

  validateDomainFlows: async (domainId: string) => {
    const projectPath = useProjectStore.getState().projectPath;
    const domainConfigs = useProjectStore.getState().domainConfigs;
    const config = domainConfigs[domainId];
    if (!projectPath || !config) return;

    const flowResults: Record<string, ValidationResult> = {};
    const flowDocs: FlowDocument[] = [];

    for (const flowEntry of config.flows) {
      try {
        const flowPath = `${projectPath}/specs/domains/${domainId}/flows/${flowEntry.id}.yaml`;
        const content: string = await invoke('read_file', { path: flowPath });
        const raw = parse(content) as Record<string, unknown>;
        const doc = normalizeFlowDocument(raw, domainId, flowEntry.id, flowEntry.type);
        flowDocs.push(doc);

        const flowKey = `${domainId}/${flowEntry.id}`;
        flowResults[flowKey] = validateFlow(doc, domainConfigs);
      } catch {
        // Skip unreadable flows
      }
    }

    // Aggregate into domain result
    let totalErrors = 0;
    let totalWarnings = 0;
    for (const fr of Object.values(flowResults)) {
      totalErrors += fr.errorCount;
      totalWarnings += fr.warningCount;
    }

    const domainResult = validateDomain(domainId, config, domainConfigs, flowDocs);
    totalErrors += domainResult.errorCount;
    totalWarnings += domainResult.warningCount;

    set((s) => ({
      flowResults: { ...s.flowResults, ...flowResults },
      domainResults: {
        ...s.domainResults,
        [domainId]: {
          ...domainResult,
          errorCount: totalErrors,
          warningCount: totalWarnings,
          isValid: totalErrors === 0,
        },
      },
    }));
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

  getDomainValidationSummary: (domainId: string) => {
    const result = get().domainResults[domainId];
    if (!result) return null;
    return { errorCount: result.errorCount, warningCount: result.warningCount };
  },

  getFlowValidationResult: (flowKey: string) => {
    return get().flowResults[flowKey] ?? null;
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
