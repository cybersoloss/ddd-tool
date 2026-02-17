# DDD Tool — Development Context

## Spec Reference
- Full specification: `ddd-specification-complete.md` (this repo)
- Implementation guide: `ddd-implementation-guide.md` (this repo)
- Usage Guide (YAML format reference): `~/dev/DDD/DDD-USAGE-GUIDE.md`
- Templates: `~/dev/DDD/templates/`

## Git Remotes (Dual Remote Setup)
- `origin` → github.com/mhcandan/ddd-tool (private, master repo)
- `public` → github.com/cybersoloss/ddd-tool (public mirror)

**Push to both:** `git push-all` — pushes to origin normally, then pushes to public with CLAUDE.md excluded (force-push). CLAUDE.md stays on mhcandan only, never on cybersoloss.

**GitHub accounts:** `mhcandan` (primary dev), `cybersoloss` (public). mhcandan is collaborator on cybersoloss repos — no account switching needed.

**Handle community PRs:**
```bash
gh pr checkout <PR#> --repo cybersoloss/ddd-tool
# review and test locally
git push-all
```

**New Mac setup:** See full instructions in `~/.claude/CLAUDE.md` → "New Mac Setup (complete)". Quick version for this repo only:
```bash
# Prerequisites: Node 20+, Rust (rustup.rs), xcode-select --install
git clone https://github.com/mhcandan/ddd-tool.git
cd ddd-tool && git remote add public https://github.com/cybersoloss/ddd-tool.git
npm install
npm run tauri dev
```

## Tech Stack
- **Framework:** Tauri 2.0 (Rust backend, React frontend)
- **Canvas:** React Flow
- **State:** Zustand
- **UI:** Tailwind CSS + Radix UI
- **Git:** libgit2 (via git2 crate in Rust)

## Implementation Status

### Built
- **Session 1:** Project scaffold + App Shell (Tauri 2.0, React, Zustand, Tailwind, Radix UI, git2)
- **Session 2:** System Map (L1) — domain blocks on canvas, flow count badges, event arrows, breadcrumb navigation, sheet/project stores
- **Session 3:** Domain Map (L2) + Navigation — flow blocks, portals, event arrows, breadcrumb drill-down
- **Session 4:** Flow Canvas (L3) + Basic Nodes — React Flow canvas, 5 node types (trigger/input/process/decision/terminal), drag-drop toolbar, Add Flow dialog, YAML persistence
- **Session 5:** Connections + Spec Panel — edge wiring (onConnect/onEdgesDelete), right-side spec panel with per-type editors, inline label editing, edge styling
- **Session 6:** YAML Save/Load + Git — Git panel (status, staging, unstaging, commit, history), breadcrumb git toggle with change badge, 10s polling
- **Session 7:** Agent Nodes + Agent Canvas — 3 agent node types (AgentLoop, Guardrail, HumanGate), spec editors, agent-specific toolbar, flow type distinction (traditional vs agent)
- **Session 8:** Orchestration Nodes — 4 orchestration nodes (Orchestrator, SmartRouter, Handoff, AgentGroup), dynamic source handles on SmartRouter, orchestration validation rules
- **Session 11:** Design Validation — 20+ validation rules across flow/domain/system scopes, real-time node indicators (NodeValidationDot), ValidationPanel with scope tabs, implementation gate (checkImplementGate)
- **Session 12:** Claude Code Integration — validation gate, ClaudeCode settings UI, spec hash recording to .ddd/mapping.yaml
- **Session 13:** File tracking in FlowMapping
- **Session 14:** Drift Detection — drift detection via hash comparison, stale banners on FlowBlock (L2) and FlowCanvas (L3), reconciliation reports to .ddd/reconciliations/
- **Session 16:** First-Run, Settings, Polish — FirstRunWizard (2-step Claude Code/start), undo/redo store with Cmd+Z/Cmd+Shift+Z, auto-save to .ddd/autosave/, crash recovery dialog, GitSettings commit/branch templates, error toast recovery actions, recent projects pruning, auto-dismiss fix
- **Session 17:** Extended Nodes + Enhancements — 6 new node types (data_store, service_call, event, loop, parallel, sub_flow) with spec editors and validation, validation presets for InputNode, Mermaid diagram generator, flow templates (REST API, CRUD, Webhook, Event Processor), minimap toggle (Cmd+Shift+M), ui-store

### Session Plan

| # | Session | What You'll See When Done | Status |
|---|---------|--------------------------|--------|
| 1 | **Project scaffold + App Shell** | App opens, shows Project Launcher with "New Project" wizard, settings dialog | Done |
| 2 | **System Map (L1)** | Create a project, see domain blocks on canvas with flow count badges, event arrows | Done |
| 3 | **Domain Map (L2) + Navigation** | Double-click domain, drill into flow blocks, portals, breadcrumb navigation works | Done |
| 4 | **Flow Canvas (L3) + Basic Nodes** | Double-click flow, drag-drop 5 node types (trigger, input, process, decision, terminal) | Done |
| 5 | **Connections + Spec Panel** | Wire nodes together, click a node, right panel shows editable spec fields | Done |
| 6 | **YAML Save/Load + Git** | Save flow writes YAML to specs/, load project reads specs, Git panel shows status | Done |
| 7 | **Agent Nodes + Agent Canvas** | Create agent flow, agent loop layout with tools, guardrails, human gate, memory blocks | Done |
| 8 | **Orchestration Nodes** | Orchestrator, smart router, handoff, agent group nodes with L2 orchestration visuals | Done |
| 11 | **Design Validation** | Real-time node indicators (green/amber/red), validation panel, cross-domain wiring checks | Done |
| 12 | **Claude Code Integration** | Validation gate, ClaudeCode settings, spec hash mapping | Done |
| 13 | **File Tracking** | File tracking in FlowMapping | Done |
| 14 | **Drift Detection** | Stale banners, drift detection via hash comparison, reconciliation reports | Done |
| 16 | **First-Run, Settings, Polish** | First-run wizard, settings persistence, error toasts, undo/redo, final bug fixes | Done |
| 17 | **Extended Nodes + Enhancements** | 6 new node types (data_store, service_call, event, loop, parallel, sub_flow), validation presets, Mermaid export, minimap toggle, flow templates | Done |

