# Contributing to the Design Driven Development Tool

Thanks for your interest in contributing to the Design Driven Development Tool!

## How to Contribute

### Reporting Issues

- Use [GitHub Issues](https://github.com/cybersoloss/ddd-tool/issues) to report bugs or suggest features
- Include your OS, app version, and steps to reproduce for bug reports
- Screenshots or screen recordings are very helpful for UI issues

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b fix-drag-glitch`)
3. Make your changes
4. Run `npm run build` to verify TypeScript compiles
5. Submit a pull request with a clear description

### Development Setup

**Prerequisites:** Node.js 20+, Rust (latest stable), platform-specific Tauri dependencies

```bash
# macOS
xcode-select --install

# Clone and run
git clone https://github.com/cybersoloss/ddd-tool.git
cd ddd-tool
npm install
npm run tauri dev
```

See the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/) for Linux and Windows setup.

### Project Structure

```
src/                          # React frontend
  components/
    SystemMap/                # L1 — system overview
    DomainMap/                # L2 — domain map with flow blocks
    FlowCanvas/               # L3 — flow graph editor (React Flow)
      nodes/                  # 28 node type components
    SpecPanel/                # YAML spec editor sidebar
    Validation/               # Validation engine UI
    GitPanel/                 # Git integration
    Navigation/               # Breadcrumb, search, toolbar
  stores/                     # Zustand state management
  types/                      # TypeScript type definitions
  utils/                      # Validators, helpers
src-tauri/                    # Rust backend (Tauri)
  src/
    lib.rs                    # Tauri commands (file I/O, git, hashing)
```

### What We're Looking For

- **Bug fixes** — especially platform-specific issues (Linux, Windows)
- **Node type components** — new node types that match the [DDD Usage Guide](https://github.com/cybersoloss/DDD/blob/main/DDD-USAGE-GUIDE.md) spec
- **UI improvements** — accessibility, keyboard navigation, responsive layout
- **Performance** — canvas rendering with large flow graphs
- **Validation rules** — new checks for spec correctness

### Guidelines

- Follow existing code patterns — Zustand stores, React functional components, Tailwind CSS
- Node components must implement the correct sourceHandle IDs as defined in the Usage Guide
- Keep dependencies minimal — check if existing deps can solve the problem before adding new ones
- No runtime CSS frameworks — use Tailwind utility classes

### Architecture Decisions

- **State:** Zustand (not Redux, not Context) — one store per concern
- **Canvas:** React Flow (@xyflow/react) for the flow graph editor
- **Backend:** Tauri commands for file I/O, git operations, and file hashing
- **Styling:** Tailwind CSS v4 with CSS custom properties for theming

### Related Repos

- **[Design Driven Development](https://github.com/cybersoloss/DDD)** — methodology docs, spec format reference, templates
- **[claude-commands](https://github.com/cybersoloss/claude-commands)** — Claude Code slash commands (`/ddd-create`, `/ddd-implement`, etc.)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.
