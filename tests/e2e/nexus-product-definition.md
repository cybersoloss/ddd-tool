# Nexus — DDD End-to-End Benchmark Product Definition

This document exercises **every feature in the DDD Usage Guide** across all four pillars (Logic, Data, Interface, Infrastructure). Feed it to `/ddd-create --shortfalls` to produce a benchmark project with gap analysis. Every requirement is annotated with the DDD feature it exercises.

**Purpose:** End-to-end validation of the DDD pipeline. After `/ddd-create`, the generated specs should have zero validation errors when opened in the DDD Tool.

---

## App Concept

**Nexus** is an AI-powered content intelligence platform. It ingests content from multiple external sources, runs a multi-agent AI analysis pipeline, routes content through editorial review, then publishes approved content across channels. It includes real-time analytics, user management, notification delivery, and system configuration.

**Tech stack:**
- Language: TypeScript · Runtime: Node.js 20
- Backend: Express 4 · Frontend: Next.js 14
- Database: PostgreSQL 16 · ORM: Prisma
- Cache: Redis 7 · Queue: BullMQ
- Auth: JWT + bcrypt
- UI: shadcn/ui · State: Zustand
- AI providers: Anthropic API (primary), OpenAI API (secondary)
- External: Twitter API (OAuth 1.0a + OAuth2), SendGrid, Google Custom Search, Stripe

---

## DDD Feature Coverage Matrix

Every section below is mapped to Usage Guide features. The matrix is the test contract — if the generated specs contain all rows, the DDD methodology is fully validated.

