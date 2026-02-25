# todo-api — DDD Sample Project

A minimal Todo REST API built with the full DDD workflow. Use this project to test that changes made in the **DDD Tool** (visual canvas) flow through to real running code via `/ddd-implement`.

**Stack:** Node.js · TypeScript · Express · Prisma · SQLite · Zod

---

## Setup

```bash
cd sample/todo-api
npm install
cp .env.example .env
npm run db:setup     # generates Prisma client + creates SQLite DB
npm test             # 13/13 tests should pass
```

---

## The Test Scenario

### What was proved

A flow change made in the DDD Tool (or by editing the spec YAML directly) is reflected in running code after `/ddd-implement`.

### Starting state — 3 flows, all implemented

| Flow | Endpoint | What it does |
|------|----------|--------------|
| `create-todo` | `POST /api/todos` | Validates input, inserts row, returns 201 |
| `list-todos` | `GET /api/todos` | Fetches all todos sorted newest first |
| `delete-todo` | `DELETE /api/todos/:id` | Finds by ID, deletes, returns 204 or 404 |

### The change — adding a new node to `list-todos`

**Before** (original spec):
```
trigger → data_store → terminal
```

**After** (spec change — simulates dragging a new node in DDD Tool):
```
trigger → input (new node) → data_store → terminal
                ↓
           terminal (400)
```

The new `input` node validates an optional `?completed` query param. The `data_store` query was updated to use `$.completed` as a filter.

**Spec edit made** (`specs/domains/todos/flows/list-todos.yaml`):
- Added `input-fLpQ2kNs` node with field `completed: boolean (optional)`
- Changed trigger connection from `datastore` → `input`
- Changed `data_store` query to `{ completed: "$.completed" }`

**Command run:**
```bash
/ddd-implement todos/list-todos
```

**Code that changed:**

`src/repositories/todo.repository.ts`
```ts
// Before
export async function listTodos() {
  return prisma.todo.findMany({ orderBy: { created_at: 'desc' } });
}

// After
export async function listTodos(filter?: { completed?: boolean }) {
  return prisma.todo.findMany({
    where: filter?.completed !== undefined ? { completed: filter.completed } : undefined,
    orderBy: { created_at: 'desc' },
  });
}
```

`src/routes/todos.ts`
```ts
// Before
router.get('/', async (_req, res, next) => {
  const todos = await todoRepo.listTodos();
  res.status(200).json({ todos });
});

// After — new zod schema + filter passed through
const listQuerySchema = z.object({
  completed: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});

router.get('/', async (req, res, next) => {
  const result = listQuerySchema.safeParse(req.query);
  if (!result.success) return next(new AppError('VALIDATION_ERROR', ...));
  const todos = await todoRepo.listTodos(result.data);
  res.status(200).json({ todos });
});
```

### Live server proof

```bash
# Seed data
# Buy groceries (pending), Write tests (done), Deploy app (pending)

GET /api/todos              → all 3 todos
GET /api/todos?completed=true  → ["Write tests"]
GET /api/todos?completed=false → ["Buy groceries", "Deploy app"]

POST /api/todos {"title":"Ship the feature"}  → 201 + new todo
DELETE /api/todos/25                          → 204, gone from list
```

### Test results

```
Tests:  13 passed, 13 total

  POST /api/todos
    ✓ creates a todo and returns 201
    ✓ returns 400 when title is missing
    ✓ returns 400 when title is empty string
    ✓ respects completed flag when provided

  GET /api/todos
    ✓ returns empty list when no todos
    ✓ returns todos sorted newest first
    ✓ filters by ?completed=true        ← new test for new node
    ✓ filters by ?completed=false       ← new test for new node
    ✓ returns 400 for invalid value     ← new test for new node

  DELETE /api/todos/:id
    ✓ deletes an existing todo and returns 204
    ✓ returns 404 when todo does not exist
    ✓ returns 400 for non-numeric id

  Health check
    ✓ GET /health returns ok
```

---

## Try it yourself with the DDD Tool

1. Open DDD Tool → **Open Project** → select this directory
2. Navigate: System Map → Todos domain → `list-todos` flow
3. Make a change (add a node, change a spec field, rewire a connection)
4. DDD Tool saves the YAML and writes a `pending_implement` entry to `.ddd/change-history.yaml`
5. In this directory, run `/ddd-implement` (no args — picks up only what changed)
6. Check `src/routes/todos.ts` — code reflects your change
7. Run `npm test` to verify

---

## Project structure

```
sample/todo-api/
  specs/
    domains/todos/
      domain.yaml              # domain config
      flows/
        create-todo.yaml       # POST /api/todos
        list-todos.yaml        # GET /api/todos  ← this one was changed
        delete-todo.yaml       # DELETE /api/todos/:id
    schemas/todo.yaml          # Prisma model definition
    shared/errors.yaml         # error codes
  src/
    routes/todos.ts            # all 3 route handlers
    repositories/todo.repository.ts  # Prisma queries
    errors/index.ts            # AppError class
    middleware/error-handler.ts
  prisma/schema.prisma         # SQLite schema
  .ddd/
    mapping.yaml               # tracks which spec hash is implemented
    change-history.yaml        # queue of pending spec changes
```