**Milestone A (Sessions 1-6):** Working flow editor that saves real YAML ✅
**Milestone B (Sessions 7-8):** Agent and orchestration support ✅
**Milestone C (Session 11):** Validation and quality gates ✅
**Milestone D (Sessions 12-14):** Implementation, testing, reconciliation ✅
**Milestone E (Sessions 16-17):** Polish and extended nodes ✅

### Future Sessions
| # | Session | What You'll See When Done |
|---|---------|--------------------------|
| 18 | **Reverse-Engineer from Code** | "Import from Code" wizard: point at a codebase, auto-detect domains/flows/schemas, preview inferred structure, confirm/adjust, generate specs. Brings `/ddd-reverse` functionality into the GUI with interactive domain mapping and flow preview before committing. |

## Stores
| Store | File | Owns |
|-------|------|------|
| sheet | src/stores/sheet-store.ts | navigation, breadcrumbs, current level |
| flow | src/stores/flow-store.ts | current flow nodes/connections |
| project | src/stores/project-store.ts | domains, schemas, configs |
| ui | src/stores/ui-store.ts | minimap visibility, lock state |
| git | src/stores/git-store.ts | git state |
| implementation | src/stores/implementation-store.ts | drift detection, mapping persistence |
| app | src/stores/app-store.ts | app view, recent projects, settings |
| undo | src/stores/undo-store.ts | per-flow undo/redo stacks |
| validation | src/stores/validation-store.ts | validation results, gate state |

## Conventions
- All Tauri commands in `src-tauri/src/commands/`
- All types in `src/types/`
- All utilities in `src/utils/`
- Component folders match feature area (Canvas/, SpecPanel/, FlowCanvas/, etc.)
- Specification + Implementation Guide (this repo) = source of truth for building the DDD Tool
- Usage Guide (`~/dev/DDD/DDD-USAGE-GUIDE.md`) = source of truth for YAML formats and designing DDD projects

## Lessons Learned

### Null Safety
- **Never use bare `as SomeType` casts** on data loaded from YAML. Always use `(value ?? {}) as SomeType` or optional chaining.
- Properties that are guaranteed when created via the UI (`spec`, `connections`, `flow`, `metadata`, `trigger`, `nodes`) can be undefined when loaded from external YAML files.
- **When fixing a pattern that appears across many files, audit the entire codebase for that pattern FIRST, fix everything in one pass, then test.** Do not fix one file at a time — it leads to a frustrating whack-a-mole cycle of crash→fix→new crash→fix.

### External YAML Interoperability
- The DDD Tool's internal format differs from what `/ddd-create` produces. The `normalizeFlowDocument()` function in `flow-store.ts` bridges this gap. When adding new node types or fields, ensure normalization handles both formats.
- Key format differences to remember:
  - Connections: `target` or `targetId` (external) vs `targetNodeId` (internal)
  - Spec location: inlined fields, `config:`, or `properties:` (external) vs `spec:` (internal)
  - Handle names: `sourceHandle: "default"` (external) means unnamed handle (internal `undefined`)
  - Node labels: `name:` (external) vs `label:` (internal)
  - Trigger location: can be inside `nodes[]` (external) vs top-level `trigger:` (internal)
  - Numeric values: `branches: 2` (external number) vs `branches: [...]` (internal array)
- **Node components must accept all handle ID conventions** used in external YAML (e.g., GuardrailNode accepts both `pass`/`block` and `valid`/`invalid`).

## Known Issues
_(none yet)_

## Deferred Features (Guide fields not yet in Tool UI)

These fields exist in the DDD Usage Guide but don't have dedicated UI controls in the DDD Tool yet. Users can still set them via the "Custom Fields" editor on any node. Planned for future sessions.

- **trigger**: `job_config` (queue, concurrency, timeout, retry, dead_letter), `pattern` (event pattern matching)
- **event**: `target_queue`, `priority`, `delay_ms`, `dedup_key` (job queue fields)
- **service_call**: `request_config` (user_agent, delay, cookie_jar, proxy, tls_fingerprint, fallback), `integration` ref
- **Connections**: `data` (field-level data flow documentation), `behavior` (error handling: continue/stop/retry/circuit_break)
- **Flow metadata**: `template` (boolean), `parameters` (parameterized flows), `contract` (sub-flow input/output contract)
- **Layer visibility** (Part D): cross-cutting concern layers shown on canvas
