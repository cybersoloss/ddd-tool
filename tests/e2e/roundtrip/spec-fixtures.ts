/**
 * DDD Round-Trip Test — Spec Fixtures
 *
 * Defines a 2-domain "task-tracker" test app and writes it to disk
 * as a valid DDD project structure.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';

// ─── Project Definition ──────────────────────────────────────────────────

const PROJECT_JSON = {
  name: 'task-tracker',
  description: 'Simple task tracker with notifications',
  version: '0.1.0',
  domains: [
    { id: 'tasks', name: 'Tasks', description: 'Task management' },
    { id: 'notifications', name: 'Notifications', description: 'Notification delivery' },
  ],
};

const SYSTEM_YAML = {
  project: {
    name: 'task-tracker',
    description: 'Simple task tracker with notifications',
    version: '0.1.0',
  },
  tech_stack: {
    language: 'TypeScript',
    framework: 'Express',
    runtime: 'Node.js 20',
    database: 'SQLite',
    orm: 'Prisma',
  },
  environments: {
    development: {
      url: 'http://localhost:3001',
      database_url: 'file:./dev.db',
    },
  },
};

const ARCHITECTURE_YAML = {
  project_structure: {
    source_root: 'src',
    entry_point: 'src/server.ts',
    layers: ['routes', 'services', 'repositories'],
  },
  naming_conventions: {
    files: 'kebab-case',
    functions: 'camelCase',
    types: 'PascalCase',
    constants: 'UPPER_SNAKE_CASE',
  },
  dependencies: {
    runtime: ['express', '@prisma/client', 'zod'],
    dev: ['typescript', 'tsx', 'prisma', '@types/express', '@types/node'],
  },
  api_design: {
    style: 'REST',
    base_path: '/api',
    response_format: 'json',
    error_format: { code: 'string', message: 'string' },
  },
  testing: {
    framework: 'jest',
    command: 'npx jest',
    coverage_threshold: 80,
  },
  cross_cutting_patterns: {},
};

const CONFIG_YAML = {
  variables: [
    { name: 'PORT', type: 'number', required: false, default: '3001', description: 'Server port' },
    { name: 'DATABASE_URL', type: 'string', required: true, description: 'SQLite database file path', example: 'file:./dev.db' },
    { name: 'NODE_ENV', type: 'string', required: false, default: 'development', values: ['development', 'production', 'test'] },
    { name: 'EMAIL_API_URL', type: 'string', required: true, description: 'Email service API endpoint' },
    { name: 'EMAIL_API_KEY', type: 'string', required: true, description: 'Email service API key' },
  ],
};

const ERRORS_YAML = {
  categories: [
    {
      name: 'validation',
      codes: [
        { code: 'VALIDATION_ERROR', status: 400, message: 'Input validation failed' },
      ],
    },
    {
      name: 'not_found',
      codes: [
        { code: 'NOT_FOUND', status: 404, message: 'Resource not found' },
      ],
    },
    {
      name: 'internal',
      codes: [
        { code: 'INTERNAL_ERROR', status: 500, message: 'Internal server error' },
      ],
    },
  ],
};

// ─── Domain: tasks ───────────────────────────────────────────────────────

const TASKS_DOMAIN_YAML = {
  name: 'Tasks',
  description: 'Task management — create and list tasks',
  role: 'entity',
  owns_schemas: ['Task'],
  flows: [
    { id: 'create-task', name: 'Create Task', description: 'Create a new task', type: 'traditional', tags: ['public-api'] },
    { id: 'list-tasks', name: 'List Tasks', description: 'List all tasks', type: 'traditional', tags: ['public-api'] },
  ],
  publishes_events: [
    { event: 'task.created', from_flow: 'create-task', description: 'Emitted when a task is created' },
  ],
  consumes_events: [],
  layout: {
    flows: {
      'create-task': { x: 100, y: 100 },
      'list-tasks': { x: 400, y: 100 },
    },
  },
};

const CREATE_TASK_FLOW = {
  flow: {
    id: 'create-task',
    name: 'Create Task',
    type: 'traditional',
    domain: 'tasks',
    description: 'Validates input and creates a new task, then emits task.created event',
    auth: { required: false },
  },
  trigger: {
    id: 'trigger-ct01',
    type: 'trigger',
    position: { x: 400, y: 50 },
    connections: [{ targetNodeId: 'input-ct02' }],
    spec: { event: 'HTTP POST /api/tasks' },
    label: 'POST /api/tasks',
  },
  nodes: [
    {
      id: 'input-ct02',
      type: 'input',
      position: { x: 400, y: 200 },
      connections: [
        { targetNodeId: 'datastore-ct03', sourceHandle: 'valid' },
        { targetNodeId: 'terminal-ct06', sourceHandle: 'invalid' },
      ],
      spec: {
        fields: [
          { name: 'title', type: 'string', required: true },
          { name: 'status', type: 'string', required: false },
          { name: 'assignee', type: 'string', required: false },
        ],
        validation: 'zod',
        description: 'Validate task input fields',
      },
      label: 'Validate Input',
    },
    {
      id: 'datastore-ct03',
      type: 'data_store',
      position: { x: 400, y: 350 },
      connections: [
        { targetNodeId: 'event-ct04', sourceHandle: 'success' },
        { targetNodeId: 'terminal-ct07', sourceHandle: 'error' },
      ],
      spec: {
        store_type: 'database',
        operation: 'create',
        model: 'Task',
        data: { title: '$.title', status: '$.status', assignee: '$.assignee' },
        returning: true,
        description: 'Insert new task row',
      },
      label: 'Save Task',
    },
    {
      id: 'event-ct04',
      type: 'event',
      position: { x: 400, y: 500 },
      connections: [{ targetNodeId: 'terminal-ct05' }],
      spec: {
        action: 'emit',
        event_name: 'task.created',
        payload: { task_id: '$.task.id', title: '$.task.title' },
        description: 'Emit task.created event',
      },
      label: 'Emit task.created',
    },
    {
      id: 'terminal-ct05',
      type: 'terminal',
      position: { x: 400, y: 650 },
      connections: [],
      spec: { outcome: 'success', status: 201, body: { task: '$.task' } },
      label: '201 Created',
    },
    {
      id: 'terminal-ct06',
      type: 'terminal',
      position: { x: 750, y: 200 },
      connections: [],
      spec: { outcome: 'error', status: 400, body: { code: 'VALIDATION_ERROR', message: '$.validation_errors' } },
      label: '400 Bad Request',
    },
    {
      id: 'terminal-ct07',
      type: 'terminal',
      position: { x: 750, y: 350 },
      connections: [],
      spec: { outcome: 'error', status: 500, body: { code: 'INTERNAL_ERROR', message: 'Failed to create task' } },
      label: '500 Error',
    },
  ],
  metadata: {
    created: '2026-02-28T00:00:00.000Z',
    modified: '2026-02-28T00:00:00.000Z',
  },
};

const LIST_TASKS_FLOW = {
  flow: {
    id: 'list-tasks',
    name: 'List Tasks',
    type: 'traditional',
    domain: 'tasks',
    description: 'Retrieve all tasks from the database',
    auth: { required: false },
  },
  trigger: {
    id: 'trigger-lt01',
    type: 'trigger',
    position: { x: 400, y: 50 },
    connections: [{ targetNodeId: 'datastore-lt02' }],
    spec: { event: 'HTTP GET /api/tasks' },
    label: 'GET /api/tasks',
  },
  nodes: [
    {
      id: 'datastore-lt02',
      type: 'data_store',
      position: { x: 400, y: 200 },
      connections: [
        { targetNodeId: 'terminal-lt03', sourceHandle: 'success' },
        { targetNodeId: 'terminal-lt04', sourceHandle: 'error' },
      ],
      spec: {
        store_type: 'database',
        operation: 'read',
        model: 'Task',
        description: 'Read all tasks',
      },
      label: 'Read Tasks',
    },
    {
      id: 'terminal-lt03',
      type: 'terminal',
      position: { x: 400, y: 350 },
      connections: [],
      spec: { outcome: 'success', status: 200, body: { tasks: '$.tasks' } },
      label: '200 OK',
    },
    {
      id: 'terminal-lt04',
      type: 'terminal',
      position: { x: 750, y: 200 },
      connections: [],
      spec: { outcome: 'error', status: 500, body: { code: 'INTERNAL_ERROR', message: 'Failed to read tasks' } },
      label: '500 Error',
    },
  ],
  metadata: {
    created: '2026-02-28T00:00:00.000Z',
    modified: '2026-02-28T00:00:00.000Z',
  },
};

// ─── Domain: notifications ───────────────────────────────────────────────

const NOTIFICATIONS_DOMAIN_YAML = {
  name: 'Notifications',
  description: 'Notification delivery — sends notifications when events occur',
  role: 'process',
  flows: [
    { id: 'send-notification', name: 'Send Notification', description: 'Send email notification', type: 'traditional' },
  ],
  publishes_events: [],
  consumes_events: [
    { event: 'task.created', handled_by_flow: 'send-notification', description: 'Handle task.created to send notification' },
  ],
  layout: {
    flows: {
      'send-notification': { x: 100, y: 100 },
    },
  },
};

const SEND_NOTIFICATION_FLOW = {
  flow: {
    id: 'send-notification',
    name: 'Send Notification',
    type: 'traditional',
    domain: 'notifications',
    description: 'Formats and sends an email notification when a task is created',
    auth: { required: false },
  },
  trigger: {
    id: 'trigger-sn01',
    type: 'trigger',
    position: { x: 400, y: 50 },
    connections: [{ targetNodeId: 'process-sn02' }],
    spec: { event: 'event:task.created' },
    label: 'On task.created',
  },
  nodes: [
    {
      id: 'process-sn02',
      type: 'process',
      position: { x: 400, y: 200 },
      connections: [{ targetNodeId: 'service-sn03' }],
      spec: {
        action: 'Format notification message from task data',
        description: 'Format email message body',
      },
      label: 'Format Message',
    },
    {
      id: 'service-sn03',
      type: 'service_call',
      position: { x: 400, y: 350 },
      connections: [
        { targetNodeId: 'terminal-sn04', sourceHandle: 'success' },
        { targetNodeId: 'terminal-sn05', sourceHandle: 'error' },
      ],
      spec: {
        method: 'POST',
        url: '${EMAIL_API_URL}/send',
        headers: { Authorization: 'Bearer ${EMAIL_API_KEY}' },
        body: { to: '$.assignee_email', subject: 'New task assigned', body: '$.message' },
        description: 'Send email via email API',
      },
      label: 'Send Email',
    },
    {
      id: 'terminal-sn04',
      type: 'terminal',
      position: { x: 400, y: 500 },
      connections: [],
      spec: { outcome: 'success' },
      label: 'Sent',
    },
    {
      id: 'terminal-sn05',
      type: 'terminal',
      position: { x: 750, y: 350 },
      connections: [],
      spec: { outcome: 'error' },
      label: 'Send Failed',
    },
  ],
  metadata: {
    created: '2026-02-28T00:00:00.000Z',
    modified: '2026-02-28T00:00:00.000Z',
  },
};

// ─── Schema: Task ────────────────────────────────────────────────────────

const TASK_SCHEMA_YAML = {
  name: 'Task',
  description: 'A task item',
  fields: [
    { name: 'title', type: 'string', required: true, max_length: 255, description: 'Short description of the task' },
    { name: 'status', type: 'string', required: false, default: 'todo', description: 'Task status: todo, in_progress, done' },
    { name: 'assignee', type: 'string', required: false, description: 'Person assigned to the task' },
  ],
  indexes: [
    { fields: ['status'], type: 'btree', description: 'For filtering tasks by status' },
  ],
};

// ─── Write to Disk ───────────────────────────────────────────────────────

export function writeFixtureProject(basePath: string): void {
  // Directories
  const dirs = [
    '',
    'specs',
    'specs/domains',
    'specs/domains/tasks',
    'specs/domains/tasks/flows',
    'specs/domains/notifications',
    'specs/domains/notifications/flows',
    'specs/schemas',
    'specs/shared',
    '.ddd',
    '.ddd/annotations',
    '.ddd/autosave',
    '.ddd/reconciliations',
  ];

  for (const dir of dirs) {
    mkdirSync(join(basePath, dir), { recursive: true });
  }

  // Files
  const files: Array<[string, unknown, 'json' | 'yaml']> = [
    ['ddd-project.json', PROJECT_JSON, 'json'],
    ['specs/system.yaml', SYSTEM_YAML, 'yaml'],
    ['specs/architecture.yaml', ARCHITECTURE_YAML, 'yaml'],
    ['specs/config.yaml', CONFIG_YAML, 'yaml'],
    ['specs/shared/errors.yaml', ERRORS_YAML, 'yaml'],
    ['specs/domains/tasks/domain.yaml', TASKS_DOMAIN_YAML, 'yaml'],
    ['specs/domains/tasks/flows/create-task.yaml', CREATE_TASK_FLOW, 'yaml'],
    ['specs/domains/tasks/flows/list-tasks.yaml', LIST_TASKS_FLOW, 'yaml'],
    ['specs/domains/notifications/domain.yaml', NOTIFICATIONS_DOMAIN_YAML, 'yaml'],
    ['specs/domains/notifications/flows/send-notification.yaml', SEND_NOTIFICATION_FLOW, 'yaml'],
    ['specs/schemas/task.yaml', TASK_SCHEMA_YAML, 'yaml'],
  ];

  for (const [relPath, data, format] of files) {
    const content = format === 'json'
      ? JSON.stringify(data, null, 2) + '\n'
      : stringify(data, { lineWidth: 120 });
    writeFileSync(join(basePath, relPath), content, 'utf-8');
  }
}

export { PROJECT_JSON, SYSTEM_YAML, TASKS_DOMAIN_YAML, NOTIFICATIONS_DOMAIN_YAML };
