/**
 * Static expense-scanner project data for demo mode.
 * Pre-generates all YAML/JSON files that the project needs,
 * ready to be loaded into the VFS.
 *
 * Project: AI Expense Scanner
 * 3 domains: Expenses, Approvals, Reports
 * 5 flows: scan-receipt, submit-expense, review-expense, process-reimbursement, monthly-summary
 * 15+ node types demonstrated
 */
import { stringify } from 'yaml';

export const DEMO_HOME = '/demo';
export const DEMO_PROJECT_PATH = '/demo/expense-scanner';

const now = new Date().toISOString();

function buildSeedFiles(): Record<string, string> {
  const files: Record<string, string> = {};

  // --- Settings & recent projects ---
  files[`${DEMO_HOME}/.ddd-tool/settings.json`] = JSON.stringify({
    claudeCode: { enabled: true, command: 'claude' },
    editor: {
      gridSnap: true,
      autoSave: false,
      autoSaveInterval: 30,
      theme: 'dark',
      fontSize: 14,
      saveNotification: true,
    },
    git: {
      autoCommitMessage: 'DDD: {action} in {flow_id}',
      branchNaming: 'ddd/{flow_id}',
    },
  }, null, 2);

  files[`${DEMO_HOME}/.ddd-tool/recent-projects.json`] = JSON.stringify([
    {
      name: 'expense-scanner',
      path: DEMO_PROJECT_PATH,
      lastOpenedAt: now,
      description: 'AI-powered expense management with receipt scanning',
    },
  ], null, 2);

  // --- Project config ---
  files[`${DEMO_PROJECT_PATH}/ddd-project.json`] = JSON.stringify({
    name: 'expense-scanner',
    description: 'AI-powered expense management with receipt scanning',
    techStack: {
      language: 'TypeScript',
      languageVersion: '5.x',
      framework: 'Express',
      database: 'PostgreSQL',
      orm: 'Prisma',
    },
    domains: [
      { name: 'Expenses', description: 'Receipt scanning and expense submission' },
      { name: 'Approvals', description: 'Review workflows and reimbursement' },
      { name: 'Reports', description: 'Monthly summaries and analytics' },
    ],
    createdAt: now,
  }, null, 2);

  // --- System layout ---
  files[`${DEMO_PROJECT_PATH}/specs/system-layout.yaml`] = stringify({
    domains: {
      expenses: { x: 100, y: 100 },
      approvals: { x: 500, y: 100 },
      reports: { x: 300, y: 400 },
    },
  });

  // --- System events ---
  files[`${DEMO_PROJECT_PATH}/specs/system.yaml`] = stringify({
    events: [
      { name: 'ReceiptScanned', source: 'expenses', consumers: ['approvals'] },
      { name: 'ExpenseSubmitted', source: 'expenses', consumers: ['approvals'] },
      { name: 'ExpenseApproved', source: 'approvals', consumers: ['reports'] },
      { name: 'ReimbursementProcessed', source: 'approvals', consumers: ['reports'] },
    ],
  });

  // --- Expenses domain ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/expenses/domain.yaml`] = stringify({
    name: 'Expenses',
    description: 'Receipt scanning and expense submission',
    flows: [
      { id: 'scan-receipt', name: 'Scan Receipt', type: 'agent', description: 'AI-powered receipt OCR with human review' },
      { id: 'submit-expense', name: 'Submit Expense', type: 'traditional', description: 'Validate and persist expense entries' },
    ],
    publishes_events: [
      { event: 'ReceiptScanned', from_flow: 'scan-receipt', description: 'Emitted when receipt data is extracted and confirmed' },
      { event: 'ExpenseSubmitted', from_flow: 'submit-expense', description: 'Emitted when expense is submitted for approval' },
    ],
    consumes_events: [],
    layout: {
      flows: {
        'scan-receipt': { x: 50, y: 50 },
        'submit-expense': { x: 350, y: 50 },
      },
      portals: {},
    },
  });

  // --- Approvals domain ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/approvals/domain.yaml`] = stringify({
    name: 'Approvals',
    description: 'Review workflows and reimbursement',
    flows: [
      { id: 'review-expense', name: 'Review Expense', type: 'traditional', description: 'Smart routing and approval by amount' },
      { id: 'process-reimbursement', name: 'Process Reimbursement', type: 'traditional', description: 'Payment processing for approved expenses' },
    ],
    publishes_events: [
      { event: 'ExpenseApproved', from_flow: 'review-expense', description: 'Emitted when expense passes approval' },
      { event: 'ReimbursementProcessed', from_flow: 'process-reimbursement', description: 'Emitted when payment is sent' },
    ],
    consumes_events: [
      { event: 'ReceiptScanned', handled_by_flow: 'review-expense' },
      { event: 'ExpenseSubmitted', handled_by_flow: 'review-expense' },
      { event: 'ExpenseApproved', handled_by_flow: 'process-reimbursement' },
    ],
    layout: {
      flows: {
        'review-expense': { x: 50, y: 50 },
        'process-reimbursement': { x: 350, y: 50 },
      },
      portals: {},
    },
  });

  // --- Reports domain ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/reports/domain.yaml`] = stringify({
    name: 'Reports',
    description: 'Monthly summaries and analytics',
    flows: [
      { id: 'monthly-summary', name: 'Monthly Summary', type: 'traditional', description: 'Aggregate expenses into monthly reports' },
    ],
    publishes_events: [],
    consumes_events: [
      { event: 'ExpenseApproved', handled_by_flow: 'monthly-summary' },
      { event: 'ReimbursementProcessed', handled_by_flow: 'monthly-summary' },
    ],
    layout: {
      flows: {
        'monthly-summary': { x: 50, y: 50 },
      },
      portals: {},
    },
  });

  // --- Flow: scan-receipt (agent flow) ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/expenses/flows/scan-receipt.yaml`] = stringify({
    flow: { id: 'scan-receipt', name: 'Scan Receipt', type: 'agent', domain: 'expenses' },
    trigger: {
      id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 },
      connections: [{ targetNodeId: 'guardrail-1' }],
      spec: { event: 'Receipt Uploaded', source: 'Mobile App', description: 'User uploads a receipt photo' },
      label: 'Receipt Upload',
    },
    nodes: [
      {
        id: 'guardrail-1', type: 'guardrail', position: { x: 250, y: 170 },
        connections: [{ targetNodeId: 'agent-loop-1' }],
        spec: {
          position: 'input',
          checks: [
            { type: 'file_type', action: 'block', rule: 'Only JPEG, PNG, PDF allowed' },
            { type: 'file_size', action: 'block', rule: 'Max 10MB' },
          ],
          on_block: 'Return 400 with validation error',
        },
        label: 'File Validator',
      },
      {
        id: 'agent-loop-1', type: 'agent_loop', position: { x: 250, y: 320 },
        connections: [{ targetNodeId: 'human-gate-1' }],
        spec: {
          model: 'claude-sonnet',
          system_prompt: 'You are a receipt scanning agent. Extract merchant, date, total, line items, and tax from the receipt image. Use tools to verify and categorize.',
          max_iterations: 5,
          temperature: 0.3,
          stop_conditions: ['extraction_complete'],
          tools: [
            { id: 'ocr', name: 'extract_text', description: 'Run OCR on receipt image', parameters: '{"image_url": "string"}' },
            { id: 'categorize', name: 'categorize_expense', description: 'Categorize expense type', parameters: '{"description": "string", "amount": "number"}' },
            { id: 'lookup', name: 'lookup_merchant', description: 'Look up merchant in vendor database', parameters: '{"merchant_name": "string"}' },
            { id: 'finalize', name: 'finalize_receipt', description: 'Confirm extracted data', parameters: '{"receipt_data": "object"}', is_terminal: true },
          ],
          memory: [{ name: 'extraction', type: 'conversation_history', max_tokens: 4000, strategy: 'sliding_window' }],
          on_max_iterations: 'escalate',
        },
        label: 'Receipt Scanner',
      },
      {
        id: 'human-gate-1', type: 'human_gate', position: { x: 250, y: 480 },
        connections: [{ targetNodeId: 'event-1' }],
        spec: {
          notification_channels: ['email', 'push'],
          approval_options: [
            { id: 'approve', label: 'Confirm' },
            { id: 'edit', label: 'Edit & Confirm' },
            { id: 'reject', label: 'Discard' },
          ],
          timeout: { duration: 86400, action: 'remind' },
          context_for_human: ['extracted_receipt', 'confidence_score', 'original_image'],
        },
        label: 'Human Review',
      },
      {
        id: 'event-1', type: 'event', position: { x: 250, y: 620 },
        connections: [{ targetNodeId: 'terminal-1' }],
        spec: {
          event_name: 'ReceiptScanned',
          payload: { receipt_id: '{{receipt.id}}', amount: '{{receipt.total}}', category: '{{receipt.category}}' },
          description: 'Notify approvals of scanned receipt',
        },
        label: 'Emit ReceiptScanned',
      },
      {
        id: 'terminal-1', type: 'terminal', position: { x: 250, y: 750 },
        connections: [],
        spec: { outcome: 'success', description: 'Receipt processed and queued for approval' },
        label: 'Done',
      },
    ],
    metadata: { created: now, modified: now },
  });

  // --- Flow: submit-expense ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/expenses/flows/submit-expense.yaml`] = stringify({
    flow: { id: 'submit-expense', name: 'Submit Expense', type: 'traditional', domain: 'expenses' },
    trigger: {
      id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 },
      connections: [{ targetNodeId: 'input-1' }],
      spec: { event: 'POST /api/expenses', source: 'API Gateway', description: 'User submits an expense manually' },
      label: 'Expense Form',
    },
    nodes: [
      {
        id: 'input-1', type: 'input', position: { x: 250, y: 180 },
        connections: [{ targetNodeId: 'process-1' }],
        spec: {
          fields: [
            { name: 'amount', type: 'number', required: true },
            { name: 'currency', type: 'string', required: true },
            { name: 'category', type: 'string', required: true },
            { name: 'description', type: 'string', required: true },
            { name: 'receipt_id', type: 'string', required: false },
          ],
          validation: 'Amount > 0, valid currency code, category from enum',
          description: 'Expense entry form data',
        },
        label: 'Expense Details',
      },
      {
        id: 'process-1', type: 'process', position: { x: 250, y: 320 },
        connections: [{ targetNodeId: 'data-store-1' }],
        spec: {
          action: 'Validate expense against company policy',
          service: 'PolicyService',
          description: 'Check daily limits, duplicate detection, category rules',
        },
        label: 'Policy Check',
      },
      {
        id: 'data-store-1', type: 'data_store', position: { x: 250, y: 460 },
        connections: [{ targetNodeId: 'event-1' }],
        spec: {
          operation: 'create',
          model: 'Expense',
          data: {
            amount: '{{input.amount}}',
            currency: '{{input.currency}}',
            category: '{{input.category}}',
            status: 'pending_approval',
          },
          description: 'Save expense record to database',
        },
        label: 'Save Expense',
      },
      {
        id: 'event-1', type: 'event', position: { x: 250, y: 600 },
        connections: [{ targetNodeId: 'terminal-1' }],
        spec: {
          event_name: 'ExpenseSubmitted',
          payload: { expense_id: '{{expense.id}}', amount: '{{expense.amount}}' },
          description: 'Notify approvals of new expense',
        },
        label: 'Emit ExpenseSubmitted',
      },
      {
        id: 'terminal-1', type: 'terminal', position: { x: 250, y: 730 },
        connections: [],
        spec: { outcome: 'success', description: 'Return 201 with expense data' },
        label: 'Submitted',
      },
    ],
    metadata: { created: now, modified: now },
  });

  // --- Flow: review-expense ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/approvals/flows/review-expense.yaml`] = stringify({
    flow: { id: 'review-expense', name: 'Review Expense', type: 'traditional', domain: 'approvals' },
    trigger: {
      id: 'trigger-1', type: 'trigger', position: { x: 300, y: 50 },
      connections: [{ targetNodeId: 'smart-router-1' }],
      spec: { event: 'ExpenseSubmitted', source: 'Event Bus', description: 'New expense needs review' },
      label: 'Expense Received',
    },
    nodes: [
      {
        id: 'smart-router-1', type: 'smart_router', position: { x: 300, y: 180 },
        connections: [
          { targetNodeId: 'decision-auto', sourceHandle: 'route-auto' },
          { targetNodeId: 'decision-manager', sourceHandle: 'route-manager' },
          { targetNodeId: 'decision-vp', sourceHandle: 'route-vp' },
        ],
        spec: {
          strategy: 'rule_based',
          routes: [
            { id: 'route-auto', label: 'Auto-approve', condition: 'amount < 50', description: 'Small expenses auto-approved' },
            { id: 'route-manager', label: 'Manager', condition: 'amount >= 50 && amount < 500', description: 'Manager approval required' },
            { id: 'route-vp', label: 'VP Review', condition: 'amount >= 500', description: 'VP approval for large expenses' },
          ],
        },
        label: 'Route by Amount',
      },
      {
        id: 'decision-auto', type: 'decision', position: { x: 80, y: 340 },
        connections: [
          { targetNodeId: 'transaction-1', sourceHandle: 'true' },
        ],
        spec: { condition: 'within daily limit?', trueLabel: 'Yes', falseLabel: 'No', description: 'Check cumulative daily spend' },
        label: 'Daily Limit OK?',
      },
      {
        id: 'decision-manager', type: 'decision', position: { x: 300, y: 340 },
        connections: [
          { targetNodeId: 'transaction-1', sourceHandle: 'true' },
          { targetNodeId: 'terminal-reject', sourceHandle: 'false' },
        ],
        spec: { condition: 'manager approved?', trueLabel: 'Approved', falseLabel: 'Rejected', description: 'Wait for manager decision' },
        label: 'Manager Approved?',
      },
      {
        id: 'decision-vp', type: 'decision', position: { x: 530, y: 340 },
        connections: [
          { targetNodeId: 'transaction-1', sourceHandle: 'true' },
          { targetNodeId: 'terminal-reject', sourceHandle: 'false' },
        ],
        spec: { condition: 'VP approved?', trueLabel: 'Approved', falseLabel: 'Rejected', description: 'Wait for VP decision' },
        label: 'VP Approved?',
      },
      {
        id: 'transaction-1', type: 'transaction', position: { x: 300, y: 500 },
        connections: [{ targetNodeId: 'event-1' }],
        spec: {
          steps: [
            { action: 'Update expense status to approved', model: 'Expense' },
            { action: 'Deduct from department budget', model: 'Budget' },
            { action: 'Create approval audit record', model: 'AuditLog' },
          ],
          on_failure: 'rollback',
          description: 'Atomically approve expense and update budget',
        },
        label: 'Approve & Budget',
      },
      {
        id: 'event-1', type: 'event', position: { x: 300, y: 640 },
        connections: [{ targetNodeId: 'terminal-approve' }],
        spec: {
          event_name: 'ExpenseApproved',
          payload: { expense_id: '{{expense.id}}', approved_by: '{{approver.id}}' },
          description: 'Notify reports and reimbursement',
        },
        label: 'Emit ExpenseApproved',
      },
      {
        id: 'terminal-approve', type: 'terminal', position: { x: 300, y: 770 },
        connections: [],
        spec: { outcome: 'success', description: 'Expense approved and queued for reimbursement' },
        label: 'Approved',
      },
      {
        id: 'terminal-reject', type: 'terminal', position: { x: 530, y: 500 },
        connections: [],
        spec: { outcome: 'rejected', description: 'Expense rejected — notify submitter' },
        label: 'Rejected',
      },
    ],
    metadata: { created: now, modified: now },
  });

  // --- Flow: process-reimbursement ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/approvals/flows/process-reimbursement.yaml`] = stringify({
    flow: { id: 'process-reimbursement', name: 'Process Reimbursement', type: 'traditional', domain: 'approvals' },
    trigger: {
      id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 },
      connections: [{ targetNodeId: 'service-call-1' }],
      spec: { event: 'ExpenseApproved', source: 'Event Bus', description: 'Approved expense ready for payment' },
      label: 'Approval Received',
    },
    nodes: [
      {
        id: 'service-call-1', type: 'service_call', position: { x: 250, y: 200 },
        connections: [{ targetNodeId: 'decision-1' }],
        spec: {
          method: 'POST',
          url: 'https://api.stripe.com/v1/transfers',
          headers: { Authorization: 'Bearer {{env.STRIPE_KEY}}' },
          body: {
            amount: '{{expense.amount}}',
            currency: '{{expense.currency}}',
            destination: '{{employee.stripe_account}}',
          },
          timeout_ms: 15000,
          retry: { max_attempts: 3, backoff_ms: 2000 },
          error_mapping: { '400': 'invalid_account', '500': 'gateway_error' },
          description: 'Transfer funds via Stripe Connect',
        },
        label: 'Stripe Transfer',
      },
      {
        id: 'decision-1', type: 'decision', position: { x: 250, y: 370 },
        connections: [
          { targetNodeId: 'data-store-1', sourceHandle: 'true' },
          { targetNodeId: 'terminal-fail', sourceHandle: 'false' },
        ],
        spec: { condition: 'transfer.status === succeeded', trueLabel: 'Paid', falseLabel: 'Failed', description: 'Check transfer result' },
        label: 'Transfer OK?',
      },
      {
        id: 'data-store-1', type: 'data_store', position: { x: 100, y: 520 },
        connections: [{ targetNodeId: 'terminal-ok' }],
        spec: {
          operation: 'update',
          model: 'Expense',
          data: { status: 'reimbursed', paid_at: '{{now}}', transfer_id: '{{transfer.id}}' },
          query: { id: '{{expense.id}}' },
          description: 'Mark expense as reimbursed',
        },
        label: 'Update Record',
      },
      {
        id: 'terminal-ok', type: 'terminal', position: { x: 100, y: 660 },
        connections: [],
        spec: { outcome: 'success', description: 'Reimbursement complete' },
        label: 'Paid',
      },
      {
        id: 'terminal-fail', type: 'terminal', position: { x: 400, y: 520 },
        connections: [],
        spec: { outcome: 'error', description: 'Transfer failed — retry or escalate' },
        label: 'Payment Failed',
      },
    ],
    metadata: { created: now, modified: now },
  });

  // --- Flow: monthly-summary ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/reports/flows/monthly-summary.yaml`] = stringify({
    flow: { id: 'monthly-summary', name: 'Monthly Summary', type: 'traditional', domain: 'reports' },
    trigger: {
      id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 },
      connections: [{ targetNodeId: 'collection-1' }],
      spec: { event: 'CRON: 1st of month', source: 'Scheduler', description: 'Monthly report generation trigger' },
      label: 'Month Start',
    },
    nodes: [
      {
        id: 'collection-1', type: 'collection', position: { x: 250, y: 200 },
        connections: [{ targetNodeId: 'transform-1' }],
        spec: {
          source: 'Expense',
          filter: { status: 'reimbursed', period: 'previous_month' },
          sort: { field: 'category', order: 'asc' },
          group_by: 'category',
          description: 'Fetch all reimbursed expenses for previous month',
        },
        label: 'Gather Expenses',
      },
      {
        id: 'transform-1', type: 'transform', position: { x: 250, y: 370 },
        connections: [{ targetNodeId: 'terminal-1' }],
        spec: {
          operation: 'aggregate',
          input: '{{collection.results}}',
          output: {
            total_spend: 'SUM(amount)',
            by_category: 'GROUP_SUM(category, amount)',
            by_department: 'GROUP_SUM(department, amount)',
            top_spenders: 'TOP(employee, amount, 10)',
            avg_approval_time: 'AVG(approved_at - submitted_at)',
          },
          description: 'Compute monthly expense analytics',
        },
        label: 'Build Summary',
      },
      {
        id: 'terminal-1', type: 'terminal', position: { x: 250, y: 530 },
        connections: [],
        spec: { outcome: 'success', description: 'Monthly report generated and distributed' },
        label: 'Report Ready',
      },
    ],
    metadata: { created: now, modified: now },
  });

  return files;
}

/** Returns all files needed to seed the VFS for demo mode */
export const SEED_FILES = buildSeedFiles();
