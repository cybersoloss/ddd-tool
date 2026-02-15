import type { ComponentType } from 'react';
import type { DddNodeType, NodeSpec } from '../../../types/flow';
import { TriggerSpecEditor } from './TriggerSpecEditor';
import { InputSpecEditor } from './InputSpecEditor';
import { ProcessSpecEditor } from './ProcessSpecEditor';
import { DecisionSpecEditor } from './DecisionSpecEditor';
import { TerminalSpecEditor } from './TerminalSpecEditor';
import { DataStoreSpecEditor } from './DataStoreSpecEditor';
import { ServiceCallSpecEditor } from './ServiceCallSpecEditor';
import { EventSpecEditor } from './EventSpecEditor';
import { LoopSpecEditor } from './LoopSpecEditor';
import { ParallelSpecEditor } from './ParallelSpecEditor';
import { SubFlowSpecEditor } from './SubFlowSpecEditor';
import { LlmCallSpecEditor } from './LlmCallSpecEditor';
import { AgentLoopSpecEditor } from './AgentLoopSpecEditor';
import { GuardrailSpecEditor } from './GuardrailSpecEditor';
import { HumanGateSpecEditor } from './HumanGateSpecEditor';
import { OrchestratorSpecEditor } from './OrchestratorSpecEditor';
import { SmartRouterSpecEditor } from './SmartRouterSpecEditor';
import { HandoffSpecEditor } from './HandoffSpecEditor';
import { AgentGroupSpecEditor } from './AgentGroupSpecEditor';
import { DelaySpecEditor } from './DelaySpecEditor';
import { CacheSpecEditor } from './CacheSpecEditor';
import { TransformSpecEditor } from './TransformSpecEditor';
import { CollectionSpecEditor } from './CollectionSpecEditor';
import { ParseSpecEditor } from './ParseSpecEditor';
import { CryptoSpecEditor } from './CryptoSpecEditor';
import { BatchSpecEditor } from './BatchSpecEditor';
import { TransactionSpecEditor } from './TransactionSpecEditor';

// Each editor receives spec + onChange typed to its own spec shape.
// We use a generic props interface so the registry can hold them uniformly.
interface EditorProps {
  spec: NodeSpec;
  onChange: (spec: NodeSpec) => void;
}

export const specEditors: Record<DddNodeType, ComponentType<EditorProps>> = {
  trigger: TriggerSpecEditor as ComponentType<EditorProps>,
  input: InputSpecEditor as ComponentType<EditorProps>,
  process: ProcessSpecEditor as ComponentType<EditorProps>,
  decision: DecisionSpecEditor as ComponentType<EditorProps>,
  terminal: TerminalSpecEditor as ComponentType<EditorProps>,
  data_store: DataStoreSpecEditor as ComponentType<EditorProps>,
  service_call: ServiceCallSpecEditor as ComponentType<EditorProps>,
  event: EventSpecEditor as ComponentType<EditorProps>,
  loop: LoopSpecEditor as ComponentType<EditorProps>,
  parallel: ParallelSpecEditor as ComponentType<EditorProps>,
  sub_flow: SubFlowSpecEditor as ComponentType<EditorProps>,
  llm_call: LlmCallSpecEditor as ComponentType<EditorProps>,
  agent_loop: AgentLoopSpecEditor as ComponentType<EditorProps>,
  guardrail: GuardrailSpecEditor as ComponentType<EditorProps>,
  human_gate: HumanGateSpecEditor as ComponentType<EditorProps>,
  orchestrator: OrchestratorSpecEditor as ComponentType<EditorProps>,
  smart_router: SmartRouterSpecEditor as ComponentType<EditorProps>,
  handoff: HandoffSpecEditor as ComponentType<EditorProps>,
  agent_group: AgentGroupSpecEditor as ComponentType<EditorProps>,
  delay: DelaySpecEditor as ComponentType<EditorProps>,
  cache: CacheSpecEditor as ComponentType<EditorProps>,
  transform: TransformSpecEditor as ComponentType<EditorProps>,
  collection: CollectionSpecEditor as ComponentType<EditorProps>,
  parse: ParseSpecEditor as ComponentType<EditorProps>,
  crypto: CryptoSpecEditor as ComponentType<EditorProps>,
  batch: BatchSpecEditor as ComponentType<EditorProps>,
  transaction: TransactionSpecEditor as ComponentType<EditorProps>,
};
