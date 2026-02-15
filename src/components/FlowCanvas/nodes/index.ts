import type { NodeTypes } from '@xyflow/react';
import { TriggerNode } from './TriggerNode';
import { InputNode } from './InputNode';
import { ProcessNode } from './ProcessNode';
import { DecisionNode } from './DecisionNode';
import { TerminalNode } from './TerminalNode';
import { DataStoreNode } from './DataStoreNode';
import { ServiceCallNode } from './ServiceCallNode';
import { EventNode } from './EventNode';
import { LoopNode } from './LoopNode';
import { ParallelNode } from './ParallelNode';
import { SubFlowNode } from './SubFlowNode';
import { LlmCallNode } from './LlmCallNode';
import { AgentLoopNode } from './AgentLoopNode';
import { GuardrailNode } from './GuardrailNode';
import { HumanGateNode } from './HumanGateNode';
import { OrchestratorNode } from './OrchestratorNode';
import { SmartRouterNode } from './SmartRouterNode';
import { HandoffNode } from './HandoffNode';
import { AgentGroupNode } from './AgentGroupNode';
import { DelayNode } from './DelayNode';
import { CacheNode } from './CacheNode';
import { TransformNode } from './TransformNode';
import { CollectionNode } from './CollectionNode';
import { ParseNode } from './ParseNode';
import { CryptoNode } from './CryptoNode';
import { BatchNode } from './BatchNode';
import { TransactionNode } from './TransactionNode';

export const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  input: InputNode,
  process: ProcessNode,
  decision: DecisionNode,
  terminal: TerminalNode,
  data_store: DataStoreNode,
  service_call: ServiceCallNode,
  event: EventNode,
  loop: LoopNode,
  parallel: ParallelNode,
  sub_flow: SubFlowNode,
  llm_call: LlmCallNode,
  agent_loop: AgentLoopNode,
  guardrail: GuardrailNode,
  human_gate: HumanGateNode,
  orchestrator: OrchestratorNode,
  smart_router: SmartRouterNode,
  handoff: HandoffNode,
  agent_group: AgentGroupNode,
  delay: DelayNode,
  cache: CacheNode,
  transform: TransformNode,
  collection: CollectionNode,
  parse: ParseNode,
  crypto: CryptoNode,
  batch: BatchNode,
  transaction: TransactionNode,
};
