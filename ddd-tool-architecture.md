# DDD Tool — Architecture Notes

Unique UI/UX decisions, internal architecture, and implementation rules for the DDD Tool desktop app. For YAML spec formats and node type field references, see the [DDD Usage Guide](https://github.com/cybersoloss/DDD/blob/main/DDD-USAGE-GUIDE.md).

---

## Multi-Level Canvas

A single canvas cannot scale to show an entire application. DDD uses a 3-level hierarchical sheet system.

### Navigation Model

| Action | Result |
|--------|--------|
| Double-click domain block (L1) | Drill into that domain's sheet (L2) |
| Double-click flow block (L2) | Drill into that flow's sheet (L3) |
| Double-click sub-flow node (L3) | Jump to referenced flow's sheet (L3) |
| Double-click portal node (L2) | Jump to target domain's sheet (L2) |
| Click breadcrumb segment | Navigate back to that level |
| Backspace / Esc | Navigate one level up |

### Sheet Data Sources

| Level | Auto-generated from | Editable? |
|-------|---------------------|-----------|
| System Map (L1) | `system.yaml` domains + `domain.yaml` event wiring | Layout only (positions) |
| Domain Map (L2) | `domain.yaml` flow list + inter-flow events | Layout only (positions) |
| Flow Sheet (L3) | `flows/*.yaml` | Fully editable (nodes, connections, specs) |

Levels 1 and 2 are derived views. Users can reposition blocks but cannot add/remove domains or flows from these views (that happens via right-click context menus which update spec files). Level 3 is the primary editing surface.

---

## Right-Click Context Menus

### Level 1 — System Map

**Domain Block:**

| Action | What happens |
|--------|-------------|
| Rename domain | Renames directory, updates system.yaml, updates cross-domain references |
| Edit description | Inline edit, updates domain.yaml |
| Add event | Creates new event arrow, updates domain.yaml |
| Delete domain | Confirmation dialog (shows flow count), removes directory, updates system.yaml |

**Canvas Background:**
- Add domain → modal dialog (name + description), creates `specs/domains/{name}/domain.yaml`, updates `system.yaml`

### Level 2 — Domain Map

**Flow Block:**

| Action | What happens |
|--------|-------------|
| Rename flow | Renames file, updates flow.id, updates cross-references (sub-flows, orchestration, portals, mapping.yaml) |
| Duplicate flow | Creates copy with `-copy` suffix, copies all nodes/connections |
| Move to... | Submenu of other domains (excludes current), moves file, updates domain field |
| Change type | traditional/agent/orchestration — warns if type-specific data will be lost |
| Delete flow | Confirmation dialog, removes YAML, removes from mapping.yaml |

**Canvas Background:**
- Add flow → modal (name + flow type selector: Traditional / Agent / Orchestration), creates flow YAML with starter template

### Level 3 — Flow Sheet

**Canvas Background:** Right-click is captured but context menu actions (rename flow, clear canvas, import template) are not yet implemented — currently only prevents default browser menu. Flow templates are available via the toolbar "Add from Template" button, not the context menu.

---

## Node Output Handles (sourceHandle Routing)

Nodes with multiple output paths use named `sourceHandle` values for connection routing. Single-output node types (trigger, process, terminal, sub_flow, event, guardrail, human_gate, orchestrator, handoff, agent_group) use the default unnamed handle and are not listed here.

| Node Type | Output Handles | Visual | Color |
|-----------|---------------|--------|-------|
| Input | `valid` / `invalid` | Ok / Err | Green / Red |
| Decision | `true` / `false` | Yes / No | Green / Red |
| Data Store | `success` / `error` | Ok / Err | Green / Red |
| Service Call | `success` / `error` | Ok / Err | Green / Red |
| LLM Call | `success` / `error` (hidden) | — | — (invisible alias handles for external YAML compat) |
| Agent Loop | `done` / `error` | Done / Error | Green / Red |
| Loop | `body` / `done` | Body / Done | Teal / Muted |
| Parallel | `branch-0`, `branch-1`, ... / `done` | Dynamic | Pink / Muted |
| Smart Router | Dynamic route names | Route labels | Pink |
| Cache | `hit` / `miss` | Hit / Miss | Amber / Muted |
| Collection | `result` / `empty` | Result / Empty | Cyan / Muted |
| Parse | `success` / `error` | Ok / Err | Lime / Red |
| Crypto | `success` / `error` | Ok / Err | Fuchsia / Red |
| Batch | `done` / `error` | Done / Err | Rose / Red |
| Transaction | `committed` / `rolled_back` | Ok / Rollback | Amber / Red |

**Canvas rendering:** Dual-handle nodes show two labeled output handles at the bottom (positioned at 33% and 66%). Parallel nodes show N+1 handles (one per branch + done), evenly spaced. Handle colors match their semantic meaning.

---

## Agent Canvas Layout

Agent flows use a vertical layout with the Agent Loop as the central block:

```
┌─────────────────────────────┐
│   Input Guardrail Block     │  (if configured)
│   Shield icon, check count  │
└─────────────────────────────┘
           ↓
┌─────────────────────────────┐
│   Agent Loop Block          │
│   RotateCw icon             │
│   Model name (e.g. claude-opus-4-6)
│   System prompt preview     │
│   (first 150 chars, 3 lines max)
│                             │
│   Available Tools (badges): │
│   🔧 tool_name ⏹           │  (orange border if terminal)
│                             │
│   Memory (if present):      │
│   ◈ memory_name (type)      │
└─────────────────────────────┘
           ↓
    ┌──────┴──────┐
    ↓             ↓
┌─────────┐  ┌──────────────┐
│ Output  │  │  Human Gate  │
│Guardrail│  │  Block       │
└─────────┘  └──────────────┘
    ↓
┌─────────────────────────────┐
│   Response Terminal         │
└─────────────────────────────┘
```

**AgentLoopBlock:** Header with RotateCw icon, max iterations. Tool palette with flex-wrap badges — non-terminal: gray border/bg, terminal: orange border with ⏹ indicator.

**GuardrailBlock:** Shield icon, position label (Input/Output), check count. Yellow theme.

**HumanGateBlock:** Hand icon, timeout display `{duration}s → {action}`, approval options as small badges.

---

## Orchestration Visualization on L2

Level 2 Domain Map shows orchestration topology derived from flow YAML:

- **Agent Group:** Dashed rectangle boundary around grouped agents
- **Orchestrator block (⊛):** At top of group
- **Supervisor arrows (⊛▶):** Orchestrator → managed agent
- **Handoff arrows (⇄):** Bidirectional with mode label (transfer/consult/collaborate)
- **Agent flow blocks (▣⊛):** Square with agent badge
- **Shared memory indicator (◈):** At bottom of group

---

## Project Launcher

App starts at ProjectLauncher screen, not directly into canvas.

### New Project Wizard (3 Steps)

**Step 1 — Basics:** Project name, location (+ Browse), description, initialize Git checkbox

**Step 2 — Tech Stack:** Language (Python/TypeScript/Go), framework, database

**Step 3 — Initial Domains:** Domain list editor (add/remove), each with name + description

**What Create does:**
- Creates `specs/` directory with subdirs: `domains/`, `schemas/`, `shared/`
- Generates `specs/system.yaml`, `specs/architecture.yaml` (customized per tech stack), `specs/config.yaml`, `specs/shared/errors.yaml`
- Creates domain directories with `domain.yaml` per domain
- Creates `.ddd/` directory with `config.yaml` and `mapping.yaml`
- Initializes Git repo if checkbox checked

### Open Existing
- Validates folder: checks for `specs/system.yaml` or `.ddd/config.yaml` before loading

### Import from Git
- Clone URL + optional PAT input

### Recent Projects
- Stored in `~/.ddd-tool/recent-projects.json` (path, name, last opened)
- Pruned on load (dead links removed)
- Max 20 entries
- Right-click: remove from recent

---

## Settings Screen

Modal with sidebar tabs and Global vs Project scope toggle.

| Tab | What it configures |
|-----|-------------------|
| Editor | Grid snap, auto-save interval (seconds, 0=disabled), theme (light/dark/system), font size |
| Claude Code | Enabled toggle, CLI path input |
| Git | Auto-commit message template (`{flow_id}`, `{action}` placeholders), branch naming template |

**Persistence:** Global → `~/.ddd-tool/settings.json`, Project → `.ddd/config.yaml`

---

## First-Run Wizard

Triggers when `~/.ddd-tool/` directory doesn't exist.

**Step 1 — Claude Code Detection:** Auto-detect if `claude` is in PATH, manual path input option.

**Step 2 — Get Started:** "Explore with sample project" (bundled read-only example) / "Create new project" / "Open existing project"

**Creates:** `~/.ddd-tool/` directory, `settings.json` with defaults, `recent-projects.json`, first-run-completed flag.

---

## Undo/Redo System

**Scope:** Per-flow (Level 3 only). Levels 1-2 are derived views.

**Undoable:** Add/delete/move node, connect/disconnect, edit spec field, accept reconciliation item, bulk operations (paste, duplicate).

**NOT undoable:** Git commit, Claude Code implementation, file save, settings changes.

**Implementation:** Command pattern with immutable snapshots (`structuredClone`).

```
undoStack: FlowSnapshot[]    ← past states (max 100)
redoStack: FlowSnapshot[]    ← future states
current:   FlowSnapshot      ← the live state
```

**Coalescing:** Rapid changes to same field < 500ms apart coalesce into single snapshot (prevents 5 undo entries for typing a word).

**Keyboard:** `Cmd+Z` = Undo, `Cmd+Shift+Z` / `Cmd+Y` = Redo. Toolbar buttons with tooltips, grayed when stack empty.

---

## Design Validation

### Severity Levels

- **Error (red ✗):** Blocks implementation
- **Warning (amber ⚠):** User can override
- **Info (blue ℹ):** Suggestions only

### Validation Rules

**Flow-Level (Error):**
- Every flow must have exactly one trigger node
- All paths from trigger must reach a terminal node
- No orphaned (unreachable) nodes
- No circular paths in traditional flows (agents may have cycles)
- Decision nodes must have both true and false branch connections
- Trigger must have `event` defined
- Input fields must have `type` defined
- Decision must have `condition` defined

**Flow-Level (Warning):**
- Terminal nodes should not have outgoing connections
- Process nodes should have a description or action
- Agent loops should have `max_iterations` and `model` set
- Sub-flow mapping keys should match target flow's contract (if defined)

**Agent-Specific (Error):**
- Agent flow must have at least one `agent_loop` node
- Agent loop must have at least one tool
- Agent loop must have at least one terminal tool (`is_terminal: true`)

**Orchestration (Error):**
- Orchestrator must have 2+ agents and a strategy
- Smart Router must have rules defined or LLM routing enabled
- Handoff must have a target flow
- Agent Group must have 2+ members

**Extended Nodes (Error):**
- Data Store: operation + model required
- Service Call: method + URL required
- Event: direction + event_name required
- Loop: collection + iterator required
- Parallel: 2+ branches required
- Sub-flow: flow_ref required
- IPC Call: command required
- LLM Call: model required
- Cache: key + store required
- Transform: input_schema + output_schema required
- Delay: min_ms required
- Collection: operation + input required
- Parse: format + input required
- Crypto: operation + algorithm + key_source required
- Batch: input + operation_template required
- Transaction: steps with 2+ entries required

**Domain-Level:**
- No duplicate flow IDs within a domain
- No duplicate HTTP endpoints within a domain
- domain.yaml must match files on disk

**System-Level:**
- Consumed events must have at least one publisher (error)
- Published events should be consumed (warning)
- Event payload shapes must match between publisher/consumer (error)
- Portal targets must exist (error)
- Circular orchestration forbidden (error)

### Canvas Indicators
- Green border + dot: all valid
- Amber border + dot: warnings present
- Red border + dot: errors present
- Hover tooltip shows error/warning count

### Implementation Gate
- **Step 1 — Validate:** Run flow + domain + system validation
- **Step 2 — Prompt:** If no errors, show implementation prompt. Errors disable button. Warnings show "Implement anyway?"
- **Step 3 — Run:** Copy command to clipboard for Claude Code CLI
- Batch validation: pre-validate all selected flows before starting

---

## Bidirectional Sync Architecture

### Stale Detection (Forward Drift)

SHA-256 hash comparison between current spec file and hash stored at implementation time.

**Triggers:** Project load, flow save, git pull.

**What user sees:**
- L2: Warning badge `⚠ spec changed — 2 updates`
- L3: Banner with human-readable change list + actions: `[▶ Update code] [View diff] [Dismiss]`

**Spec cache:** At implementation time, spec is cached to `.ddd/cache/specs-at-implementation/{domain}--{flow}.yaml` for accurate diffs later.

### Reverse Drift Detection (3 Layers)

**Layer 1 — Implementation Report:** Claude Code outputs `## Implementation Notes` after implementing, with deviations, additions, ambiguities resolved, and schema changes. Parsed into annotations.

**Layer 2 — Code→Spec Reconciliation:** DDD Tool compares generated code against flow spec. Shows matching items, code-has-but-spec-doesn't, spec-has-but-code-doesn't. Actions: Accept into spec / Remove from code / Ignore.

**Layer 3 — Sync Score:**

| Score | Meaning | Badge |
|-------|---------|-------|
| 100% | Code matches spec exactly | ✓ (green) |
| 80-99% | Minor additions | ~ (yellow) |
| 50-79% | Significant divergence | ⚠ (amber) |
| < 50% | Code barely resembles spec | ✗ (red) |

### Reconciliation Panel

Shows all drift items with flow key, previous hash, current hash. Actions: accept (update hash), reimpl (copy `/ddd-implement` to clipboard), ignore (add to ignoredDrifts). Batch action available. Reports saved to `.ddd/reconciliations/{timestamp}.json`.

### Sync Score Calculation

```
SyncScore {
  total: number of flows
  implemented: flows with entry in mapping
  stale: implemented flows with hash mismatch
  pending: flows not yet implemented
  score: (implemented - stale) / total * 100
}
```

---

## CLAUDE.md Auto-Generation

Generates project-level CLAUDE.md from specs.

### Content Structure
1. Project header (name, description, created date)
2. Tech stack (language, framework, database, ORM, cache)
3. Domains table (name, description, flow count, role)
4. Error codes reference (count, grouped by category)
5. Schemas reference (list, count)
6. Architecture rules (from architecture.yaml)
7. Git workflow notes (from git settings)
8. Implementation status (sync score, flows needing implementation)

### Custom Section Preservation
```
<!-- CUSTOM: Add your own instructions below this line. They won't be overwritten. -->
[User's custom instructions here]
```

### Regeneration Triggers
- New domain created / flow implemented
- Architecture.yaml changed
- User runs `/ddd-sync` or clicks "Regenerate CLAUDE.md"

---

## Error Handling & Recovery

### Severity Levels

| Severity | Behavior |
|----------|----------|
| info | Auto-dismiss after 5 seconds |
| warning | Manual dismiss required |
| error | Manual dismiss, may include recovery action |
| fatal | Modal blocking all actions |

### Error Recovery Table

| Component | Error Type | Recovery |
|-----------|-----------|----------|
| File | Read error | "Retry" / "Skip" |
| File | Write error | "Retry" / "Revert to last" |
| Git | Clone error | Shows stderr, "Browse folder" |
| Git | Commit error | "Retry" / "Revert staging" |
| YAML | Parse error | Shows line number, "Revert to last valid" |
| Canvas | Invalid node | "Delete node" |
| Canvas | Broken connection | "Remove connection" |

### Auto-Save & Crash Recovery

- Writes to `.ddd/autosave/{flow_id}.yaml` every 30s (configurable, debounced)
- NOT written to real spec files during editing
- On crash recovery: detects `.ddd/autosave/` files, modal: "Recover unsaved flows?" → Recover / Discard
- All errors logged to `~/.ddd-tool/logs/ddd-tool.log` with rotation

---

## Keyboard Shortcuts

| Shortcut | Action | Scope |
|----------|--------|-------|
| `Backspace` / `Esc` | Navigate up one level | Breadcrumb (when not in input) |
| `Cmd+Z` | Undo | Canvas (per-flow) |
| `Cmd+Shift+Z` | Redo | Canvas (per-flow) |
| `Cmd+Y` | Redo (alternative) | Canvas (per-flow) |
| `Cmd+K` | Open search palette | App-level |
| `Cmd+R` | Reload project from disk | App-level |
| `Cmd+Shift+M` | Toggle minimap | Canvas (L3 only) |
| `Cmd+Shift+L` | Toggle project lock | App-level |
| `Enter` | Confirm inline edit | Node name editing |
| `Esc` | Cancel inline edit | Node name editing |
| Double-click | Navigate into entity | Domain/flow blocks, portals, sub-flows |
| Right-click | Context menu | Entity blocks, canvas background |

---

## Spec Panel — KNOWN_KEYS Concept

Each node type has a set of "known" (standard) spec fields. The ExtraFieldsEditor pattern:

1. Standard fields rendered first by typed spec editor component
2. Custom fields: any spec key NOT in `KNOWN_KEYS[type]` shown in collapsible "Additional Fields" section
3. Users can add arbitrary key-value custom fields
4. AI-generated non-standard fields are preserved and editable

This makes all node specs extensible — the UI handles known fields with typed controls, and unknown fields with a generic key-value editor.

---

## Flow Templates

Pre-built flow templates creating fully wired node graphs.

**Traditional:**

| Template | Nodes | Description |
|----------|-------|-------------|
| REST API Endpoint | 5 | Trigger → Input → Process → Terminal (success/error) |
| CRUD Entity | 6 | Trigger → Input → Decision → Data Store → Terminal |
| Webhook Handler | 5 | Trigger → Input → Process → Service Call → Terminal |
| Event Processor | 5 | Trigger → Event (consume) → Process → Event (emit) → Terminal |
| Cached API Call | 7 | Trigger → Input → Cache (hit→Transform→Terminal, miss→Service Call→Terminal) |
| Collection Processing | 5 | Trigger → Loop → Collection (filter) → Event (emit) → Terminal |
| Data Import with Parsing | 6 | Trigger → Service Call → Parse → Collection (deduplicate) → Data Store → Terminal |

**Agent:**

| Template | Nodes | Description |
|----------|-------|-------------|
| RAG Agent | 5 | Guardrail → Agent Loop (retrieval + answer) → Guardrail → Terminal |
| Customer Support Agent | 5 | Guardrail → Agent Loop (ticket tools) → Human Gate → Terminal |
| Code Review Agent | 3 | Trigger → Agent Loop (code analysis + diff) → Terminal |
| Data Pipeline Agent | 3 | Trigger → Agent Loop (transform tools) → Terminal |

Each template uses `{type}-{nanoid(8)}` ID convention.

---

## Store Ownership Map

| Store | File | Owns |
|-------|------|------|
| sheet | `src/stores/sheet-store.ts` | Navigation state, breadcrumbs, current level, history |
| flow | `src/stores/flow-store.ts` | Current flow (L3 only), nodes, connections, spec values |
| project | `src/stores/project-store.ts` | Domains, domain configs, schemas, system config |
| ui | `src/stores/ui-store.ts` | UI toggles: minimap, lock state, theme |
| git | `src/stores/git-store.ts` | Git status, staged/unstaged files, commit history |
| implementation | `src/stores/implementation-store.ts` | Drift detection, flow-to-file mappings, sync score, reconciliation |
| app | `src/stores/app-store.ts` | App view (launcher/first-run/project), recent projects, settings, toasts, auto-save |
| undo | `src/stores/undo-store.ts` | Per-flow undo/redo stacks, snapshots, coalescing |
| validation | `src/stores/validation-store.ts` | Validation results (flow/domain/system), implementation gate state |

---

## normalizeFlowDocument()

Bridges external YAML formats (from `/ddd-create`) with internal `FlowDocument` shape. Located in `flow-store.ts`.

| External Format | Internal Format | Notes |
|-----------------|-----------------|-------|
| `target` or `targetId` in connections | `targetNodeId` | Normalizer unifies both |
| `config` or `properties` on node | `spec` | Nested spec object |
| `sourceHandle: "default"` | `undefined` (stripped) | Default handle = unnamed |
| `name` on node | `label` | Rename for consistency |
| `routes[].id` (smart_router) | `rules[].route` | Rename for clarity |
| `entity` or `schema` (data_store) | `model` | Unified model field |
| `event_type` (event) | `event_name` | Renamed for consistency |
| `endpoint` (service_call) | `url` | Renamed for consistency |
| `flow` (sub_flow) | `flow_ref` | Renamed for consistency |
| `prompt` (llm_call) | `prompt_template` | Renamed for consistency |
| Inlined spec fields at top level | Extracted into `spec` object | Deep nest into spec |
| Trigger node inside `nodes[]` | Extracted to top-level `trigger` | Trigger elevated to root |
| Trigger label inferred from spec | `label` set from event/method/path | Auto-generates readable label |
| `branches: 3` (number on parallel) | `branches: ["Branch 0", "Branch 1", "Branch 2"]` | Count → array |
| Missing node `id` | Auto-generated via `nanoid(8)` | Always ensure ID exists |
| Missing node `type` | Defaults to `'process'` | Fallback type |

**Idempotent:** Already-normalized documents pass through unchanged. Safe to call multiple times.

---

## Design Patterns

**HTTP Request/Response Approval:** Use HTTP trigger + decision node, NOT human_gate (which is for async agent workflows).

**Guardrail Execution Model:** Inline and sequential in connection chain, NOT sidecars.

**Error Routing Convention:** `success`/`error` for data_store and service_call, `valid`/`invalid` for input, `true`/`false` for decision.

**Multi-Way Routing:** Use smart_router for 3+ branches (works in traditional flows too).

**Collection Pipeline:** fetch → parse → filter → iterate → reduce → emit using collection, parse, loop nodes.

**Trigger Event Filtering:** Use `filter` field on trigger to filter by payload, eliminating unnecessary decision nodes.

---

## Architecture Decisions

### Do's

1. Focus on visual editing → YAML output (not code generation)
2. Build multi-level navigation early — it's the core UX
3. Support all three flow types (traditional, agent, orchestration) in canvas routing
4. Derive L2 orchestration visuals from flow YAML automatically
5. Cache spec files at implementation time in `.ddd/cache/` for accurate stale diffs
6. Include only referenced schemas in prompts (resolve from `$ref` and `data_store` model)
7. Preserve `<!-- CUSTOM -->` section when regenerating CLAUDE.md
8. Always include Implementation Report instruction in prompts
9. Store accepted deviations in mapping.yaml to prevent re-triggering drift warnings
10. Derive tests deterministically from graph (DFS path enumeration), not via LLM
11. Use `structuredClone` for undo snapshots — shallow copies corrupt history
12. Coalesce undo snapshots for rapid keystrokes (< 500ms same field)
13. Launch to Project Launcher, not directly into canvas
14. Validate project folders on open — check for `specs/system.yaml` or `.ddd/config.yaml`
15. Prune recent projects on load — remove entries where folder no longer exists
16. Show first-run wizard only once — set flag in settings.json
17. Debounce flow validation (500ms) — validating on every keystroke lags canvas
18. Re-run system validation after git pull
19. Update system.yaml atomically with domain directory operations
20. Update all cross-domain references when renaming a domain
21. Warn users when changing flow type will lose type-specific data
22. Reload full project after entity CRUD — partial state updates are error-prone

### Don'ts

1. Don't build code generation in MVP
2. Don't build MCP server (use Git for sync)
3. Don't try to run/test agents in DDD Tool — just design them
4. Don't auto-commit after Claude Code finishes — user must review first
5. Don't run Claude Code in headless/non-interactive mode
6. Don't auto-accept reconciliation items without user review
7. Don't modify derived test assertions in Claude Code prompt
8. Don't store raw API keys on disk — use env var names or OS keychain
9. Don't auto-save directly to spec files — write to `.ddd/autosave/`
10. Don't include undo/redo for side-effects (git, file writes)
11. Don't block canvas while validation runs — validate async
12. Don't allow renaming domain/flow to existing name
13. Don't silently delete domains with flows — show confirmation with flow count
14. Don't allow moving flow to its current domain

---

## Technical Decisions

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Sync mechanism | Git-based | MCP real-time | No state duplication, versioning for free, no infrastructure |
| Spec format | YAML | JSON, custom DSL | Human-readable, Git-friendly diffs, supports comments |
| Desktop framework | Tauri | Electron | Smaller bundle, better performance, Rust backend, libgit2 |
| Spec-code mapping | Explicit `.ddd/mapping.yaml` | Convention-based | Allows code restructuring without breaking sync |

---

## Implementation Patterns

### Node Type → Code Artifact Mapping

| Node Type | Primary Artifact | Secondary Artifacts |
|-----------|-----------------|---------------------|
| `trigger` (http) | Route handler / controller | Auth middleware, rate limiter |
| `trigger` (cron) | Scheduled job definition | — |
| `trigger` (event) | Event listener / subscriber | — |
| `input` | Zod/Pydantic validation schema | Request type |
| `process` | Service function | — |
| `decision` | Conditional branch in service | — |
| `terminal` | Response formatter / return | Error response variant |
| `data_store` | Repository / query function | ORM query |
| `service_call` | HTTP client call / SDK wrapper | Retry/timeout config |
| `event` (emit) | Event emitter call | Event type definition |
| `loop` | `for`/`while` block in service | — |
| `parallel` | `Promise.all` / `asyncio.gather` | — |
| `sub_flow` | Imported service function call | — |
| `llm_call` | LLM client call | Prompt template |
| `agent_loop` | Agentic tool-use loop | Tool definitions |
| `guardrail` | Check middleware / validator | — |
| `human_gate` | Async checkpoint + notification | Approval state persistence |
| `orchestrator` | Strategy dispatcher | Per-strategy handler |
| `smart_router` | Routing function | Confidence scorer |
| `handoff` | Context transfer + agent call | — |
| `agent_group` | Parallel/sequential agent runner | — |
| `ipc_call` | Inter-process/service call | Retry config, circuit breaker |
| `delay` | Sleep / timer / throttle | — |
| `cache` | Cache client call | Cache config |
| `transform` | Field mapper / data transformer | — |
| `collection` | Collection operation (filter, sort, group, etc.) | — |
| `parse` | Structured parser (JSON, XML, CSV, etc.) | — |
| `crypto` | Encrypt / decrypt / hash / sign | Key management |
| `batch` | Batch operation runner | Concurrency config |
| `transaction` | Atomic DB transaction block | Rollback handler |

### Service Layer Pattern

- One service file per flow, one exported function per flow
- Internal helpers stay private
- Repository functions shared via `repositories/` directory
- Multiple flows in same domain: group routes into single route file per resource
