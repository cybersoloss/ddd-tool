# DDD Tool — Future Plan

Unimplemented features and planned enhancements. Everything in this document is future work, not yet built.

---

## Session 18: Reverse Engineer from Code

GUI wizard for bringing existing codebases into DDD. Corresponds to the `/ddd-reverse` CLI command.

**Wizard flow:**
1. Point at a codebase directory
2. Auto-detect domains, flows, and schemas from code structure
3. Preview inferred structure — user confirms/adjusts domain mapping and flow names
4. Generate DDD specs from the detected structure

**What it produces:** Full `specs/` directory with system.yaml, domain.yaml files, flow YAML files, and schema YAML files reverse-engineered from existing code.

---

## Extended Node Types (8 remaining)

These node types are defined in the spec but don't have DDD Tool spec editors or canvas components yet:

| Node Type | Icon | Purpose |
|-----------|------|---------|
| Delay | ⏱ | Wait/throttle (fixed or random, strategy: fixed/random/exponential) |
| Cache | ⊟ | Cache lookup with hit/miss branching (key, ttl_ms, store) |
| Transform | ⇌ | Field mapping between schemas (input_schema → output_schema via field_mappings) |
| Collection | ⊞ | Filter, sort, deduplicate, merge, group, aggregate, reduce, flatten |
| Parse | ⊡ | Structured extraction (RSS, Atom, HTML, XML, JSON, CSV, Markdown) |
| Crypto | 🔒 | Encrypt, decrypt, hash, sign, verify, generate key |
| Batch | ▤ | Execute operation template against collection with concurrency control |
| Transaction | ⊛ | Atomic multi-step database operation with rollback on error |

All 8 have validation rules defined (see architecture notes). They need: React Flow canvas components, spec panel editors, toolbar entries, and normalization support in `normalizeFlowDocument()`.

---

## Prompt Builder

Auto-constructs optimal Claude Code prompts from flow specs. Located at `src/utils/prompt-builder.ts`.

**What it does:**
1. Reads spec files in order: architecture.yaml → errors.yaml → referenced schemas → flow.yaml
2. Detects if new implementation or update (checks mapping.yaml)
3. For updates, includes human-readable diff of changes
4. For agent flows, adds agent-specific instructions (tool implementations, guardrails, memory)
5. Resolves referenced schemas automatically (from `$ref` and `data_store` model fields)
6. Includes only relevant error codes
7. Appends Implementation Report instruction (for reverse drift detection)

**User interaction:** ClaudeCommandBox shows generated prompt. User can edit before copying to clipboard.

---

## Test Runner

Structured test execution with result parsing. Configuration in `.ddd/config.yaml`.

**Features:**
- Configurable test command (pytest, jest, go test, cargo test)
- Scoped testing: run only tests relevant to a flow (`tests/**/test_{flow_id}*`)
- Auto-run after implementation (optional)
- Test result display with pass/fail indicators, names, durations, error output
- "Fix failing test" button: sends failing output back to Claude Code with targeted prompt
- Test badges on L2 flow blocks (`✓ 4/4 tests` or `✗ 3/4 tests`)

**Configuration:**
```yaml
# .ddd/config.yaml
testing:
  command: pytest
  args: ["--tb=short", "-q"]
  scoped: true
  scope_pattern: "tests/**/test_{flow_id}*"
  auto_run: true
```

---

## Diagram-Derived Test Generation

Three levels of test generation from flow diagrams.

### Level 1: Test Specification (Path Analysis)

Walks the flow graph (DFS) to enumerate all paths from trigger to terminals. For each decision node, explores both true/false branches. For validation nodes, explores valid/invalid paths.

**Output:** `TestPath` objects with path_id, path_type (happy_path/error_path/edge_case/agent_loop), ordered node IDs, description, expected outcome.

**Boundary tests:** Derived from validation rules — min/max length, format, required, type. Each validation field produces boundary test cases.

**Agent flow tests:** Derived from tools, guardrails, memory, loop behavior.

