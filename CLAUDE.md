# DDD Tool — Development Context

## Spec Reference
- Full specification: ~/code/DDD/ddd-specification-complete.md
- Implementation guide: ~/code/DDD/ddd-implementation-guide.md
- Templates: ~/code/DDD/templates/

## Tech Stack
- **Framework:** Tauri 2.0 (Rust backend, React frontend)
- **Canvas:** React Flow
- **State:** Zustand
- **UI:** Tailwind CSS + Radix UI
- **Git:** libgit2 (via git2 crate in Rust)

## Implementation Status

### Built
_(nothing yet — Session 1 starts the scaffold)_

### Session Plan

| # | Session | What You'll See When Done | Status |
|---|---------|--------------------------|--------|
| 1 | **Project scaffold + App Shell** | App opens, shows Project Launcher with "New Project" wizard, settings dialog | Pending |
| 2 | **System Map (L1)** | Create a project, see domain blocks on canvas with flow count badges, event arrows | Pending |
| 3 | **Domain Map (L2) + Navigation** | Double-click domain, drill into flow blocks, portals, breadcrumb navigation works | Pending |
| 4 | **Flow Canvas (L3) + Basic Nodes** | Double-click flow, drag-drop 5 node types (trigger, input, process, decision, terminal) | Pending |
| 5 | **Connections + Spec Panel** | Wire nodes together, click a node, right panel shows editable spec fields | Pending |
| 6 | **YAML Save/Load + Git** | Save flow writes YAML to specs/, load project reads specs, Git panel shows status | Pending |
| 7 | **Agent Nodes + Agent Canvas** | Create agent flow, agent loop layout with tools, guardrails, human gate, memory blocks | Pending |
| 8 | **Orchestration Nodes** | Orchestrator, smart router, handoff, agent group nodes with L2 orchestration visuals | Pending |
| 9 | **LLM Design Assistant** | Chat panel, inline assist (right-click), ghost preview with Apply/Discard | Pending |
| 10 | **Project Memory** | Memory panel shows project summary, implementation status, design decisions, flow map | Pending |
| 11 | **Design Validation** | Real-time node indicators (green/amber/red), validation panel, cross-domain wiring checks | Pending |
| 12 | **Claude Code Integration** | Implementation panel with embedded terminal, prompt builder, Implement button with validation gate | Pending |
| 13 | **Test Runner + Test Generation** | Auto-run tests after implementation, derive test cases from flow graph, spec compliance check | Pending |
| 14 | **Reconciliation + Drift Detection** | Stale banners, sync scores, reconciliation report with accept/remove/ignore | Pending |
| 15 | **Production Generators** | Generate OpenAPI, CI/CD pipeline, Dockerfile, docker-compose, K8s manifests from specs | Pending |
| 16 | **First-Run, Settings, Polish** | First-run wizard, settings persistence, error toasts, undo/redo, final bug fixes | Pending |

**Milestone A (Sessions 1-6):** Working flow editor that saves real YAML
**Milestone B (Sessions 7-8):** Agent and orchestration support
**Milestone C (Sessions 9-11):** AI brain and quality gates
**Milestone D (Sessions 12-16):** Implementation, testing, production readiness

## Stores
| Store | File | Owns |
|-------|------|------|
| sheet | src/stores/sheet-store.ts | navigation, breadcrumbs, current level |
| flow | src/stores/flow-store.ts | current flow nodes/connections |
| project | src/stores/project-store.ts | domains, schemas, configs |
| ui | src/stores/ui-store.ts | selection, panel visibility |
| git | src/stores/git-store.ts | git state |
| llm | src/stores/llm-store.ts | chat, ghost nodes, LLM config |
| memory | src/stores/memory-store.ts | project memory layers |
| implementation | src/stores/implementation-store.ts | PTY, queue, test results |
| app | src/stores/app-store.ts | app view, recent projects, settings |
| undo | src/stores/undo-store.ts | per-flow undo/redo stacks |
| validation | src/stores/validation-store.ts | validation results, gate state |

## Conventions
- All Tauri commands in `src-tauri/src/commands/`
- All types in `src/types/`
- All utilities in `src/utils/`
- Component folders match feature area (Canvas/, SpecPanel/, LLMAssistant/, etc.)
- Spec is source of truth — read from ~/code/DDD/ when needed

## Known Issues
_(none yet)_