| Pillar | Feature | Exercised By |
|---|---|---|
| **Logic** | trigger: HTTP | All API flows |
| **Logic** | trigger: cron | 6 scheduled flows |
| **Logic** | trigger: event | All cross-domain event flows |
| **Logic** | trigger: webhook | `ingestion/process-webhook` |
| **Logic** | trigger: ipc | `ingestion/watch-filesystem` |
| **Logic** | trigger: ws | `analytics/stream-live-metrics` (WebSocket push) |
| **Logic** | trigger: sse | `analytics/stream-sse-metrics` (SSE endpoint) |
| **Logic** | trigger: pattern | `monitoring/detect-anomaly` |
| **Logic** | trigger: manual | `editorial/trigger-bulk-reprocess` |
| **Logic** | trigger: timer | `monitoring/health-check` (interval polling) |
| **Logic** | trigger: event_group | `processing/handle-any-content-event` |
| **Logic** | trigger: shortcut | `editorial/quick-approve` (Cmd+Shift+A keyboard shortcut) |
| **Logic** | trigger: ui action | `content/drag-reorder` (drag-drop UI action) |
| **Logic** | node: process | All domains |
| **Logic** | node: decision | All domains |
| **Logic** | node: input | All HTTP flows |
| **Logic** | node: terminal (success/error/redirect) | All flows |
| **Logic** | node: data_store (read/write/update/delete/upsert/create_many/update_many/aggregate) | All domains |
| **Logic** | node: data_store (memory store: get/set/merge/subscribe) | `analytics/stream-live-metrics` |
| **Logic** | node: data_store (filters with required:false) | `content/list-content` |
| **Logic** | node: data_store (safety: strict) | `users/register-user` |
| **Logic** | node: event (emit/consume with dedup_key, target_queue, priority) | All cross-domain flows |
| **Logic** | node: service_call (with oauth1a_config) | `ingestion/monitor-social-feeds` (Twitter OAuth 1.0a) |
| **Logic** | node: service_call (with capture_headers) | `ingestion/fetch-rss-feeds` (capture ETag for conditional fetch) |
| **Logic** | node: service_call (with fallback) | `processing/classify-content` (fallback to secondary AI) |
| **Logic** | node: service_call (with request_config) | `ingestion/scrape-web-content` (stealth HTTP config) |
| **Logic** | node: ipc_call (with result_condition) | `ingestion/watch-filesystem` |
| **Logic** | node: sub_flow (with input/output contract) | `publishing/publish-to-website` |
| **Logic** | node: loop (with break_condition, on_error, accumulate) | `publishing/retry-failed-publish` |
| **Logic** | node: parallel (failure_policy: all_required, merge_strategy: keyed_by_output_key) | `publishing/publish-to-social` |
| **Logic** | node: parallel (failure_policy: best_effort, merge_strategy: collect_success) | `notifications/send-realtime-alert` |
| **Logic** | node: collection (filter, sort, deduplicate, join) | `editorial/list-editorial-queue` |
| **Logic** | node: collection (merge, group_by, aggregate, reduce) | `analytics/query-analytics` |
| **Logic** | node: collection (flatten, first, last) | `processing/summarize-batch` |
| **Logic** | node: parse (rss, html, xml, csv, json, markdown) | All ingestion flows |
| **Logic** | node: transform (schema mode) | `publishing/publish-to-website` |
| **Logic** | node: transform (expression mode) | `analytics/generate-daily-report` |
| **Logic** | node: cache (check/set/invalidate) | `editorial/get-review-stats`, `content/get-content`, `settings/get-settings` |
| **Logic** | node: delay (with strategy) | `publishing/schedule-publication` |
| **Logic** | node: batch (with sub_flow_ref) | `processing/summarize-batch` |
| **Logic** | node: transaction | `editorial/bulk-approve` |
| **Logic** | node: crypto (hash, encrypt, decrypt, generate_key, generate_token) | `users/register-user`, `users/login-user`, `users/manage-api-keys`, `users/generate-session-token` |
| **Logic** | node: llm_call (structured_output with ref, context_sources with transforms) | `processing/classify-content`, `processing/score-quality` |
| **Logic** | node: agent_loop (is_terminal tool) | `processing/fact-check-agent` |
| **Logic** | node: agent_loop (requires_confirmation tool) | `processing/resolve-conflict-agent` |
| **Logic** | node: agent_loop (vector_store memory) | `processing/bias-check-agent` |
| **Logic** | node: agent_loop (conversation_history memory) | `processing/fact-check-agent` |
| **Logic** | node: agent_loop (key_value memory) | `processing/orchestrate-analysis` |
| **Logic** | node: guardrail (input position, checks with action: block/warn/log) | `processing/classify-content` |
| **Logic** | node: guardrail (output position) | `processing/classify-content` |
| **Logic** | node: human_gate (with approval_options + timeout + requires_input) | `editorial/review-content` |
| **Logic** | node: orchestrator (supervisor strategy) | `processing/orchestrate-analysis` |
| **Logic** | node: orchestrator (round_robin strategy) | `notifications/route-notification` |
| **Logic** | node: orchestrator (broadcast strategy) | `processing/analyze-with-agents` |
| **Logic** | node: orchestrator (consensus strategy) | `editorial/ai-consensus-review` |
| **Logic** | node: smart_router (rule-based with fallback_chain) | `publishing/publish-content` |
| **Logic** | node: smart_router (llm_routing with confidence_threshold) | `processing/route-to-specialist` |
| **Logic** | node: smart_router (fallback_chain: skip with fallback_note) | `ingestion/route-by-source-type` |
| **Logic** | node: handoff (transfer mode) | `editorial/escalate-to-senior` |
| **Logic** | node: handoff (consult mode) | `processing/route-to-specialist` |
| **Logic** | node: handoff (collaborate mode) | `editorial/co-author-review` |
| **Logic** | node: agent_group (broadcast coordination) | `processing/analyze-with-agents` |
| **Logic** | node: agent_group (round_robin coordination) | `processing/collaborative-review` |
| **Logic** | node: agent_group (sequential coordination) | `processing/pipeline-agents` |
| **Logic** | node: websocket_broadcast | `analytics/broadcast-metric-update` |
| **Logic** | flow.auth (required: true/false, strategy: jwt/api_key/none) | All HTTP flows |
| **Logic** | flow.contract (inputs/outputs for sub-flows) | `publishing/publish-to-website`, `publishing/publish-to-newsletter` |
| **Logic** | flow.metrics (custom Prometheus counters/histograms) | `ingestion/fetch-rss-feeds`, `processing/classify-content` |
| **Logic** | flow.template + parameters (parameterized flow) | `notifications/send-templated-notification` |
| **Logic** | pattern_governed (cross-cutting pattern reference) | `ingestion/scrape-web-content` (stealth_http) |
| **Logic** | connection.behavior (continue/stop/retry/circuit_break) | `ingestion/monitor-social-feeds`, `publishing/publish-to-social` |
| **Logic** | connection.condition (conditional edge) | `editorial/review-content` (route based on AI score) |
| **Logic** | trigger.filter (event payload filtering) | `processing/classify-content` |
| **Logic** | trigger.debounce_ms | `content/drag-reorder` |
| **Logic** | trigger.job_config (concurrency, timeout, retry, dead_letter) | `ingestion/fetch-rss-feeds` |
| **Logic** | terminal.response_type (json/stream/sse/empty) | `analytics/stream-sse-metrics` (stream), `users/delete-user` (empty) |
| **Data** | schema: all field types (string, number, boolean, date, enum, json, uuid, text, decimal) | `content`, `user`, `analytics-event` schemas |
| **Data** | schema: relationships (has_many, belongs_to, has_one, many_to_many) | `content->content-version`, `user->role`, `content->channel` |
| **Data** | schema: indexes (unique, composite, btree, gin, gist) | `content` (title full-text), `user` (email unique), `analytics-event` (composite) |
| **Data** | schema: seed data (migration, fixture, script types) | `role`, `setting`, `channel` schemas |
| **Data** | schema: soft_delete (deleted_at) | `content`, `user` schemas |
| **Data** | schema: state machine transitions (on_invalid: error) | `content` (draft->review->approved->published->archived) |
| **Data** | schema: inherits (_base) | All schemas inherit base fields |
| **Interface** | ui: stat-card (with trend) | `dashboard` page |
| **Interface** | ui: item-list | `content-feed`, `editorial-queue` pages |
| **Interface** | ui: card-grid (responsive columns) | `sources` page |
| **Interface** | ui: detail-card (with tabs, editable fields) | `content-detail` page |
| **Interface** | ui: chart (line/bar/pie/area/donut) | `analytics` page |
| **Interface** | ui: filter-bar | `content-feed`, `editorial-queue` pages |
| **Interface** | ui: status-bar | `dashboard` page |
| **Interface** | ui: map-view (with markers, routes, realtime) | `analytics/geo-distribution` page section |
| **Interface** | ui: timeline (vertical, with color_when) | `content-detail` page (version history timeline) |
| **Interface** | ui: tree-view (with collapsible, item_actions) | `settings/rule-editor` page (rule hierarchy) |
| **Interface** | ui: markdown-viewer (with copy_button, syntax_highlight) | `content-detail` page (content preview) |
| **Interface** | ui: chat-interface | `editorial/ai-assistant` page section |
| **Interface** | ui: page-header | `editorial-queue` page |
| **Interface** | ui: button-group | All action pages |
| **Interface** | ui: form field: text | All forms |
| **Interface** | ui: form field: number | `general-settings` |
| **Interface** | ui: form field: textarea | `review-panel` (rejection reason) |
| **Interface** | ui: form field: select | All filter forms |
| **Interface** | ui: form field: multi-select | `content-feed` filter |
| **Interface** | ui: form field: search-select (with search_source) | `editorial-queue` (reviewer picker) |
| **Interface** | ui: form field: date | `sources` form |
| **Interface** | ui: form field: datetime | `publishing` schedule form |
| **Interface** | ui: form field: date-range | `analytics` filter |
| **Interface** | ui: form field: toggle | `notification-settings` |
| **Interface** | ui: form field: tag-input (with autocomplete_source) | `sources` form (allowed domains) |
| **Interface** | ui: form field: file | `content-detail` (attach media) |
| **Interface** | ui: form field: color | `sources` form (label color) |
| **Interface** | ui: form field: slider | `general-settings` (quality threshold) |
| **Interface** | ui: form field: markdown | `general-settings` (terms of service) |
| **Interface** | ui: form field: repeating_group (columns, min/max_rows) | `settings/rule-editor` (rule conditions table) |
| **Interface** | ui: form: required_when (conditional required) | `review-panel` (rejection reason required when action=reject) |
| **Interface** | ui: form: options_depends_on (filter/set_default/set_options) | `sources` form (credentials fields depend on platform type) |
| **Interface** | ui: form: visible_when | `notification-settings` (Slack URL visible when Slack toggle is on) |
| **Interface** | ui: form: submit.loading_label, submit.success, submit.error | All forms |
| **Interface** | ui: interaction: bulk-select | `content-feed`, `editorial-queue` pages |
| **Interface** | ui: interaction: inline-edit | `content-detail` page |
| **Interface** | ui: interaction: drag-drop | `sources` page (reorder priority) |
| **Interface** | ui: interaction: reorder | `publishing` queue page |
| **Interface** | ui: state: realtime (WebSocket) | `dashboard`, `analytics`, `editorial-queue` pages |
| **Interface** | ui: state: initial_fetch | All data pages |
| **Interface** | ui: loading: skeleton / spinner / blur | Various pages |
| **Interface** | ui: error: retry-banner / error-page / toast | Various pages |
| **Interface** | ui: refresh: pull-to-refresh / auto-30s / manual | Various pages |
| **Interface** | ui: empty_state (with message, icon, CTA) | All list pages |
| **Interface** | ui: layout types (sidebar, full, centered, split, stacked) | Various pages |
| **Interface** | ui: shared_components | `navigation`, `user-avatar`, `content-card` |
| **Interface** | ui: theme (color_scheme, primary_color, font_family, border_radius) | `pages.yaml` |
| **Infrastructure** | service: web_server | Express API |
| **Infrastructure** | service: worker | BullMQ worker |
| **Infrastructure** | service: datastore (database) | PostgreSQL |
| **Infrastructure** | service: datastore (cache) | Redis |
| **Infrastructure** | service: proxy | Nginx (production) |
| **Infrastructure** | depends_on | worker->database, worker->cache, api->database, api->cache |
| **Infrastructure** | startup_order | database->cache->api->worker |
| **Infrastructure** | dev_command | Per-service dev commands |
| **Infrastructure** | setup | Database migration, Redis flush |
| **Infrastructure** | health_check | Per-service health endpoints |
| **Infrastructure** | deployment (kubernetes) | Production deployment config |
| **Cross-cutting** | pattern: stealth_http | `ingestion/scrape-web-content`, `ingestion/monitor-social-feeds` |
| **Cross-cutting** | pattern: api_key_resolution | `users/manage-api-keys`, all external API flows |
| **Cross-cutting** | pattern: encryption | `users/register-user`, `users/login-user` |
| **Cross-cutting** | pattern: soft_delete | `content/delete-content` |
| **Cross-cutting** | pattern: content_hashing | `ingestion/process-xml-feed` (deduplication) |
| **Cross-cutting** | pattern: error_handling | All external service_call flows |
| **Domain** | domain role: process | ingestion, processing, editorial, publishing, notifications |
| **Domain** | domain role: entity | content, users, analytics, settings |
| **Domain** | domain role: gateway | monitoring (external integrations) |
| **Domain** | domain role: orchestration | processing (multi-agent orchestration) |
| **Domain** | publishes_events with payload schema | All cross-domain events |
| **Domain** | consumes_events with handled_by_flow | All event consumers |
| **Domain** | event_groups (with correlation_key) | `processing/handle-any-content-event` |
| **Domain** | owns_schemas | Each domain declares schema ownership |
| **Domain** | domain.auth (domain-level default) | `users` domain |
| **Domain** | domain.sla_config | `processing` domain (max_latency_ms for AI pipeline) |
| **Domain** | domain.memory_stores | `processing` domain (agent memory topology) |

