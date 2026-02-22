# Design Driven Development Tool — Getting Started

How to use the Design Driven Development Tool to design software visually as flow graphs.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Launcher](#project-launcher)
3. [Three-Level Navigation](#three-level-navigation)
4. [Level 1: System Map](#level-1-system-map)
5. [Level 2: Domain Map](#level-2-domain-map)
6. [Level 3: Flow Canvas](#level-3-flow-canvas)
7. [After Editing in the Canvas — Back to Claude Code](#after-editing-in-the-canvas--back-to-claude-code)
8. [Node Types & Specifications](#node-types--specifications)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Git Integration](#git-integration)
11. [Validation & Error Checking](#validation--error-checking)
12. [Settings](#settings)

---

## Getting Started

### Opening the Application

When you launch DDD Tool, you're presented with the **Project Launcher**, which is the home screen for managing your projects.

### Recommended: Initialize via CLI, Then Open Here

The fastest way to start a DDD project is with the `/ddd-create` command in Claude Code. Describe your software in natural language and it generates the full spec structure — `ddd-project.json`, all domain files, flow skeletons, schemas, and configuration. Then open the project folder in DDD Tool using **Open Existing** to visualize and refine what was generated.

This is the recommended workflow: let AI generate the specs, then use the visual tool to review and adjust.

### Alternative: Create a Project in the Tool

You can also create a project directly in DDD Tool, which gives you a minimal starting structure to build on manually:

1. Click **New Project** button
2. Complete the 3-step wizard:
   - **Basics**: Enter project name, location, description, and optionally initialize a Git repository
   - **Tech Stack**: Specify your implementation language (TypeScript, Python, etc.), framework, database, ORM, and cache technology
   - **Domains**: Define your top-level business domains (you can add more later)
3. Click **Create Project** to generate the project structure

The tool creates a directory with:
- `ddd-project.json` — global project configuration
- `specs/domains/` — domain specification files
- `.ddd/` — tool-specific metadata directory

### Opening an Existing Project

- Click **Open Existing** to browse your filesystem and select a project directory
- Recent projects appear in the **Recent Projects** list with timestamps and quick-delete buttons
- Click a recent project to open it immediately

### Cloning from Git

- Click the **Clone** button (Git icon) to clone a DDD project from a Git repository
- Enter the repository URL and select a local destination

### Settings

- Click **Settings** (gear icon) to configure:
  - **Editor**: Grid snap, auto-save interval, theme (dark/light), font size
  - **Claude Code**: Enable/disable Claude Code integration and configure the command
  - **Git**: Auto-commit message template and branch naming conventions

---

## Project Launcher

### Recent Projects Panel

The launcher displays recently opened projects with:
- **Project name** and path
- **Last opened** timestamp (e.g., "2h ago")
- **Delete button** (appears on hover) to remove from recent list

This list persists locally and is automatically pruned if projects no longer exist on disk.

---

## Three-Level Navigation

DDD Tool uses a **hierarchical 3-level system** to organize and edit your architecture:

```
Level 1: System Map       (all domains and their inter-domain events)
   ↓
Level 2: Domain Map       (flows within a single domain)
   ↓
Level 3: Flow Canvas      (nodes and connections within a single flow)
```

Use the **breadcrumb navigation** at the top to move between levels:
- Click "System" to return to Level 1
- Click a domain name to jump to Level 2 for that domain
- Click a flow name to open it in Level 3
- Press **Escape** to navigate up one level

---

## Level 1: System Map

The **System Map** displays all your project's domains as rectangular blocks and shows event flows between them.

### Canvas Interactions

- **Pan**: Click and drag the canvas background
- **Zoom**: Use the zoom controls (bottom-right corner) or mouse wheel
- **Minimap**: Toggle with **Cmd+Shift+M** to see an overview of your entire system

### Domain Blocks

Each domain block shows:
- Domain name
- Number of flows inside (e.g., "3 flows")
- Validation status indicator (small colored dot in corner)

**Click interactions:**
- **Select**: Click a domain block to select it (highlights with blue border)
- **Drag**: Drag to reposition on the canvas
- **Double-click**: Navigate into the domain (opens Level 2: Domain Map)
- **Right-click**: Open context menu with options to:
  - **Rename** the domain
  - **Edit Events** — manage inter-domain event subscriptions
  - **Delete** the domain (with confirmation)
  - **Connect** — start drawing an event arrow to another domain

### Adding Domains

- Click the **+ (Plus)** button in the bottom-right corner
- In the dialog, enter:
  - **Domain Name** (required)
  - **Description** (optional)
- Click **Create**

To add multiple domains quickly, keep using the + button after creating each one.

### Domain Connections (Events)

Connect domains to show which events flow between them:

1. **Right-click** a domain and select **Connect**, or click the **connection handle** (dot on the domain edge)
2. Drag toward the target domain
3. When you reach another domain, a dialog appears asking you to define the event
4. Enter the **event name**, **source** (where the event originates), and any other details
5. Click **Create**

A colored arrow now points from the source domain to the target, labeled with the event name.

**Edit event connections:**
- Right-click a domain and select **Edit Events** to see all events it publishes or subscribes to
- Add new inter-domain events or remove existing ones

### Auto Layout

Click **Auto Layout** to automatically arrange domains into a grid based on their connectivity. This is useful after adding many domains.

### Other Tools

- **Reload** (bottom-left): Reloads the project from disk. Shortcut: **Cmd+R**
- **Implement**: Copies `/ddd-implement --all` to your clipboard for Claude Code integration
- **CLAUDE.md**: Generates a `CLAUDE.md` file documenting your entire system architecture

### Validation

- Small **validation indicators** (colored dots) appear on domain blocks when issues are detected
- Click the **Validation badge** (top-right toolbar) to open the Validation Panel
- Filter by scope: All, Flow, Domain, or System

---

## Level 2: Domain Map

The **Domain Map** shows all flows within a single domain and their inter-flow relationships.

### Flow Blocks

Each flow block displays:
- Flow name
- Flow type: Traditional or Agent
- Validation status indicator

**Click interactions:**
- **Select**: Click to select (highlights blue)
- **Drag**: Reposition on canvas
- **Double-click**: Open the flow in Level 3 (Flow Canvas)
- **Right-click**: Context menu with:
  - **Navigate** to open in Level 3
  - **Rename** the flow
  - **Duplicate** to create a copy
  - **Move** to move to another domain
  - **Change Type** (Traditional ↔ Agent)
  - **Delete** (with confirmation)
  - **Connect** to start drawing an event arrow

### Portal Nodes

**Portals** represent connections back to other domains. They appear as special nodes showing:
- The domain they point to
- Used for visualizing orchestration and inter-domain handoffs

Click a portal to jump back to that domain.

### Adding Flows

Click the **+ (Plus)** button in the bottom-right:
- Enter **flow name** and **description**
- Choose **flow type**: Traditional (process-oriented) or Agent (multi-turn LLM flows)
- Optionally select a **template** to start from a predefined structure
- Click **Create**

### Flow Connections (Events)

Just like domains, flows can emit and consume events:

1. **Right-click** a flow and select **Connect**, or drag from its edge
2. Point to another flow in the same domain
3. Define the event details in the dialog
4. The event arrow is created

### Agent Flows (Special Visualization)

When a domain contains agent flows:
- **Supervisor arrows** show orchestration relationships
- **Handoff arrows** show agent-to-agent handoffs
- **Agent group boundaries** (dashed boxes) visually group related agents
- These relationships are extracted from the implementation and displayed automatically

### Schemas

If a domain **owns schemas** (databases or data models), a badge appears in the top-right showing which schemas it owns.

### Tools

- **Reload**: Reload from disk (**Cmd+R**)
- **Implement**: Copy `/ddd-implement {domain_id}` to clipboard
- **Auto Layout**: Arrange flows into a grid

---

## Level 3: Flow Canvas

The **Flow Canvas** is where you design the actual workflow logic using nodes and connections.

### Node Toolbar (Left Side)

The toolbar shows all available node types organized by flow type:

**Traditional Flow Nodes:**
- Input, Process, Decision, Terminal
- Data Store, Service Call, IPC Call, Event
- Loop, Parallel, Sub-Flow, LLM Call
- Delay, Cache, Transform, Collection, Parse, Crypto, Batch, Transaction

**Agent Flow Nodes:**
- Agent Loop, Guardrail, Human Gate
- Orchestrator, Smart Router, Handoff
- Agent Group, Terminal

**To add a node:**
1. Click a node type in the toolbar (it highlights)
2. The cursor changes to a crosshair
3. Click on the canvas to place the node
4. The node is created and automatically selected

Nodes have a **Trigger** node (top of flow) that always exists and cannot be deleted. All other nodes can be added, moved, and deleted freely.

### Canvas Interactions

- **Pan**: Click-drag the background
- **Zoom**: Use controls (top-right) or Cmd+Plus/Minus
- **Select node**: Click a node (it highlights with blue border)
- **Deselect**: Click empty canvas
- **Move node**: Drag a selected node

### Connecting Nodes

**Create connections:**
1. Click a node to select it
2. Hover over its edge — a **connection handle** (small circle) appears
3. Click and drag the handle to another node's handle
4. Release to create the connection

**Edit connections:**
- Click an edge/arrow to select it (turns blue)
- The **Connection Editor** panel appears on the right
- Configure:
  - **Data fields** passed along the edge
  - **Behavior** (error handling, conditional paths)
  - **Labels** for the edge (e.g., "success", "error")

**Delete connections:**
- Select an edge and press **Backspace** or **Delete**
- Or right-click and delete via context menu

### Node Specifications (Right Panel)

When you select a node, the **Spec Panel** appears on the right showing:
- **Node icon** and type
- **Node label** (editable — click to rename)
- **Node-type-specific editor** with fields for:
  - Description
  - Configuration (varies by node type)
  - Extra fields (custom metadata)
  - Cross-cutting concerns (observability, security)

**How editing works:** The Spec Panel is a structured form, not raw YAML. Each node type presents its own set of fields — you fill in values, select options, and toggle settings. The tool writes the corresponding YAML to the spec file automatically. You never need to type YAML directly in the tool.

For example, selecting a **Decision** node shows fields for the condition expression, true/false branch labels, and description. Selecting an **LLM Call** node shows fields for model, system prompt, temperature, and input/output variable mappings. The visual form and the YAML spec file stay in sync — edits in either direction are reflected in the other.

- Changes are saved automatically
- Each node type has its own set of configuration options
- Examples:
  - **Decision**: condition, true/false labels
  - **LLM Call**: model, system prompt, temperature
  - **Data Store**: read/write operations, schema reference
  - **Loop**: iterator variable, condition

### Node Validation

A small **colored dot** appears on nodes with validation issues:
- **Red** = Error (must fix before implementation)
- **Yellow** = Warning (should review)
- **Blue** = Info

Click the dot or use the **Validation Panel** to see issue details and suggestions.

### Advanced Features

**Cross-Cutting Concerns:**
- Click the **Observability** or **Security** tabs in the Spec Panel
- Configure monitoring, logging, authentication, encryption per-node

**Sub-Flows:**
- Sub-Flow nodes reference other flows within your domain
- Click "Select Flow" to link to an existing flow

**Agent Groups:**
- In Agent flows, Agent Group nodes act as containers for other nodes
- Drag nodes into an Agent Group to nest them
- Groups help organize complex agent orchestration

### Drift Detection

When you use DDD Tool alongside Claude Code, the tool tracks whether your specs and code are in sync. Each flow can be in one of four drift states:

- **synced** — specs and code match
- **spec_ahead** — you've changed the spec on the canvas but haven't re-run `/ddd-implement` yet
- **code_ahead** — the code has been modified since it was last generated from specs (run `/ddd-reflect` to capture what changed)
- **diverged** — both spec and code have changed independently (run `/ddd-sync` to reconcile)

This is the core feedback loop: edit specs visually → implement → code evolves → reflect wisdom back into specs. The drift state tells you where you are in that cycle.

### Tools & Shortcuts

- **Copy Command**: Copy `/ddd-implement {domain}/{flow}` to clipboard — use this to generate code from the flow you're currently editing
- **Reload**: Reload from disk (**Cmd+R**)
- **Auto Layout**: Arrange nodes top-to-bottom based on connection depth
- **Flow Settings**: Click "Flow Settings" to configure:
  - Flow parameters and inputs
  - Output contract
  - Flow template information

### Minimap & Lock

- **Minimap** (**Cmd+Shift+M**): Toggle overview map in bottom-right corner
- **Lock** (**Cmd+Shift+L**): Prevent accidental changes (grays out edit controls)

---

## After Editing in the Canvas — Back to Claude Code

When you save changes in the canvas, DDD Tool writes the changed spec files to disk and shows a notification with the exact commands to run in Claude Code.

**The iterative loop:**

1. Edit flows, nodes, or domain structure in the canvas
2. Save — the notification panel appears (bottom-right) with the commands to run
3. Copy the commands and paste into your Claude Code session:
   ```
   /ddd-implement
   /ddd-test
   ```
4. `/ddd-implement` reads `.ddd/change-history.yaml` and implements only the specs that changed — no `--all` needed
5. `/ddd-test` runs tests for the code that was just implemented
6. Repeat — go back to the canvas, make more changes

**Why no --all?**

DDD Tool tracks every spec file it saves in `.ddd/change-history.yaml`. `/ddd-implement` reads the pending entries and scopes automatically to only what changed. A project with 50 flows runs the same fast loop as one with 3.

**Escape hatches (if you need them):**

| Command | When to use |
|---------|------------|
| `/ddd-implement --all` | Force full re-implementation of everything |
| `/ddd-implement auth/user-login` | Implement one specific flow by name |
| `/ddd-implement --ignore-history` | Skip change-history, show interactive list |
| `/ddd-sync` | If you edited YAML files directly outside ddd-tool |

**Domain structure changes (L1):**

If you add/remove a domain or change domain-level event wiring, the notification shows three commands instead of two:
```
/ddd-sync
/ddd-implement
/ddd-test
```
Run `/ddd-sync` first so it re-scans the domain structure before implementing.

**Save shortcut:** Press **Cmd+S** at any time to flush the auto-save immediately and record the change. The notification appears as soon as the file is written.

---

## Node Types & Specifications

Each node type has specific configuration options in the Spec Panel:

### Input/Output
- **Input**: Define input fields and validation rules
- **Terminal**: Define output/outcome names
- **Event**: Emit events with payload structure

### Logic
- **Process**: Generic processing step with action description
- **Decision**: Branching with conditions (true/false labels)
- **Transform**: Convert/reshape data between steps
- **Parse**: Extract structured data from text (useful with LLMs)

### Integration
- **Service Call**: Call external HTTP/REST services
- **Data Store**: Read from or write to databases
- **IPC Call**: Call internal process/microservice endpoints
- **Event**: Publish domain events

### Flow Control
- **Loop**: Iterate over collections
- **Parallel**: Execute multiple paths concurrently
- **Sub-Flow**: Call another flow as a subprocess
- **Transaction**: Group operations in a transaction boundary

### AI & Automation
- **LLM Call**: Invoke Claude or other LLMs with prompts
- **Agent Loop**: Multi-turn agentic loop (agent flows only)
- **Guardrail**: Safety checks and constraints
- **Human Gate**: Pause for human approval/input

### Optimization
- **Cache**: Cache results to avoid recomputation
- **Delay**: Introduce delays (rate limiting, backoff)
- **Batch**: Batch operations for efficiency
- **Smart Router**: Conditional routing with circuit breaker support

### Advanced
- **Crypto**: Encrypt/decrypt data
- **Collection**: Aggregate/merge multiple streams
- **Orchestrator**: Coordinate agent sub-flows (agent flows only)
- **Handoff**: Transfer control between agents (agent flows only)
- **Agent Group**: Group agents into logical boundaries (agent flows only)

---

## Keyboard Shortcuts

### Navigation
| Shortcut | Action |
|----------|--------|
| **Cmd+K** | Open Search Palette (find flows, domains) |
| **Escape** | Navigate up one level (or exit to Launcher) |
| **Cmd+R** | Reload project from disk |

### Editing
| Shortcut | Action |
|----------|--------|
| **Cmd+S** | Save current flow immediately (flush auto-save) |
| **Cmd+Z** | Undo |
| **Cmd+Shift+Z** or **Cmd+Y** | Redo |
| **Backspace** / **Delete** | Delete selected node or domain |

### View
| Shortcut | Action |
|----------|--------|
| **Cmd+Shift+M** | Toggle Minimap |
| **Cmd+Shift+L** | Toggle Project Lock |
| **Cmd+Plus** / **Cmd+Minus** | Zoom in/out |

### Other
| Shortcut | Action |
|----------|--------|
| **Escape** (in Validation Panel) | Close Validation Panel |

---

## Git Integration

The **Git Panel** (toggle with the Git button in the top toolbar) provides version control for your project specs.

### Files & Staging

**Staged Files:**
- Files ready to commit
- Click **- (minus)** to unstage individual files
- Click **Unstage All** to unstage everything

**Changes:**
- Unstaged and untracked files
- Click **+ (plus)** to stage a file
- Click **Stage All** to stage all changes

### Committing

1. Enter a **commit message** in the textarea
2. (Optional) Your message can use templates like `DDD: {action} in {flow_id}`
3. Press **Ctrl+Enter** (or **Cmd+Enter** on Mac) or click **Commit**

The panel polls for changes every 10 seconds while open.

### History

Recent commits are listed with:
- Commit message (first line)
- Short commit hash (7 characters)
- Relative time (e.g., "2h ago")

---

## Validation & Error Checking

The **Validation Panel** checks your flows for issues at multiple scopes:

### Opening Validation Panel

- Click the **Validation badge** (shield icon) in the top toolbar
- Or press **Escape** to toggle (if not already open)

### Scope Tabs

- **All**: Every issue across the entire project
- **Flow**: Issues in the currently open flow
- **Domain**: Issues in all flows of the current domain
- **System**: Issues at the system/inter-domain level

### Issue Types

- **Errors** (red): Must fix before implementation
- **Warnings** (orange): Should review for correctness
- **Info** (blue): Optional suggestions

### Actions

- **Copy**: Copy an issue to clipboard
- **Select**: Click "Select" to highlight the problematic node on canvas
- **Copy All**: Copy all issues in current view to clipboard

### Common Issues

- Missing required fields in node specs
- Nodes with no outgoing connections (potential dead-ends)
- Unresolved references (e.g., missing service names)
- Inconsistent data flows between nodes
- Unused nodes or disconnected branches

---

## Settings

Access via the **Settings** button (gear icon) on the Launcher, or **Settings > General** when a project is open.

### Editor Settings

- **Grid Snap**: Snap nodes to grid when dragging
- **Auto-Save Interval**: How often to auto-save (seconds)
- **Theme**: Dark or Light mode
- **Font Size**: Default editor font size

### Claude Code Settings

- **Enable Claude Code**: Toggle integration on/off
- **Command**: The command name (default: `claude`)

When enabled, you can use the `/ddd-implement` command in Claude to generate code based on your flow specs.

### Git Settings

- **Auto-Commit Message**: Template for automatic commits (e.g., `DDD: {action} in {flow_id}`)
- **Branch Naming**: Convention for auto-created branches (e.g., `ddd/{flow_id}`)

### Project vs Global Settings

- **Global** settings apply to all projects
- **Project** settings override globals and are saved to `.ddd/config.yaml`
- Use project settings for team-specific configurations

---

## Tips & Best Practices

1. **Start with domains**: Design your domain boundaries before flows
2. **Use descriptions**: Add descriptions to domains and flows for clarity
3. **Validate early**: Check the Validation Panel frequently during design
4. **Commit often**: Use Git integration to track design changes
5. **Auto-layout**: Use Auto Layout liberally to keep canvases organized
6. **Lock before sharing**: Enable Lock mode before sharing with team members who shouldn't edit
7. **Spec nodes thoroughly**: Complete node specifications before implementing
8. **Review cross-cutting**: Set observability and security specs per-node
9. **Use sub-flows**: Break complex flows into reusable sub-flows
10. **Generate CLAUDE.md**: Use the CLAUDE.md button to auto-document your system for Claude

---

## Troubleshooting

**Project won't load:**
- Check that the project directory still exists
- Try **Reload** (Cmd+R) to resync from disk

**Validation issues won't clear:**
- Ensure all required node fields are filled
- Hover over validation dots to see specific errors
- Check the Validation Panel for detailed suggestions

**Git operations fail:**
- Ensure the project is a valid Git repository
- Click **Refresh** in the Git Panel to update status
- Check file permissions on your project directory

**Changes not saving:**
- Auto-save should work automatically (configurable interval)
- Try **Reload** to ensure you're viewing the latest disk state
- Check that you have write permissions to the project directory

---

## Glossary

- **Domain**: A logical business domain in your system
- **Flow**: A workflow or process within a domain
- **Node**: A single step or operation in a flow
- **Connection**: An arrow linking two nodes
- **Spec**: Configuration/specification for a node
- **Event**: Async message between domains or flows
- **Template**: Predefined flow structure
- **Sub-Flow**: A flow called as a step within another flow
- **Agent Flow**: Multi-turn LLM-driven workflow
- **Traditional Flow**: Sequential process-oriented workflow