**Orchestration flow tests:** Derived from routing rules, handoff behavior, supervision strategies.

### Level 2: Test Code Generation

Generates actual test code from the derived test specification.

1. Read Level 1 test spec for the flow
2. Detect test framework from architecture.yaml
3. Generate test code using Claude Code (provides test spec + flow YAML + architecture.yaml testing section)
4. User can edit generated tests before including

Generated tests are appended to the Claude Code implementation prompt:
```
## Pre-Generated Tests
Implement the flow so that ALL these tests pass.
Do NOT modify the test assertions — they reflect the exact spec requirements.
```

### Level 3: Spec Compliance Validation

After implementation and test execution:
1. Read test output and derived test specification
2. Compare expected outcomes (status codes, error messages, response shapes) vs actual results
3. Produce compliance report (e.g., "12/14 compliant — 86%")
4. "Fix via Claude Code" generates targeted prompt for non-compliant items

**Compliance history** stored in `.ddd/mapping.yaml` per flow with score, counts, issues list.

**Configuration:**
```yaml
# .ddd/config.yaml
test_generation:
  auto_derive: true
  include_in_prompt: true
  compliance_check: true
  boundary_tests:
    enabled: true
    include_type_errors: true
    include_null_tests: true
  agent_tests:
    tool_failure: true
    guardrail_violation: true
    max_iterations: true
    memory_persistence: false
  orchestration_tests:
    routing: true
    handoff: true
    circuit_breaker: true
    supervisor: false
```

---

## Production Infrastructure Generation

Auto-generates production artifacts from specs. All regenerate when relevant specs change.

### OpenAPI Generation

Flow specs (HTTP triggers, input fields, terminal responses, error codes) → `openapi.yaml` (OpenAPI 3.0.3).

- One path entry per HTTP-triggered flow
- Request schemas from input node fields (type, required, min/max/format)
- Response schemas from terminal node body shapes
- Error responses from errors.yaml mappings
- Non-HTTP flows excluded; agent flows with HTTP triggers included

### CI/CD Pipeline Generation

architecture.yaml + system.yaml → `.github/workflows/ci.yaml`

- Language setup from system.yaml tech stack
- Service containers from architecture.yaml database/cache config
- Commands from architecture.yaml testing/linting sections
- Spec-code sync validation step (checks mapping hashes)
- Templates for GitHub Actions, GitLab CI

### Database Migration Tracking

Schema specs → migration instructions in Claude Code prompt.

- Schema hashes tracked in `.ddd/mapping.yaml` (like flow stale detection)
- Change detection shows added/removed/changed fields
- "Generate migration" adds migration instructions to prompt (reversible, nullable/defaults)

### Observability

`architecture.yaml` `cross_cutting.observability` section → logging, tracing, metrics, health check infrastructure.

- Structured logging (JSON, configurable fields, sensitive field redaction)
- OpenTelemetry tracing with auto-instrumentation
- Prometheus metrics endpoint with custom business metrics
- Health check endpoints (readiness + liveness)
- Per-flow node logging (entry/exit with duration) — automatic, no developer code needed

### Security Layer

`architecture.yaml` `cross_cutting.security` section → security middleware.

- Rate limiting (global defaults + per-endpoint overrides matching flow IDs)
- CORS middleware
- Security headers (HSTS, CSP, X-Content-Type-Options, etc.)
- Input sanitization (trim, strip HTML, max length)
- Audit logging (configurable events, database/file storage, retention)
- Dependency scanning in CI pipeline

### Deployment / IaC

`architecture.yaml` `deployment` section → Dockerfile, docker-compose, K8s manifests.

- Multi-stage Docker builds
- docker-compose with service dependencies
- Kubernetes: deployment, service, ingress, HPA
- Health check integration from observability config

### Generated Artifacts Summary