---

## Logic Pillar — Domains & Flows

### 1. Ingestion (role: process)
Acquires content from all external source types.

- `fetch-rss-feeds` — **trigger: cron** (*/15 with job_config: concurrency 2, timeout 60000), `parse: rss`, `collection: deduplicate`, `service_call` with `capture_headers` (ETag), emit ContentIngested. **flow.metrics:** ingestion_items_total counter. **flow.auth:** not applicable (cron)
- `scrape-web-content` — **trigger: cron** (*/4h), stealth HTTP (`pattern_governed: stealth_http`), `parse: html` with CSS selectors, `service_call` with `request_config` (user_agent rotation, delay), `collection: filter` duplicates. **connection.behavior: retry** on service_call error
- `import-csv-content` — **trigger: HTTP POST**, `input` validation, `parse: csv`, `batch` insert, **flow.auth: { required: true, strategy: api_key }**
- `process-webhook` — **trigger: webhook** (HMAC verified with signature field), `decision` on payload type, `smart_router` to handler
- `process-xml-feed` — **trigger: event** (SourceUpdated with `trigger.filter: source_type === 'xml'`), `parse: xml`, `collection: deduplicate`, `crypto: hash` for content fingerprint
- `monitor-social-feeds` — **trigger: cron** (*/30min), `service_call` Twitter with `oauth1a_config` (all 4 credential fields), `collection: merge` results. **connection.behavior: circuit_break** on repeated failures
- `manual-content-entry` — **trigger: HTTP POST**, `input` validation, `data_store: write` with `safety: strict`, **flow.auth: { required: true, strategy: jwt }**
- `watch-filesystem` — **trigger: ipc** (file_watch), `ipc_call` to file reader with `result_condition`, `parse: csv` or raw text, emit ContentIngested
- `route-by-source-type` — **trigger: event**, `smart_router` rule-based with `fallback_chain: skip` + `fallback_note: "Sources pre-filtered by type from database query"`

### 2. Processing (role: orchestration)
AI-powered analysis pipeline. Covers ALL agent and orchestration variants.

