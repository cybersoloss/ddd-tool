/**
 * Static sample project data for demo mode.
 * Pre-generates all YAML/JSON files that the sample project needs,
 * ready to be loaded into the VFS.
 */
import { stringify } from 'yaml';

export const DEMO_HOME = '/demo';
export const DEMO_PROJECT_PATH = '/demo/ddd-sample-project';

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
      name: 'ddd-sample-project',
      path: DEMO_PROJECT_PATH,
      lastOpenedAt: now,
      description: 'Sample DDD project for exploration',
    },
  ], null, 2);

  // --- Project config ---
  files[`${DEMO_PROJECT_PATH}/ddd-project.json`] = JSON.stringify({
    name: 'ddd-sample-project',
    description: 'Sample DDD project for exploration',
    techStack: {
      language: 'TypeScript',
      languageVersion: '5.x',
      framework: 'Express',
      database: 'PostgreSQL',
      orm: 'Prisma',
    },
    domains: [
      { name: 'Users', description: 'User management and authentication' },
      { name: 'Billing', description: 'Billing, subscriptions, and payments' },
      { name: 'Support', description: 'Customer support and ticketing' },
    ],
    createdAt: now,
  }, null, 2);

  // --- System layout ---
  files[`${DEMO_PROJECT_PATH}/specs/system-layout.yaml`] = stringify({
    domains: {
      users: { x: 100, y: 100 },
      billing: { x: 500, y: 100 },
      support: { x: 300, y: 400 },
    },
  });

  // --- System events ---
  files[`${DEMO_PROJECT_PATH}/specs/system.yaml`] = stringify({
    events: [
      { name: 'UserRegistered', source: 'users', consumers: ['billing'] },
      { name: 'PaymentFailed', source: 'billing', consumers: ['support'] },
    ],
  });

  // --- Users domain ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/users/domain.yaml`] = stringify({
    name: 'Users',
    description: 'User management and authentication',
    flows: [
      { id: 'user-register', name: 'User Register', type: 'traditional', description: 'Validate and create new user accounts' },
      { id: 'user-login', name: 'User Login', type: 'traditional', description: 'Authenticate users with credentials' },
    ],
    publishes_events: [
      { event: 'UserRegistered', from_flow: 'user-register', description: 'Emitted when a new user registers' },
      { event: 'UserLoggedIn', from_flow: 'user-login', description: 'Emitted on successful login' },
    ],
    consumes_events: [],
    layout: {
      flows: {
        'user-register': { x: 50, y: 50 },
        'user-login': { x: 350, y: 50 },
      },
      portals: {},
    },
  });

  // --- Billing domain ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/billing/domain.yaml`] = stringify({
    name: 'Billing',
    description: 'Billing, subscriptions, and payments',
    flows: [
      { id: 'create-subscription', name: 'Create Subscription', type: 'traditional', description: 'Set up recurring billing plans' },
      { id: 'payment-processing', name: 'Payment Processing', type: 'traditional', description: 'Process charges via Stripe API' },
    ],
    publishes_events: [
      { event: 'SubscriptionCreated', from_flow: 'create-subscription' },
      { event: 'PaymentFailed', from_flow: 'payment-processing' },
    ],
    consumes_events: [
      { event: 'UserRegistered', handled_by_flow: 'create-subscription' },
    ],
    layout: {
      flows: {
        'create-subscription': { x: 50, y: 50 },
        'payment-processing': { x: 350, y: 50 },
      },
      portals: {},
    },
  });

  // --- Support domain ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/support/domain.yaml`] = stringify({
    name: 'Support',
    description: 'Customer support and ticketing',
    flows: [
      { id: 'support-ticket', name: 'Support Ticket', type: 'agent', description: 'AI-powered ticket resolution with human review' },
    ],
    publishes_events: [
      { event: 'TicketResolved', from_flow: 'support-ticket' },
    ],
    consumes_events: [
      { event: 'PaymentFailed', handled_by_flow: 'support-ticket' },
    ],
    layout: {
      flows: {
        'support-ticket': { x: 50, y: 50 },
      },
      portals: {},
    },
  });

  // --- Flow: user-register ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/users/flows/user-register.yaml`] = stringify({
    flow: { id: 'user-register', name: 'User Register', type: 'traditional', domain: 'users' },
    trigger: {
      id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 },
      connections: [{ targetNodeId: 'input-1' }],
      spec: { event: 'POST /api/register', source: 'API Gateway', description: 'User submits registration form' },
      label: 'Registration Request',
    },
    nodes: [
      {
        id: 'input-1', type: 'input', position: { x: 250, y: 180 },
        connections: [{ targetNodeId: 'process-1' }],
        spec: {
          fields: [
            { name: 'email', type: 'string', required: true },
            { name: 'password', type: 'string', required: true },
            { name: 'name', type: 'string', required: true },
          ],
          validation: 'Email format, password min 8 chars',
          description: 'Registration form data',
        },
        label: 'Registration Form',
      },
      {
        id: 'process-1', type: 'process', position: { x: 250, y: 310 },
        connections: [{ targetNodeId: 'decision-1' }],
        spec: { action: 'Check if email already exists', service: 'UserService', description: 'Look up user by email' },
        label: 'Check Existing',
      },
      {
        id: 'decision-1', type: 'decision', position: { x: 250, y: 440 },
        connections: [
          { targetNodeId: 'terminal-1', sourceHandle: 'true' },
          { targetNodeId: 'process-2', sourceHandle: 'false' },
        ],
        spec: { condition: 'user exists?', trueLabel: 'Exists', falseLabel: 'New', description: 'Check if email is taken' },
        label: 'User Exists?',
      },
      {
        id: 'terminal-1', type: 'terminal', position: { x: 50, y: 570 },
        connections: [],
        spec: { outcome: 'error', description: 'Return 409 Conflict' },
        label: 'Already Exists',
      },
      {
        id: 'process-2', type: 'process', position: { x: 400, y: 570 },
        connections: [{ targetNodeId: 'event-1' }],
        spec: { action: 'Hash password and create user record', service: 'UserService', description: 'Create user in database' },
        label: 'Create User',
      },
      {
        id: 'event-1', type: 'event', position: { x: 400, y: 700 },
        connections: [{ targetNodeId: 'terminal-2' }],
        spec: { event_name: 'UserRegistered', payload: { user_id: '{{user.id}}', email: '{{user.email}}' }, description: 'Notify other domains of new user' },
        label: 'Emit UserRegistered',
      },
      {
        id: 'terminal-2', type: 'terminal', position: { x: 400, y: 830 },
        connections: [],
        spec: { outcome: 'success', description: 'Return 201 Created with user data' },
        label: 'Success',
      },
    ],
    metadata: { created: now, modified: now },
  });

  // --- Flow: user-login ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/users/flows/user-login.yaml`] = stringify({
    flow: { id: 'user-login', name: 'User Login', type: 'traditional', domain: 'users' },
    trigger: {
      id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 },
      connections: [{ targetNodeId: 'input-1' }],
      spec: { event: 'POST /api/login', source: 'API Gateway', description: 'User submits login credentials' },
      label: 'Login Request',
    },
    nodes: [
      {
        id: 'input-1', type: 'input', position: { x: 250, y: 180 },
        connections: [{ targetNodeId: 'process-1' }],
        spec: {
          fields: [
            { name: 'email', type: 'string', required: true },
            { name: 'password', type: 'string', required: true },
          ],
          validation: 'Email format',
          description: 'Login credentials',
        },
        label: 'Login Form',
      },
      {
        id: 'process-1', type: 'process', position: { x: 250, y: 310 },
        connections: [{ targetNodeId: 'decision-1' }],
        spec: { action: 'Verify credentials against stored hash', service: 'AuthService', description: 'Authenticate user' },
        label: 'Verify Credentials',
      },
      {
        id: 'decision-1', type: 'decision', position: { x: 250, y: 440 },
        connections: [
          { targetNodeId: 'process-2', sourceHandle: 'true' },
          { targetNodeId: 'terminal-1', sourceHandle: 'false' },
        ],
        spec: { condition: 'credentials valid?', trueLabel: 'Valid', falseLabel: 'Invalid', description: 'Check auth result' },
        label: 'Valid?',
      },
      {
        id: 'process-2', type: 'process', position: { x: 100, y: 570 },
        connections: [{ targetNodeId: 'terminal-2' }],
        spec: { action: 'Generate JWT token', service: 'AuthService', description: 'Issue authentication token' },
        label: 'Generate Token',
      },
      {
        id: 'terminal-1', type: 'terminal', position: { x: 400, y: 570 },
        connections: [],
        spec: { outcome: 'error', description: 'Return 401 Unauthorized' },
        label: 'Auth Failed',
      },
      {
        id: 'terminal-2', type: 'terminal', position: { x: 100, y: 700 },
        connections: [],
        spec: { outcome: 'success', description: 'Return 200 with JWT' },
        label: 'Login Success',
      },
    ],
    metadata: { created: now, modified: now },
  });

  // --- Flow: create-subscription ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/billing/flows/create-subscription.yaml`] = stringify({
    flow: { id: 'create-subscription', name: 'Create Subscription', type: 'traditional', domain: 'billing' },
    trigger: {
      id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 },
      connections: [{ targetNodeId: 'input-1' }],
      spec: { event: 'POST /api/subscriptions', source: 'API Gateway', description: 'User selects a subscription plan' },
      label: 'Subscribe Request',
    },
    nodes: [
      {
        id: 'input-1', type: 'input', position: { x: 250, y: 180 },
        connections: [{ targetNodeId: 'process-1' }],
        spec: {
          fields: [
            { name: 'plan_id', type: 'string', required: true },
            { name: 'payment_method', type: 'string', required: true },
          ],
          validation: 'Valid plan ID and payment method',
          description: 'Subscription details',
        },
        label: 'Plan Selection',
      },
      {
        id: 'process-1', type: 'process', position: { x: 250, y: 310 },
        connections: [{ targetNodeId: 'decision-1' }],
        spec: { action: 'Charge payment method', service: 'PaymentService', description: 'Process initial payment' },
        label: 'Process Payment',
      },
      {
        id: 'decision-1', type: 'decision', position: { x: 250, y: 440 },
        connections: [
          { targetNodeId: 'process-2', sourceHandle: 'true' },
          { targetNodeId: 'terminal-1', sourceHandle: 'false' },
        ],
        spec: { condition: 'payment succeeded?', trueLabel: 'Success', falseLabel: 'Failed', description: 'Check payment result' },
        label: 'Payment OK?',
      },
      {
        id: 'process-2', type: 'process', position: { x: 100, y: 570 },
        connections: [{ targetNodeId: 'terminal-2' }],
        spec: { action: 'Create subscription record', service: 'SubscriptionService', description: 'Activate subscription' },
        label: 'Create Subscription',
      },
      {
        id: 'terminal-1', type: 'terminal', position: { x: 400, y: 570 },
        connections: [],
        spec: { outcome: 'error', description: 'Return 402 Payment Required' },
        label: 'Payment Failed',
      },
      {
        id: 'terminal-2', type: 'terminal', position: { x: 100, y: 700 },
        connections: [],
        spec: { outcome: 'success', description: 'Return 201 with subscription data' },
        label: 'Subscribed',
      },
    ],
    metadata: { created: now, modified: now },
  });

  // --- Flow: payment-processing ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/billing/flows/payment-processing.yaml`] = stringify({
    flow: { id: 'payment-processing', name: 'Payment Processing', type: 'traditional', domain: 'billing' },
    trigger: {
      id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 },
      connections: [{ targetNodeId: 'data-store-1' }],
      spec: { event: 'PaymentDue', source: 'Scheduler', description: 'Recurring payment is due' },
      label: 'Payment Due',
    },
    nodes: [
      {
        id: 'data-store-1', type: 'data_store', position: { x: 250, y: 180 },
        connections: [{ targetNodeId: 'service-call-1' }],
        spec: {
          operation: 'read', model: 'PaymentMethod', data: {},
          query: { user_id: '{{trigger.user_id}}' },
          description: 'Load saved payment method',
        },
        label: 'Load Payment Method',
      },
      {
        id: 'service-call-1', type: 'service_call', position: { x: 250, y: 330 },
        connections: [{ targetNodeId: 'decision-1' }],
        spec: {
          method: 'POST', url: 'https://api.stripe.com/v1/charges',
          headers: { Authorization: 'Bearer {{env.STRIPE_KEY}}' },
          body: { amount: '{{trigger.amount}}', currency: 'usd' },
          timeout_ms: 10000,
          retry: { max_attempts: 3, backoff_ms: 2000 },
          error_mapping: { '402': 'insufficient_funds', '500': 'gateway_error' },
          description: 'Charge via Stripe API',
        },
        label: 'Charge Stripe',
      },
      {
        id: 'decision-1', type: 'decision', position: { x: 250, y: 480 },
        connections: [
          { targetNodeId: 'data-store-2', sourceHandle: 'true' },
          { targetNodeId: 'terminal-fail', sourceHandle: 'false' },
        ],
        spec: { condition: 'charge.status === succeeded', trueLabel: 'Paid', falseLabel: 'Failed', description: 'Check charge result' },
        label: 'Charge OK?',
      },
      {
        id: 'data-store-2', type: 'data_store', position: { x: 100, y: 620 },
        connections: [{ targetNodeId: 'terminal-ok' }],
        spec: {
          operation: 'update', model: 'Subscription',
          data: { last_payment: '{{now}}', status: 'active' },
          query: { id: '{{trigger.subscription_id}}' },
          description: 'Update subscription record',
        },
        label: 'Update Subscription',
      },
      {
        id: 'terminal-ok', type: 'terminal', position: { x: 100, y: 750 },
        connections: [],
        spec: { outcome: 'success', description: 'Payment processed successfully' },
        label: 'Payment OK',
      },
      {
        id: 'terminal-fail', type: 'terminal', position: { x: 400, y: 620 },
        connections: [],
        spec: { outcome: 'error', description: 'Emit PaymentFailed event' },
        label: 'Payment Failed',
      },
    ],
    metadata: { created: now, modified: now },
  });

  // --- Flow: support-ticket (agent flow) ---
  files[`${DEMO_PROJECT_PATH}/specs/domains/support/flows/support-ticket.yaml`] = stringify({
    flow: { id: 'support-ticket', name: 'Support Ticket', type: 'agent', domain: 'support' },
    trigger: {
      id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 },
      connections: [{ targetNodeId: 'guardrail-1' }],
      spec: { event: 'Ticket Created', source: 'Support Portal', description: 'Customer creates a support ticket' },
      label: 'New Ticket',
    },
    nodes: [
      {
        id: 'guardrail-1', type: 'guardrail', position: { x: 250, y: 170 },
        connections: [{ targetNodeId: 'agent-loop-1' }],
        spec: {
          position: 'input',
          checks: [{ type: 'content_policy', action: 'block' }],
          on_block: 'Reject inappropriate content',
        },
        label: 'Input Filter',
      },
      {
        id: 'agent-loop-1', type: 'agent_loop', position: { x: 250, y: 320 },
        connections: [{ targetNodeId: 'human-gate-1' }],
        spec: {
          model: 'claude-sonnet',
          system_prompt: 'You are a helpful customer support agent. Investigate the issue and propose a resolution.',
          max_iterations: 8,
          temperature: 0.5,
          stop_conditions: ['resolution_proposed'],
          tools: [
            { id: 'lookup', name: 'lookup_ticket', description: 'Look up ticket history', parameters: '{"ticket_id": "string"}' },
            { id: 'search', name: 'search_kb', description: 'Search knowledge base', parameters: '{"query": "string"}' },
            { id: 'resolve', name: 'propose_resolution', description: 'Propose a resolution', parameters: '{"resolution": "string"}', is_terminal: true },
          ],
          memory: [{ name: 'conversation', type: 'conversation_history', max_tokens: 8000, strategy: 'sliding_window' }],
          on_max_iterations: 'escalate',
        },
        label: 'Support Agent',
      },
      {
        id: 'human-gate-1', type: 'human_gate', position: { x: 250, y: 480 },
        connections: [{ targetNodeId: 'terminal-1' }],
        spec: {
          notification_channels: ['slack'],
          approval_options: [
            { id: 'approve', label: 'Approve' },
            { id: 'reject', label: 'Reject' },
          ],
          timeout: { duration: 3600, action: 'escalate' },
          context_for_human: ['ticket_summary', 'proposed_resolution'],
        },
        label: 'Review Gate',
      },
      {
        id: 'terminal-1', type: 'terminal', position: { x: 250, y: 610 },
        connections: [],
        spec: { outcome: 'resolved', description: 'Ticket resolved or escalated' },
        label: 'Resolved',
      },
    ],
    metadata: { created: now, modified: now },
  });

  return files;
}

/** Returns all files needed to seed the VFS for demo mode */
export const SEED_FILES = buildSeedFiles();
