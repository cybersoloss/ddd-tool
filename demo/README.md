# DDD Tool — Web Demo Mode

Run the DDD Tool desktop app in any browser without Tauri, using an in-memory virtual file system and a pre-loaded sample project. Built for automated video recording with Playwright.

## Prerequisites

```bash
# Install project dependencies (from ddd-tool root)
npm install

# Install Playwright browsers (first time only)
npx playwright install chromium
```

## Commands

| Command | What it does |
|---|---|
| `npm run demo:dev` | Start dev server on port 4173 with hot reload. Open `http://localhost:4173` in any browser. |
| `npm run demo:build` | Production build to `dist/`. Embeds mock layer + sample project (~1MB). |
| `npm run demo:preview` | Serve the production build locally for testing. |
| `npm run demo:test` | Run all Playwright demos — quick walkthrough + lifecycle demo. |
| `npm run demo:lifecycle` | Run just the lifecycle demo (terminal + app scenes). |

### Run the demo in a browser

```bash
npm run demo:dev
# Open http://localhost:4173
# Click "expense-scanner" to open — browse domains, flows, nodes
```

### Record demo videos

```bash
# Run all demos (quick walkthrough + lifecycle)
npm run demo:test
# Screenshots: test-results/demo/01-launcher.png ... 07-review-flow.png
# Lifecycle:   test-results/demo/lifecycle-01-title.png ... lifecycle-13-summary.png
# Video:       test-results/demo/.../video.webm

# Run just the lifecycle demo
npm run demo:lifecycle
```

### Build for static hosting

```bash
npm run demo:build
# Output in dist/ — deploy to any static host (Netlify, Vercel, GitHub Pages)
# No server needed, everything runs client-side
```

## How It Works

When `VITE_DEMO_MODE=true`, Vite aliases redirect all `@tauri-apps/*` imports to browser-compatible mocks. The main app source code is untouched — the swap happens entirely at build time.

```
┌─────────────────────────────────────────────────┐
│  React App (src/)                               │
│                                                 │
│  import { invoke } from '@tauri-apps/api/core'  │
│                    │                            │
│         ┌─────────┴──────────┐                  │
│         │  Vite resolves to  │                  │
│         └─────────┬──────────┘                  │
│                   │                             │
│    ┌──────────────┴──────────────┐              │
│    │ Normal build  │ Demo build   │              │
│    │ (Tauri IPC)   │ (VFS mocks)  │              │
│    └───────────────┴─────────────┘              │
└─────────────────────────────────────────────────┘
```

### What gets mocked

| Real module | Mock | Behavior |
|---|---|---|
| `@tauri-apps/api/core` | `mocks/tauri-core.ts` | `invoke()` routes 20 commands to the VFS |
| `@tauri-apps/api/event` | `mocks/tauri-event.ts` | `listen()` is a no-op (no file watcher) |
| `@tauri-apps/api/path` | `mocks/tauri-path.ts` | `homeDir()` returns `/demo` |
| `@tauri-apps/plugin-dialog` | `mocks/tauri-dialog.ts` | `open()` returns the demo project path |

### Virtual File System

`mocks/vfs.ts` provides a `Map<string, string>` that replaces the real file system. Directories are implicit (determined by path prefixes). All 20 Tauri commands work:

- **File ops**: `read_file`, `write_file`, `path_exists`, `create_directory`, `delete_file`, `delete_directory`, `list_directory`, `rename_path`, `append_log`, `watch_directory`
- **Git ops**: `git_status`, `git_log`, `git_stage_file`, `git_unstage_file`, `git_clone`, `git_init`, `git_add_all`, `git_commit` (static returns)
- **Other**: `compute_file_hash`, `run_command`

The VFS is seeded on first import with sample project data from `data/seed-project.ts`.

### Sample Project: AI Expense Scanner

The seed data creates a complete DDD project at `/demo/expense-scanner` with:

- **3 domains**: Expenses, Approvals, Reports
- **5 flows**: scan-receipt (agent), submit-expense, review-expense, process-reimbursement, monthly-summary
- **Event wiring**: ReceiptScanned, ExpenseSubmitted (Expenses → Approvals), ExpenseApproved, ReimbursementProcessed (Approvals → Reports)
- **15+ node types demonstrated**: trigger, input, process, decision, terminal, event, data_store, service_call, guardrail, agent_loop, human_gate, smart_router, transaction, collection, transform
- **Settings**: Pre-configured at `/demo/.ddd-tool/settings.json` (skips first-run wizard)

The app is fully interactive in demo mode — you can create projects, add domains/flows, edit nodes. Changes persist in the VFS for the session but are lost on refresh.

## Playwright Tests

### Quick Walkthrough (`demo.spec.ts`)

Navigates through the expense-scanner project in 7 steps:

| Step | View | Screenshot |
|---|---|---|
| 1 | Launcher with expense-scanner project | `01-launcher.png` |
| 2 | System Map — 3 domains with event arrows | `02-system-map.png` |
| 3 | Expenses Domain — flow blocks | `03-expenses-domain.png` |
| 4 | Scan Receipt Flow — agent flow with guardrail, agent_loop, human_gate | `04-scan-receipt-flow.png` |
| 5 | Node selected — agent_loop spec details visible | `05-node-selected.png` |
| 6 | Approvals Domain — review and reimbursement flows | `06-approvals-domain.png` |
| 7 | Review Expense Flow — smart router with amount-based rules | `07-review-flow.png` |