- `classify-content` — **trigger: event** (ContentIngested with `trigger.filter`), `guardrail` (input, checks: [{ type: content_safety, action: block }, { type: pii_detection, action: warn }]), `llm_call` with `structured_output` (ref to shared/types.yaml#ContentCategory) and `context_sources` with transforms (truncate, json_stringify), `guardrail` (output, checks: [{ type: business_rule, action: log }]), emit ContentClassified. **flow.metrics:** classification_duration_ms histogram
- `summarize-batch` — **trigger: cron** (hourly), `data_store: read` unprocessed, `collection: reduce` to batches, `batch` with `sub_flow_ref`, `collection: flatten` results
- `fact-check-agent` — **trigger: event**, `agent_loop` with web-search tool, submit-verdict `is_terminal` tool, `memory: conversation_history` + `memory: key_value`
- `bias-check-agent` — **trigger: event**, `agent_loop` with `memory: vector_store` (embedding_model, similarity_threshold), structured output
- `resolve-conflict-agent` — **trigger: event**, `agent_loop` with `requires_confirmation: true` tool (human approves before action)
- `score-quality` — **trigger: event**, `guardrail` (input), `llm_call`, `guardrail` (output), `data_store: update`
- `orchestrate-analysis` — **trigger: event**, `orchestrator` strategy: **supervisor**, shared `memory: key_value`, `result_merge_strategy: supervisor_picks`, `fallback_chain: [quality-scorer]`
- `analyze-with-agents` — **trigger: event**, `orchestrator` strategy: **broadcast**, `result_merge_strategy: combine`, all agents run in parallel
- `pipeline-agents` — **trigger: event**, `agent_group` coordination: **sequential**, each member enriches result
- `ai-consensus-review` — **trigger: event**, `orchestrator` strategy: **consensus**, `result_merge_strategy: best_of`, 3 AI reviewers vote
- `route-to-specialist` — **trigger: event**, `smart_router` with `llm_routing` (confidence_threshold: 0.7), `handoff` mode: **consult**
- `collaborative-review` — **trigger: event**, `agent_group` coordination: **round_robin**, shared memory
- `handle-any-content-event` — **trigger: event_group** [ContentIngested, ContentUpdated, ContentRestored] with `correlation_key: content_id`, routes to unified handler

### 3. Editorial (role: process)
Human review with async AI assistance.

- `review-content` — **trigger: event** (ContentClassified), `human_gate` with approval_options (approve/reject/escalate/defer), Slack + email notification_channels, 24hr timeout -> escalate, reject option has `requires_input: true`. **connection.condition:** route to fast-track if AI score > 0.9
- `escalate-to-senior` — **trigger: event**, `handoff` mode: **transfer** (fire and forget to senior editor flow)
- `co-author-review` — **trigger: event**, `handoff` mode: **collaborate** (iterative back-and-forth with merge_strategy)
- `assign-reviewer` — **trigger: HTTP POST**, `decision` on workload, `data_store: update_where`, **flow.auth: { required: true, strategy: jwt, roles: [admin, editor] }**
- `list-editorial-queue` — **trigger: HTTP GET**, `collection: filter` + `sort` + `first`/`last` for pagination + `join` (inner join with content), **flow.auth: { required: true, strategy: jwt }**
- `bulk-approve` — **trigger: HTTP POST**, `transaction` wrapping batch `data_store: update_where`, emit events
- `get-review-stats` — **trigger: HTTP GET**, `data_store: aggregate`, `cache: check`/`set`, TTL 5min
- `trigger-bulk-reprocess` — **trigger: manual** (admin UI button), requeue selected content for processing
- `quick-approve` — **trigger: shortcut** (Cmd+Shift+A with `debounce_ms: 300`), approve currently selected content item, `data_store: update`, emit ContentApproved

### 4. Publishing (role: process)
Multi-channel content distribution.

- `publish-content` — **trigger: event** (ContentApproved), `smart_router` (rule-based, `fallback_chain: [default-channel]`) to channel flows, emit ContentPublished
- `publish-to-website` — called as `sub_flow` with `input`/`output` contracts, `transform` schema mode, HTTP POST to CMS. **flow.contract: { inputs: [content_id, format], outputs: [publish_url, published_at] }**
- `publish-to-social` — `parallel` with `failure_policy: all_required`, `merge_strategy: keyed_by_output_key`, Twitter + LinkedIn `service_call`. **connection.behavior: retry** on service_call error
- `publish-to-newsletter` — `sub_flow` with contract, `batch` subscribers, `collection: group_by` subscription tier, SendGrid `service_call`. **flow.contract: { inputs: [content_id, tier], outputs: [sent_count] }**
- `schedule-publication` — **trigger: HTTP POST**, `delay` with `strategy: scheduled`, `min_ms` from target datetime, then trigger publish
- `retry-failed-publish` — **trigger: event** (PublishFailed), `loop` with `break_condition: attempts >= 3`, `on_error: continue`, `accumulate: { field: results, strategy: push }`, exponential `delay`
- `broadcast-metric-update` — **trigger: event** (ContentPublished), `websocket_broadcast` to channel "publishing", event_name "content_published", payload from event data

### 5. Analytics (role: entity)
Real-time and historical reporting.

- `record-event` — **trigger: event**, `input` validation, `data_store: write`, `data_store: update_where` counters
- `query-analytics` — **trigger: HTTP GET**, `collection: group_by` + `aggregate`, `data_store: aggregate`, `cache: check`/`set` 1min TTL, **flow.auth: { required: true, strategy: jwt }**
- `stream-live-metrics` — **trigger: ws** (WebSocket with connection_config: auth, heartbeat 30s), `data_store: memory` (store_type: memory, operation: subscribe), push metrics every 5s
- `stream-sse-metrics` — **trigger: sse** (/api/v1/metrics/stream), `terminal` with `response_type: sse`, real-time metric stream. **flow.auth: { required: true, strategy: jwt }**
- `detect-anomaly` — **trigger: pattern** (threshold breach with group_by: metric_name, threshold: 3, window: 5min), `llm_call` for explanation, emit AlertTriggered
- `generate-daily-report` — **trigger: cron** (daily 2am), `collection: reduce` day's events to stats, `transform` expression mode, `data_store: write`
- `generate-weekly-digest` — **trigger: cron** (Monday 6am), `collection: aggregate`, email via `service_call`
- `broadcast-dashboard-update` — **trigger: event** (any analytics event), `websocket_broadcast` to channel "dashboard", event_name "metric_update"

### 6. Users (role: entity)
Auth and user management.

- `register-user` — **trigger: HTTP POST**, `input` validation, `crypto: hash` password, `crypto: generate_key` for API key, `data_store: write` with `safety: strict`, emit UserRegistered. **flow.auth: { required: false }**
- `login-user` — **trigger: HTTP POST**, `crypto: hash` compare, issue JWT, `crypto: encrypt` refresh token, `cache: set`. **flow.auth: { required: false }**
- `generate-session-token` — **trigger: HTTP POST**, `crypto: generate_token` (output_field: token, encoding: base64url, length: 32), `data_store: write`. **flow.auth: { required: true, strategy: jwt }**
- `manage-api-keys` — **trigger: HTTP CRUD**, `crypto: generate_key`, `crypto: encrypt` for storage, `cache: invalidate`
- `update-user-role` — **trigger: HTTP PATCH**, `decision` on permissions, `data_store: update`, emit RoleChanged
- `list-users` — **trigger: HTTP GET**, `collection: filter` + `sort` + `first`, `data_store: read` with `filters` (optional `required: false` entries), admin only
- `refresh-token` — **trigger: HTTP POST**, `crypto: decrypt` stored token, validate, `crypto: generate_key` new JWT. **flow.auth: { required: false }**
- `delete-user` — **trigger: HTTP DELETE**, soft delete, `terminal` with `response_type: empty`, status 204. **flow.auth: { required: true, strategy: jwt }**

### 7. Content (role: entity)
Central content entity and cross-domain event hub.

- `create-content` — **trigger: HTTP POST**, `data_store: write`, emit ContentCreated
- `get-content` — **trigger: HTTP GET**, `cache: check` -> `data_store: read` with `include` (via for join tables, as for aliasing), `transform` schema mode, `cache: set`
- `update-content` — **trigger: HTTP PATCH**, `data_store: update`, `cache: invalidate`, version `data_store: write`
- `delete-content` — **trigger: HTTP DELETE**, soft delete (`data_store: update` deleted_at), cascade emit ContentDeleted
- `list-content` — **trigger: HTTP GET**, `data_store: read` with `pagination` (cursor-based), `sort` (default + allowed), `filters` (optional entries with `required: false`). **flow.auth: { required: true, strategy: jwt }**
- `drag-reorder` — **trigger: ui:drag-drop** with `debounce_ms: 200`, `data_store: update_many` positions, `websocket_broadcast` to channel "content", event_name "reordered"

### 8. Notifications (role: process)
Multi-channel alert delivery.

- `send-realtime-alert` — **trigger: event**, `parallel` with `failure_policy: best_effort`, `merge_strategy: collect_success`, email + Slack `service_call`
- `send-batch-digest` — **trigger: event**, `collection: filter` pending, `batch` format, `service_call` SendGrid
- `get-notification-preferences` — **trigger: HTTP GET**, `cache: check` preferences, `data_store: read`
- `route-notification` — **trigger: event**, `orchestrator` strategy: **round_robin**, cycles through delivery channels
- `send-templated-notification` — **trigger: event**, **flow.template: true**, **parameters: [channel, template_id, recipient_id]**, `data_store: read` template, `transform` expression mode, `service_call` delivery

### 9. Settings (role: entity)
System configuration.

- `get-settings` — **trigger: HTTP GET**, `cache: check` 10min TTL, `data_store: read`. **flow.auth: { required: true, strategy: jwt }**
- `update-settings` — **trigger: HTTP PATCH**, `input` validation, `data_store: update`, `cache: invalidate`, emit SettingsChanged
- `reset-settings` — **trigger: HTTP POST**, `transaction` wrapping defaults restore, emit SettingsReset
- `manage-rules` — **trigger: HTTP CRUD**, `input` validate rule syntax, `data_store` CRUD

### 10. Monitoring (role: gateway)
Health and anomaly detection.

- `health-check` — **trigger: timer** (every 60000ms), ping all services, `parallel` collect results, `decision` on health, emit HealthStatus
- `detect-anomaly` — **trigger: pattern** (metric threshold breach with group_by, threshold, window), `llm_call` explain anomaly, `handoff` mode: **transfer** to alerting

---

## Data Pillar — Schemas

Each schema must include: field types, relationships, indexes, soft_delete where applicable, seed data where applicable, state machine transitions where applicable, and `inherits: _base`.

### _base (base model)
- Fields: `id` (uuid, primary key), `created_at` (date, auto), `updated_at` (date, auto)

### content (inherits: _base)
- Fields: `title` (string), `body` (text), `summary` (text?), `category` (enum: news/opinion/research/other), `status` (enum: draft/review/approved/rejected/published/archived), `quality_score` (decimal?), `bias_score` (decimal?), `source_type` (string), `source_id` (string?), `metadata` (json?), `deleted_at` (date?)
- Relationships: `has_many: content-version`, `has_many: content-rejection`, `belongs_to: content-source`, `many_to_many: channel`
- Indexes: title full-text (gin), composite (status, created_at), unique (source_type, source_id)
- Soft delete: deleted_at
- **State machine transitions:** draft->review, review->approved, review->rejected, approved->published, published->archived, rejected->draft (on_invalid: error)
- Seed: 3 sample content items (fixture)

### user (inherits: _base)
- Fields: `email` (string, unique), `password_hash` (string), `role_id` (uuid), `api_key_hash` (string?), `plan` (enum: free/pro/enterprise), `deleted_at` (date?)
- Relationships: `belongs_to: role`, `has_many: api-key`, `has_many: notification`, `has_one: user-profile`
- Indexes: unique (email), btree (role_id)
- Soft delete: deleted_at

### user-profile (inherits: _base)
- Fields: `user_id` (uuid, unique), `display_name` (string?), `avatar_url` (string?), `bio` (text?), `timezone` (string?)
- Relationships: `belongs_to: user`

### role (inherits: _base)
- Fields: `name` (string), `permissions` (json)
- Seed data (migration): admin, editor, reviewer, viewer roles with permission sets

### api-key (inherits: _base)
- Fields: `user_id` (uuid), `key_hash` (string), `name` (string), `last_used_at` (date?), `expires_at` (date?)
- Relationships: `belongs_to: user`
- Indexes: btree (user_id), btree (expires_at)

### content-source (inherits: _base)
- Fields: `type` (enum: rss/web/csv/webhook/social/filesystem), `name` (string), `url` (string?), `config` (json), `last_synced_at` (date?), `enabled` (boolean)
- Indexes: btree (type), btree (enabled)
- Seed data (fixture): 2 sample RSS sources, 1 webhook source

### content-version (inherits: _base)
- Fields: `content_id` (uuid), `body_snapshot` (text), `changed_by` (uuid), `change_summary` (string?), `changed_at` (date)
- Relationships: `belongs_to: content`, `belongs_to: user` (as changed_by)
- Indexes: composite (content_id, changed_at)

### content-rejection (inherits: _base)
- Fields: `content_id` (uuid), `reason` (text), `rejected_by` (uuid), `rejected_at` (date)
- Relationships: `belongs_to: content`, `belongs_to: user`

### analytics-event (inherits: _base)
- Fields: `event_type` (string), `entity_id` (uuid?), `entity_type` (string?), `actor_id` (uuid?), `metadata` (json?), `occurred_at` (date)
- Indexes: composite (event_type, occurred_at) btree, btree (entity_id), gin (metadata)

### publish-record (inherits: _base)
- Fields: `content_id` (uuid), `channel_id` (uuid), `status` (enum: pending/success/failed), `published_at` (date?), `error` (string?), `attempts` (number)
- Relationships: `belongs_to: content`, `belongs_to: channel`
- **State machine transitions:** pending->success, pending->failed, failed->pending (retry)

### channel (inherits: _base)
- Fields: `name` (string), `type` (enum: website/twitter/linkedin/newsletter/webhook), `config` (json), `enabled` (boolean)
- Indexes: unique (name)
- Seed data (migration): website, newsletter, twitter channels

### schedule (inherits: _base)
- Fields: `content_id` (uuid), `publish_at` (date), `channel_id` (uuid), `created_by` (uuid), `status` (enum: pending/executed/cancelled)
- Relationships: `belongs_to: content`, `belongs_to: channel`
- Indexes: btree (publish_at), composite (status, publish_at)
- **State machine transitions:** pending->executed, pending->cancelled

### notification (inherits: _base)
- Fields: `user_id` (uuid), `type` (string), `title` (string), `body` (text), `read` (boolean), `created_at` (date)
- Relationships: `belongs_to: user`
- Indexes: composite (user_id, read), btree (created_at)

### setting (inherits: _base)
- Fields: `key` (string, unique), `value` (json), `updated_at` (date)
- Indexes: unique (key)
- Seed data (script): default system settings

### rule (inherits: _base)
- Fields: `type` (enum: ingestion/routing/publishing), `condition` (json), `action` (json), `priority` (number), `enabled` (boolean)
- Indexes: composite (type, enabled, priority)

### weekly-digest (inherits: _base)
- Fields: `period_start` (date), `period_end` (date), `stats` (json), `generated_at` (date)

---

## Interface Pillar — UI Pages

Every page must specify sections (with component types), forms (with field types), state (store/initial_fetch/realtime), interactions, loading/error/refresh states, and layout.

### dashboard (layout: sidebar)
- Components: `stat-card` (content ingested/processed/published today, with `trend`), `chart` (chart_type: area, hourly ingestion rate), `item-list` (recent alerts), `status-bar` (pipeline health)
- State: `realtime: true` (WebSocket updates), `initial_fetch: [analytics/query-analytics, monitoring/health-check]`
- Loading: `skeleton` · Error: `retry-banner` · Refresh: `auto-30s`
- Empty state: "No data yet — content will appear as it's ingested"
- Stores: dashboard Zustand store (metrics, alerts)

### content-feed (layout: full)
- Components: `filter-bar` (status/category/date-range), `item-list` (content cards with status badges), `button-group` (bulk actions)
- Form fields (filter form): `search-select` (category, search_source: content/list-categories), `multi-select` (status), `date-range` (created between), `toggle` (show deleted)
- Interactions: `bulk-select` (select all/some), `inline-edit` (quick title edit)
- State: `initial_fetch: [content/list-content]`, store for selection state
- Loading: `skeleton` · Error: `toast` · Refresh: `manual`
- Empty state: "No content found" with icon and "Import content" CTA

### content-detail (layout: split)
- Components: `detail-card` (content body + metadata, with `tabs: [content, analysis, history]`, editable title/category), `timeline` (version history, vertical, with color_when: [approved->green, rejected->red]), `markdown-viewer` (content preview, with copy_button and syntax_highlight), `button-group` (publish/reject/edit actions)
- Form fields (edit form): `text` (title), `textarea` (body), `markdown` (rich body, markdown_config: { mode: split, toolbar: true }), `select` (category), `date` (schedule date), `datetime` (publish at), `file` (attach media)
- Interactions: `inline-edit` (title, category)
- State: `initial_fetch: [content/get-content]`
- Loading: `blur` · Error: `error-page`

### editorial-queue (layout: full)
- Components: `page-header` (queue stats), `filter-bar` (reviewer/status/priority), `item-list` (queued items with AI scores), `chat-interface` (AI assistant sidebar)
- Form fields (filter): `search-select` (reviewer, search_source: users/list-users), `select` (priority), `date` (submitted after), `toggle` (unassigned only)
- Interactions: `bulk-select` (bulk approve/reject), `drag-drop` (reorder priority)
- State: `initial_fetch: [editorial/list-editorial-queue]`, `realtime: true` (new items pushed)
- Loading: `skeleton` · Error: `retry-banner` · Refresh: `pull-to-refresh`
- Empty state: "Queue is empty — all caught up!" with green checkmark icon

### review-panel (layout: split)
- Components: `detail-card` (content + AI analysis side-by-side), `button-group` (approve/reject/escalate/defer), `item-list` (AI findings)
- Form fields: `textarea` (rejection reason, `required_when: { field: action, value: reject }`), `search-select` (escalate to reviewer), `toggle` (notify author)
- State: `initial_fetch: [content/get-content, editorial/get-review-stats]`
- Loading: `spinner` · Error: `toast`

### sources (layout: full)
- Components: `card-grid` (source cards with status, responsive columns: { desktop: 3, tablet: 2, mobile: 1 }), `button-group` (add/edit/disable), `filter-bar` (type/enabled)
- Form fields (add source): `text` (name, url), `select` (type, `options_depends_on: { field: type, transform: set_options }`), `toggle` (enabled), `tag-input` (allowed domains, autocomplete_source: ingestion/list-known-domains), `number` (rate limit), `color` (label color), `text` (credentials, `visible_when: { field: type, value: [social, webhook] }`)
- Interactions: `drag-drop` (reorder fetch priority), `inline-edit` (enable/disable toggle)
- State: `initial_fetch: [ingestion/list-sources]`
- Loading: `skeleton` · Error: `retry-banner`

### publishing (layout: full)
- Components: `item-list` (publishing queue with channel badges), `status-bar` (channel health), `filter-bar` (channel/status)
- Form fields (schedule): `datetime` (publish at), `multi-select` (channels)
- Interactions: `reorder` (publication queue priority), `bulk-select` (retry failed)
- State: `initial_fetch: [publishing/list-queue]`, `realtime: true`
- Loading: `skeleton` · Error: `toast` · Refresh: `auto-30s`

### analytics (layout: sidebar)
- Components: `chart` (chart_type: line, ingestion/processing/publishing time series), `chart` (chart_type: donut, content by category), `filter-bar` (date-range/event-type), `stat-card` (totals), `item-list` (anomaly alerts), `map-view` (geo-distribution of content sources, with markers and realtime: true)
- Form fields: `date-range` (period), `multi-select` (event types), `select` (granularity: hour/day/week)
- State: `initial_fetch: [analytics/query-analytics]`, `realtime: true` (WebSocket live metrics)
- Loading: `skeleton` · Error: `retry-banner` · Refresh: `manual`

### users-admin (layout: full)
- Components: `item-list` (users with role badges), `filter-bar` (role/plan), `page-header` (user counts)
- Form fields (invite user): `text` (email), `select` (role), `select` (plan), `date` (access expires)
- Form: `submit: { loading_label: "Inviting...", success: { message: "User invited", redirect: /users }, error: { message: "Failed to invite", retry: true } }`
- Interactions: `bulk-select` (bulk role change), `inline-edit` (role dropdown)
- State: `initial_fetch: [users/list-users]`
- Loading: `skeleton` · Error: `error-page`

### general-settings (layout: centered)
- Components: `detail-card` (settings form sections)
- Form fields: `text` (app name, support email), `number` (rate limits, batch sizes), `toggle` (feature flags), `select` (timezone, language), `slider` (quality threshold 0-100), `color` (brand color), `markdown` (terms of service, markdown_config: { mode: toggle, min_height: 200 })
- State: `initial_fetch: [settings/get-settings]`
- Loading: `spinner` · Error: `toast`

### notification-settings (layout: centered)
- Components: `detail-card` (channel preferences), `item-list` (notification history)
- Form fields: `toggle` (email on/off, Slack on/off), `multi-select` (event types to notify), `select` (digest frequency), `text` (Slack webhook URL, `visible_when: { field: slack_enabled, value: true }`)
- State: `initial_fetch: [notifications/get-notification-preferences]`

### api-key-management (layout: full)
- Components: `item-list` (active keys with last-used), `button-group` (create/revoke)
- Form fields (create key): `text` (name), `date` (expires at), `multi-select` (allowed scopes), `tag-input` (IP allowlist)
- State: `initial_fetch: [users/manage-api-keys]`

### rule-editor (layout: split)
- Components: `tree-view` (rule hierarchy, collapsible: true, default_expanded_depth: 2, item_actions: [edit, delete, toggle]), `detail-card` (selected rule editor)
- Form fields: `select` (rule type), `repeating_group` (conditions, columns: [field, operator, value], min_rows: 1, max_rows: 10, add_label: "Add condition"), `select` (action), `number` (priority), `toggle` (enabled)
- State: `initial_fetch: [settings/manage-rules]`

---

## Infrastructure Pillar

### Services

- `api` — type: server, framework: Express 4, port: 3001, dev_command: `npm run dev:api`, depends_on: [postgres, redis], health_check: GET /health
- `worker` — type: worker, framework: BullMQ, dev_command: `npm run dev:worker`, depends_on: [postgres, redis], health_check: BullMQ dashboard
- `frontend` — type: server, framework: Next.js 14, port: 3000, dev_command: `npm run dev:frontend`, depends_on: [api]
- `postgres` — type: datastore, engine: PostgreSQL 16, port: 5432, dev_command: `brew services start postgresql@16`, setup: `npx prisma migrate dev`, health_check: `pg_isready`
- `redis` — type: datastore, engine: Redis 7, port: 6379, dev_command: `brew services start redis`, setup: `redis-cli flushall`, health_check: `redis-cli ping`
- `nginx` — type: proxy, port: 80, dev_command: none (production only), depends_on: [api, frontend]

### startup_order
postgres -> redis -> api -> worker -> frontend

### deployment
Strategy: kubernetes (production), docker-compose (development)

---

## Cross-Cutting Patterns (architecture.yaml)

All 6 patterns must be defined in `architecture.yaml` with `used_by_domains` and `convention`:

- `stealth_http` — rotate User-Agent, randomized delays (delayMin: 1000, delayMax: 3000), respect robots.txt — used_by: [ingestion]
- `api_key_resolution` — check header -> query param -> env var -> error — used_by: [users, ingestion, processing]
- `encryption` — AES-256 for tokens, bcrypt for passwords, SHA-256 for content hashes — used_by: [users]
- `soft_delete` — filter `deletedAt: null` on all reads — used_by: [content, users]
- `content_hashing` — SHA-256 of (source_id + source_type) for deduplication — used_by: [ingestion]
- `error_handling` — retry 3x exponential, circuit breaker at 5 failures/minute — used_by: [ingestion, publishing, notifications]

---

## Domain Events (with payload schemas)

| Event | Published By | Consumed By | Key Payload Fields |
|---|---|---|---|
| ContentIngested | ingestion | processing | content_id, source_type, raw_url, ingested_at |
| ContentClassified | processing | editorial | content_id, category, confidence, quality_score |
| ContentApproved | editorial | publishing, analytics | content_id, approved_by, approved_at |
| ContentRejected | editorial | content, analytics, notifications | content_id, reason, rejected_by |
| ContentPublished | publishing | analytics, notifications | content_id, channel_ids, published_at |
| ContentUpdated | content | processing | content_id, changed_fields, updated_by |
| ContentRestored | content | processing | content_id, restored_by |
| PublishFailed | publishing | publishing | content_id, channel_id, error, attempts |
| UserRegistered | users | notifications | user_id, email, plan |
| RoleChanged | users | analytics | user_id, old_role, new_role, changed_by |
| SettingsChanged | settings | all domains | key, old_value, new_value |
| SettingsReset | settings | all domains | reset_by, reset_at |
| AlertTriggered | monitoring | notifications | alert_type, metric, threshold, current_value |
| HealthStatus | monitoring | analytics | status, services, checked_at |
| SourceUpdated | ingestion | ingestion | source_id, source_type, update_type |

---

## Node Type + Trigger Type Checklist

Use this as the test contract when scoring generated specs.

**Trigger types (13):**
- [ ] HTTP · [ ] cron · [ ] event · [ ] webhook · [ ] ipc · [ ] ws · [ ] sse · [ ] pattern · [ ] manual · [ ] timer · [ ] event_group · [ ] shortcut · [ ] ui action

**Node types (29):**
- [ ] trigger · [ ] input · [ ] process · [ ] decision · [ ] terminal
- [ ] data_store (read/write/update/delete/upsert/create_many/update_many/aggregate/memory)
- [ ] service_call (with oauth1a_config, capture_headers, fallback, request_config) · [ ] ipc_call (with result_condition) · [ ] event (emit/consume with dedup_key) · [ ] sub_flow (with contract)
- [ ] loop (with break_condition, on_error, accumulate) · [ ] parallel (all_required + best_effort, merge_strategy variants)
- [ ] collection (filter/sort/deduplicate/merge/group_by/aggregate/reduce/flatten/first/last/join)
- [ ] parse (rss/html/xml/csv/json/markdown) · [ ] transform (schema + expression modes)
- [ ] cache (check/set/invalidate) · [ ] delay (with strategy) · [ ] batch (with sub_flow_ref) · [ ] transaction · [ ] crypto (hash/encrypt/decrypt/generate_key/generate_token)
- [ ] llm_call (structured_output with ref, context_sources with transforms)
- [ ] agent_loop (is_terminal + requires_confirmation + all 3 memory types)
- [ ] guardrail (input + output positions, checks with block/warn/log actions)
- [ ] human_gate (with approval_options + timeout + requires_input)
- [ ] orchestrator (supervisor + round_robin + broadcast + consensus, with fallback_chain + result_merge_strategy)
- [ ] smart_router (rule-based + llm_routing, fallback_chain + fallback_chain:skip)
- [ ] handoff (transfer + consult + collaborate, with merge_strategy)
- [ ] agent_group (broadcast + round_robin + sequential)
- [ ] websocket_broadcast

**Flow-level features:**
- [ ] flow.auth (required true/false, strategy jwt/api_key/none, roles) · [ ] flow.contract · [ ] flow.metrics · [ ] flow.template + parameters
- [ ] pattern_governed · [ ] connection.behavior (continue/stop/retry/circuit_break) · [ ] connection.condition
- [ ] trigger.filter · [ ] trigger.debounce_ms · [ ] trigger.job_config · [ ] trigger.signature (webhook)
- [ ] terminal.response_type (json/stream/sse/empty)

**Schema features:**
- [ ] All field types · [ ] inherits (_base) · [ ] has_many · [ ] belongs_to · [ ] has_one · [ ] many_to_many
- [ ] Indexes (unique/composite/btree/gin/gist) · [ ] Seed data (migration/fixture/script) · [ ] Soft delete · [ ] State machine transitions (on_invalid)

**UI features:**
- [ ] All 14 component types (stat-card, item-list, card-grid, detail-card, chart, filter-bar, status-bar, page-header, button-group, map-view, timeline, tree-view, markdown-viewer, chat-interface)
- [ ] All 16 form field types (text, number, textarea, select, multi-select, search-select, date, datetime, date-range, toggle, tag-input, file, color, slider, markdown, repeating_group)
- [ ] required_when · [ ] visible_when · [ ] options_depends_on · [ ] search_source · [ ] autocomplete_source
- [ ] submit (loading_label, success, error)
- [ ] bulk-select · [ ] inline-edit · [ ] drag-drop · [ ] reorder
- [ ] realtime (WebSocket) · [ ] initial_fetch
- [ ] loading (skeleton/spinner/blur) · [ ] error (retry-banner/error-page/toast) · [ ] refresh (pull-to-refresh/auto-30s/manual)
- [ ] empty_state (message, icon, CTA) · [ ] layout types (sidebar/full/centered/split/stacked) · [ ] shared_components · [ ] theme

**Infrastructure:**
- [ ] server · [ ] worker · [ ] datastore (db + cache) · [ ] proxy
- [ ] depends_on · [ ] startup_order · [ ] dev_command · [ ] setup · [ ] health_check · [ ] deployment

**Cross-cutting patterns:**
- [ ] stealth_http · [ ] api_key_resolution · [ ] encryption · [ ] soft_delete · [ ] content_hashing · [ ] error_handling

**Domain features:**
- [ ] process role · [ ] entity role · [ ] gateway role · [ ] orchestration role
- [ ] publishes_events with payload · [ ] consumes_events with handled_by_flow · [ ] event_groups (with correlation_key)
- [ ] owns_schemas · [ ] domain.auth · [ ] domain.sla_config · [ ] domain.memory_stores
