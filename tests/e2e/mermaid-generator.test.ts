#!/usr/bin/env npx tsx
/**
 * Test: flow-editor/export-mermaid
 *
 * Tests generateMermaidFromFlow() against a minimal FlowDocument fixture,
 * covering: flowchart TD header, node shape mapping, edge labels, and
 * multi-branch decision wiring.
 */

import { generateMermaidFromFlow } from '../../src/utils/mermaid-generator.ts';
import type { FlowDocument } from '../../src/types/flow.ts';

// ─── Test harness ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
  }
}

function expect(actual: unknown) {
  return {
    toContain(expected: string) {
      if (typeof actual !== 'string' || !actual.includes(expected)) {
        throw new Error(`Expected output to contain:\n    "${expected}"\n  Got:\n    "${actual}"`);
      }
    },
    notToContain(expected: string) {
      if (typeof actual === 'string' && actual.includes(expected)) {
        throw new Error(`Expected output NOT to contain:\n    "${expected}"`);
      }
    },
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
      }
    },
    toStartWith(expected: string) {
      if (typeof actual !== 'string' || !actual.startsWith(expected)) {
        throw new Error(`Expected output to start with "${expected}"`);
      }
    },
  };
}

// ─── Fixtures ────────────────────────────────────────────────────────────

const SIMPLE_FLOW: FlowDocument = {
  flow: { id: 'test-flow', name: 'Test Flow', type: 'traditional', domain: 'test' },
  trigger: {
    id: 'trigger-abc',
    type: 'trigger',
    position: { x: 0, y: 0 },
    label: 'Start',
    spec: { event: 'ui:test' },
    connections: [{ targetNodeId: 'process-xyz' }],
  },
  nodes: [
    {
      id: 'process-xyz',
      type: 'process',
      position: { x: 0, y: 130 },
      label: 'Do Work',
      spec: { action: 'do something' },
      connections: [{ targetNodeId: 'terminal-ok' }],
    },
    {
      id: 'terminal-ok',
      type: 'terminal',
      position: { x: 0, y: 260 },
      label: 'Done',
      spec: { outcome: 'success', status: 200, body: {} },
      connections: [],
    },
  ],
  metadata: { created: '2026-01-01T00:00:00.000Z', modified: '2026-01-01T00:00:00.000Z' },
};

const DECISION_FLOW: FlowDocument = {
  flow: { id: 'decision-flow', name: 'Decision Flow', type: 'traditional', domain: 'test' },
  trigger: {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 0, y: 0 },
    label: 'HTTP POST',
    spec: { event: 'HTTP POST /api/test' },
    connections: [{ targetNodeId: 'input-1' }],
  },
  nodes: [
    {
      id: 'input-1',
      type: 'input',
      position: { x: 0, y: 130 },
      label: 'Validate',
      spec: { fields: [{ name: 'email', type: 'string', required: true }] },
      connections: [
        { targetNodeId: 'decision-1', sourceHandle: 'valid' },
        { targetNodeId: 'terminal-err', sourceHandle: 'invalid' },
      ],
    },
    {
      id: 'decision-1',
      type: 'decision',
      position: { x: 0, y: 260 },
      label: 'User exists?',
      spec: { condition: 'user !== null' },
      connections: [
        { targetNodeId: 'data-1', sourceHandle: 'true' },
        { targetNodeId: 'terminal-err', sourceHandle: 'false' },
      ],
    },
    {
      id: 'data-1',
      type: 'data_store',
      position: { x: 0, y: 390 },
      label: 'Read User',
      spec: { operation: 'read', model: 'User' },
      connections: [{ targetNodeId: 'terminal-ok', sourceHandle: 'success' }],
    },
    {
      id: 'terminal-ok',
      type: 'terminal',
      position: { x: 0, y: 520 },
      label: 'OK',
      spec: { outcome: 'success', status: 200, body: {} },
      connections: [],
    },
    {
      id: 'terminal-err',
      type: 'terminal',
      position: { x: 250, y: 260 },
      label: 'Error',
      spec: { outcome: 'error', status: 422, body: {} },
      connections: [],
    },
  ],
  metadata: { created: '2026-01-01T00:00:00.000Z', modified: '2026-01-01T00:00:00.000Z' },
};

// ─── Tests ───────────────────────────────────────────────────────────────

console.log('\n  flow-editor/export-mermaid — generateMermaidFromFlow()\n');