| Artifact | Generated From | Output |
|----------|---------------|--------|
| OpenAPI spec | Flow specs + errors.yaml + schemas | `openapi.yaml` |
| CI/CD pipeline | architecture.yaml + system.yaml | `.github/workflows/ci.yaml` |
| DB migrations | Schema specs | `alembic/versions/*.py` |
| Logging config | architecture.yaml observability | `src/shared/logging.py` |
| Tracing setup | architecture.yaml observability | `src/shared/tracing.py` |
| Metrics | architecture.yaml + flow specs | `src/shared/metrics.py` |
| Health checks | architecture.yaml observability | `src/shared/health.py` |
| Rate limiting | architecture.yaml security | `src/shared/rate_limit.py` |
| Security middleware | architecture.yaml security | `src/shared/security.py` |
| Audit logging | architecture.yaml security | `src/shared/audit.py` |
| Dockerfile | architecture.yaml deployment | `Dockerfile` |
| Docker Compose | architecture.yaml deployment | `docker-compose.yaml` |
| K8s manifests | architecture.yaml deployment | `k8s/*.yaml` |

---

## PTY Terminal (Decided Against)

Originally planned as in-app Claude Code terminal (`pty.rs` in Rust backend). **Decision: use Claude Code's own terminal instead.** The cowork workflow (design in DDD → copy command → paste into Claude Code terminal) is simpler and more reliable than embedding a full PTY.

Kept here for reference in case the decision is revisited.

---

## Reusability Levels 4-5

Levels 1-3 (sub-flows, shared components, project templates) are built. Levels 4-5 are future:

### Level 4: Personal Library (Across Projects)

Save patterns for reuse across your own projects:
- Named patterns: `my-jwt-auth`, `my-stripe-checkout`, `my-s3-upload`
- Parameterization for customization
- Linked (get updates from source) or Copied (full control)

### Level 5: Community Library (Global)

Public marketplace:
- Pre-built integrations (Stripe, Auth0, SendGrid)
- Starter templates (SaaS, E-Commerce, API-First)
- Browse, search, import into projects

---

## Nested Container Layout (Loop/Parallel)

The Usage Guide documents a `body_start` field on loop nodes and `parentId` on child nodes for nested layout — child nodes render visually inside the loop/parallel container on the canvas.

**What's needed:**
- Add `body_start` to `LoopSpec` interface and KNOWN_KEYS
- Add `parentId` support to `DddFlowNode` rendering (nodes with `parentId` render inside their parent container)
- Canvas components for loop/parallel that act as expandable containers
- `normalizeFlowDocument()` support for `body_start` field

**Current state:** The `[key: string]: unknown` catch-all preserves `body_start` in spec data, but no UI or canvas rendering exists for it.

---

## Layer Visibility

Cross-cutting concern layers shown as toggleable overlays on the canvas (from DDD Usage Guide Part D).

Define layers in `specs/shared/layers.yaml` (retry policies, stealth config, circuit breakers). Toggle visibility per layer on the canvas to see which nodes are affected by each cross-cutting concern.

---

## Potential Extensions

1. **VS Code Extension:** Spec editing without full desktop app
2. **GitHub Action:** Spec-code sync validation in CI
3. **MCP Server:** Claude Code convenience tools (not for sync — sync uses Git)
4. **Web Version:** Quick viewing/editing without desktop app
5. **API:** Programmatic spec manipulation

---

## Dependency Map

```
Extended Node Types ──────────────────────────────────────────── (independent)
Reverse Engineer (Session 18) ────────────────────────────────── (independent)
Layer Visibility ─────────────────────────────────────────────── (independent)
Prompt Builder ───────────────────────────────────────────────── (independent)
Test Runner ──────────────────────► Diagram-Derived Test Gen ──► Spec Compliance
PTY Terminal (decided against) ────────────────────────────────  (archived)
Production Infrastructure Gen ────────────────────────────────── (independent)
Reusability Levels 4-5 ────────────────────────────────────────  (after core stable)
Extensions (VS Code, GitHub Action, MCP, Web, API) ────────────  (after v1.0)
```

---

## Open Technical Questions

1. How to handle partial implementations?
2. Multi-language support (Python + TypeScript in same project)?
3. Spec inheritance for similar flows?