### Lifecycle Demo (`lifecycle-demo.spec.ts`)

Full DDD lifecycle story alternating terminal and app scenes (~13 scenes):

| # | Type | Scene | Screenshot |
|---|------|-------|------------|
| 1 | Terminal | Title card | `lifecycle-01-title.png` |
| 2 | Terminal | `/ddd-create` output | `lifecycle-02-create.png` |
| 3 | App | System Map — 3 domains | `lifecycle-03-system-map.png` |
| 4 | App | Expenses domain — 2 flows | `lifecycle-04-expenses-domain.png` |
| 5 | App | scan-receipt flow — agent flow | `lifecycle-05-scan-receipt-flow.png` |
| 6 | App | agent_loop node selected | `lifecycle-06-agent-node.png` |
| 7 | Terminal | `/ddd-implement --all` output | `lifecycle-07-implement.png` |
| 8 | Terminal | `/ddd-test --all` results table | `lifecycle-08-test.png` |
| 9 | App | Approvals domain — 2 flows | `lifecycle-09-approvals-domain.png` |
| 10 | App | review-expense flow — smart router | `lifecycle-10-review-flow.png` |
| 11 | Terminal | `/ddd-reflect --all` patterns | `lifecycle-11-reflect.png` |
| 12 | Terminal | `/ddd-sync --verify` conformance | `lifecycle-12-sync.png` |
| 13 | Terminal | Summary — lifecycle complete | `lifecycle-13-summary.png` |

Screenshots are saved to `test-results/demo/`. Video is recorded as WebM.

## Creating Demo Videos

The Playwright tests produce raw materials (WebM video + PNG screenshots). Here's how to turn them into polished demo videos.

### 1. Capture raw footage

```bash
npm run demo:test
```

Output:
- `test-results/demo/*.png` — screenshots (one per step)
- `test-results/demo/.../video.webm` — full walkthrough recording

### 2. Convert WebM to MP4

```bash
# Basic conversion
ffmpeg -i test-results/demo/.../video.webm \
  -c:v libx264 -preset slow -crf 22 demo-walkthrough.mp4

# Slow down for readability (0.5x speed)
ffmpeg -i test-results/demo/.../video.webm \
  -filter:v "setpts=2.0*PTS" -c:v libx264 -preset slow -crf 22 demo-walkthrough-slow.mp4
```

### 3. Create a GIF from screenshots

```bash
# Combine screenshots into a slideshow GIF (2 seconds per frame)
ffmpeg -framerate 0.5 -pattern_type glob -i 'test-results/demo/0*.png' \
  -vf "scale=960:-1:flags=lanczos" -loop 0 demo-slideshow.gif
```

### 4. Add text captions

```bash
# Add a caption to the bottom of a video
ffmpeg -i demo-walkthrough.mp4 \
  -vf "drawtext=text='System Map — 3 domains with event wiring':fontsize=24:fontcolor=white:x=(w-tw)/2:y=h-60:box=1:boxcolor=black@0.6:boxborderw=8" \
  -c:v libx264 -crf 22 demo-with-captions.mp4
```

For per-step captions, create a subtitles file (`demo.srt`) and burn them in:

```bash
ffmpeg -i demo-walkthrough.mp4 -vf subtitles=demo.srt -c:v libx264 -crf 22 demo-subtitled.mp4
```

### 5. Customize the walkthrough

Edit `playwright/demo.spec.ts` to change what the video shows:

- **Add steps** — navigate to more flows, open the spec panel, toggle validation
- **Change pacing** — adjust `waitForTimeout()` values for longer pauses on key views
- **Change viewport** — edit `playwright.config.ts` viewport size (default: 1280x800)
- **Change speed** — adjust `slowMo` in `playwright.config.ts` (default: 100ms)

### 6. Recommended output formats

| Use case | Format | How |
|---|---|---|
| GitHub README | GIF (under 10MB) | Screenshot slideshow or speed up the MP4 |
| GitHub release notes | MP4 | Direct conversion from WebM |
| Social media / X | MP4, max 2:20 | Trim + add captions |
| Documentation site | MP4 or embedded iframe | Deploy demo build, link to live demo |
| Live demo | Static deploy | `npm run demo:build` → deploy `dist/` |

### ffmpeg installation

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

## Directory Structure

```
demo/
├── data/
│   └── seed-project.ts        # Expense-scanner project YAML/JSON embedded as static data
├── mocks/
│   ├── vfs.ts                 # In-memory virtual file system
│   ├── tauri-core.ts          # Mock invoke() — all 20 IPC commands
│   ├── tauri-event.ts         # Mock listen() — no-op
│   ├── tauri-path.ts          # Mock homeDir() — returns /demo
│   └── tauri-dialog.ts        # Mock open() — returns demo project path
├── playwright/
│   ├── playwright.config.ts   # Starts demo dev server, records video
│   ├── demo.spec.ts           # 7-step quick navigation walkthrough
│   ├── lifecycle-demo.spec.ts # 13-scene lifecycle demo (terminal + app)
│   └── terminal.ts            # Terminal HTML renderer for lifecycle scenes
└── README.md
```