// 1. Header
test('output starts with "flowchart TD"', () => {
  const out = generateMermaidFromFlow(SIMPLE_FLOW);
  expect(out).toStartWith('flowchart TD');
});

// 2. Trigger shape (rounded, ⚡ prefix)
test('trigger node uses rounded shape with ⚡ prefix', () => {
  const out = generateMermaidFromFlow(SIMPLE_FLOW);
  expect(out).toContain('trigger_abc(["⚡ Start"])');
});

// 3. Process node (plain rectangle)
test('process node uses plain rectangle shape', () => {
  const out = generateMermaidFromFlow(SIMPLE_FLOW);
  expect(out).toContain('process_xyz["Do Work"]');
});

// 4. Terminal success (✓ prefix)
test('terminal success node has ✓ prefix', () => {
  const out = generateMermaidFromFlow(SIMPLE_FLOW);
  expect(out).toContain('✓ Done');
});

// 5. Terminal error (✗ prefix)
test('terminal error node has ✗ prefix', () => {
  const out = generateMermaidFromFlow(DECISION_FLOW);
  expect(out).toContain('✗ Error');
});

// 6. Plain edge (no sourceHandle)
test('plain connection emits " --> " arrow', () => {
  const out = generateMermaidFromFlow(SIMPLE_FLOW);
  expect(out).toContain('trigger_abc --> process_xyz');
  expect(out).toContain('process_xyz --> terminal_ok');
});

// 7. Labeled edge — valid/invalid
test('"valid" sourceHandle produces "|Valid|" edge label', () => {
  const out = generateMermaidFromFlow(DECISION_FLOW);
  expect(out).toContain('-->|Valid|');
});

test('"invalid" sourceHandle produces "|Invalid|" edge label', () => {
  const out = generateMermaidFromFlow(DECISION_FLOW);
  expect(out).toContain('-->|Invalid|');
});

// 8. Labeled edge — true/false
test('"true" sourceHandle produces "|Yes|" edge label', () => {
  const out = generateMermaidFromFlow(DECISION_FLOW);
  expect(out).toContain('-->|Yes|');
});

test('"false" sourceHandle produces "|No|" edge label', () => {
  const out = generateMermaidFromFlow(DECISION_FLOW);
  expect(out).toContain('-->|No|');
});

// 9. Labeled edge — success/error
test('"success" sourceHandle produces "|OK|" edge label', () => {
  const out = generateMermaidFromFlow(DECISION_FLOW);
  expect(out).toContain('-->|OK|');
});

// 10. Decision node (diamond)
test('decision node uses diamond shape', () => {
  const out = generateMermaidFromFlow(DECISION_FLOW);
  expect(out).toContain('decision_1{"User exists?"}');
});

// 11. Input node (parallelogram)
test('input node uses parallelogram shape', () => {
  const out = generateMermaidFromFlow(DECISION_FLOW);
  expect(out).toContain('input_1[/"📋 Validate"/]');
});

// 12. Data store node (cylinder)
test('data_store node uses cylinder shape', () => {
  const out = generateMermaidFromFlow(DECISION_FLOW);
  expect(out).toContain('data_1[("Read User")]');
});

// 13. Special chars in labels — quotes escaped
test('double quotes in labels are escaped as #quot;', () => {
  const flowWithQuotes: FlowDocument = {
    ...SIMPLE_FLOW,
    nodes: [
      {
        ...SIMPLE_FLOW.nodes[0],
        label: 'Say "hello"',
      },
      SIMPLE_FLOW.nodes[1],
    ],
  };
  const out = generateMermaidFromFlow(flowWithQuotes);
  expect(out).toContain('#quot;');
  expect(out).notToContain('"Say "hello"');
});

// 14. Empty nodes array
test('flow with only trigger produces valid output', () => {
  const triggerOnly: FlowDocument = {
    ...SIMPLE_FLOW,
    trigger: { ...SIMPLE_FLOW.trigger, connections: [] },
    nodes: [],
  };
  const out = generateMermaidFromFlow(triggerOnly);
  expect(out).toStartWith('flowchart TD');
  expect(out).toContain('trigger_abc');
});

// 15. Node IDs with hyphens are sanitized
test('node IDs with hyphens are sanitized to underscores', () => {
  const out = generateMermaidFromFlow(SIMPLE_FLOW);
  // "trigger-abc" should become "trigger_abc"
  expect(out).toContain('trigger_abc');
  expect(out).notToContain('trigger-abc[');
});

// ─── Summary ─────────────────────────────────────────────────────────────

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
