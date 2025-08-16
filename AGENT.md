# AGENT.md — TACTIX Project Guidelines
**Tactical Assistance and Collaboration Tool for Incident eXchange**

Read this file **before** you generate code, refactor, or open a PR. It defines the ground rules, architecture, and conventions for AI agents and contributors working in this repository.

Last updated: 2025-08-16 (America/Toronto)

---

## 0) Mission & Priorities
TACTIX is an incident management and collaboration system for tactical operations.

Guiding principles:
- Deliver **small, additive slices**. No mega-PRs. No large deletions without approval.
- Optimize for **operator clarity** under stress: simple workflows, reliable real-time updates.
- **RBAC is managed in-app** (not in LDAP). LDAP is for authentication only.
- Support **EN/FR localization** in the UI for all visible strings.
- Keep services **containerized**, reproducible, and testable in isolation.
- Prefer **transactional correctness** and **auditability** over cleverness.

---

## 1) Current Architecture (target)
- UI: React (+ Tailwind). Panels: Warlog, Quick Warlog Entry, Live Chat, Permissions, (optional) Engineering Chat (ENGNET).
- Gateway: NGINX reverse proxy (REST: /api/*, WS: /rt and others), TLS-terminating.
- Services:
  - incident-svc — Event-sourced incidents + read-model projections, approvals, warlog, search stub.
  - realtime-svc — WebSocket fan-out; bounded queues; snapshot+delta catch-up.
  - tak-ingest-svc — CoT ingest with filters; GeoJSON export.
  - auth-svc — OpenLDAP bind, JWT issuance (RS256), refresh flow.
  - (optional) eng-svc — ENGNET (engineering chat) over NATS; out-of-band, not XMPP.
  - (future) chat-svc — XMPP bridge for operational chat sessions.
- Data:
  - Postgres — primary DB (events, projections, approvals, messages, RBAC tables).
  - MinIO — attachments (future slice).
  - OpenSearch — FTS (future slice).
- Messaging:
  - Phase 1: Postgres LISTEN/NOTIFY for realtime.
  - Phase 2: Redis Streams or NATS JetStream for durability/replay (ENGNET uses NATS).

Do not remove services to “simplify for demos”. Use compose profiles when you need a lighter stack.

---

## 2) Constraints & Non-Goals (current phase)
- No ABAC/classification enforcement yet (RBAC only).
- No CesiumJS integration yet.
- No OpenTelemetry/SLO dashboards yet.
- Keep .npmrc pinned to the public npm registry (avoid 403 errors) and vendor it into Docker builds.
- Do not couple ENGNET to XMPP. ENGNET is independent, unofficial engineering coordination.

---

## 3) Data & Event Model (incident-svc v1)
Tables (projection + append-only events):
- users(user_id, upn, display_name, ad_groups[], created_at)
- incidents(incident_id, title, description, status[draft|pending|approved|active|closed], severity[info|minor|major|critical], last_event_seq, updated_at)
- incident_events(incident_id, seq, event_id, event_type, payload jsonb, actor_upn, idempotency_key, occurred_at)
- approvals(approval_id, incident_id, required_role, state[pending|approved|rejected], decided_by, decided_at)
- attachments(metadata only; MinIO integration later)

Event-sourcing rules:
- All writes: append event → update projection in the **same transaction**.
- Idempotency via header Idempotency-Key for retry-safe mutation endpoints.
- Legal transitions: draft → pending → approved → active → closed; invalid → 409.

---

## 4) Auth & RBAC (current approach)
- Auth: OpenLDAP bind in auth-svc.
- Tokens: RS256 JWT (access ~15m, refresh ~7d). Public key shared with other services.
- App-managed RBAC:
  - Anyone can authenticate (subject to org policy).
  - Default READ: users in AD groups named like OP_<code>_READ|VIEW|ALL.
  - IMO managers: OP_<code>_IMO grant ASSIGN (can manage operation RBAC in-app).
  - Assignments and role_grants tables define per-operation permissions.
- UI must include a Permissions card on the Operation page for ASSIGN users (IMO) to manage assignments and role grants.

---

## 5) Engineering Chat (ENGNET)
- Purpose: out-of-band engineering/coordination between instances on the same network. Not part of operational comms; not dependent on XMPP.
- Transport: NATS (mTLS-ready). Subject format: eng.<orgCode>.<operationCode>.chat.
- Service: eng-svc exposes REST (POST/GET) and WS; persists short-retention messages in eng_messages table.
- UI: separate panel labeled “Engineering Chat (ENGNET) — Unofficial”. Optional “Promote to Warlog” action (manual).

---

## 6) New Message Workflow (operational)
Status: not implemented yet; design intent:
- Compose form: select recipient scope (HIGHER, LOWER, FLANK), target unit, message type, content.
- Save Draft or Submit.
- On Submit: route through chat-svc (XMPP) to selected session, and create a Warlog entry.
- Org tree (operation-scoped) provides valid routing targets.

When you implement it, keep ENGNET separate.

---

## 7) Repository Conventions
- Monorepo with pnpm workspaces. Shared packages live under /packages (e.g., types, authz, lib-db).
- Each service ships its own migrations under services/<name>/migrations and runs migrate up at start or via init job.
- Health endpoint: every service exposes GET /health → { ok: true }.
- Logging: include actor_upn, route, incidentId (where applicable).
- i18n: UI strings must use locale files (react-i18next recommended). Provide EN and FR keys for new UI.

---

## 8) Coding Standards
- TypeScript strict mode on services. ESM modules.
- Validation with zod at API boundaries.
- Keep endpoints small; route handlers delegate to core modules (workflow, dal, search).
- Tests:
  - Unit tests for pure logic (workflow, validators).
  - Light integration tests with Postgres for persistence and transactions.
- Error handling:
  - 400 for validation errors.
  - 401 if no/invalid JWT.
  - 403 if missing role (RBAC).
  - 409 for workflow conflicts (e.g., illegal status transition).
  - 5xx only for unexpected failures.

---

## 9) PR & Commit Rules
- One slice per PR (target: ≤300 LOC diff).
- No mass deletions without explicit approval in the PR description.
- Include:
  - Summary of the slice.
  - Affected services and endpoints.
  - DB migration notes and backward compatibility statement.
  - Test plan and acceptance checklist.
  - Any docs page added/updated under /docs.
- Ensure docker compose up --build succeeds before opening the PR.

---

## 10) Local & Container Build Guardrails
- Root .npmrc must specify the public registry (no auth token for registry.npmjs.org).
- Copy .npmrc into images before running pnpm install.
- Pin Node 20; enable corepack in Docker.
- Provide .env.example for each service. Never commit real secrets.
- Compose profiles are preferred for running subsets; do not remove services for “demo”.

---

## 11) Task Templates (for issues or agent prompts)
Minimal feature slice:
- Title: feat(<service>): <what>
- Goal: one paragraph describing the user-visible outcome.
- Changes:
  - API additions/changes (methods, paths, bodies).
  - DB migrations.
  - Background jobs or message subjects.
  - UI components/strings.
- Acceptance:
  - Preconditions.
  - Step-by-step verification.
  - Expected responses/status codes.
- Non-goals / Follow-ups.

Example (ENGNET POST path):
- Goal: POST /eng/messages publishes to NATS and stores to DB; WS clients see it live.
- Acceptance: Two instances with same ORG_CODE see each other’s messages within ~1s; non-ENG user gets 403.

---

## 12) Docs & ADRs
- New features require a short doc in /docs: purpose, how to enable, env vars, security considerations.
- Decisions that affect architecture get an ADR in /docs/adr (simple: context, decision, consequences).
- Keep docs readable for operators and new engineers.

---

## 13) Security Notes
- JWT: RS256; public key distributed to services; refresh token audience set to “refresh”.
- LDAP: bind-based auth; group mapping for defaults and IMO; RBAC stored in DB.
- ENGNET: restrict by roles (ENG or OP_ADMIN). Prefer mTLS for NATS when moving beyond a single host. Add rate limits for POST endpoints.
- Do not log sensitive credentials. Redact secrets in error logs.

---

## 14) What NOT to do
- Don’t couple ENGNET to XMPP or auto-log ENGNET messages to Warlog.
- Don’t remove services or big chunks of code to “simplify” a slice.
- Don’t merge without healthchecks and compose passing.
- Don’t introduce ABAC/labeling until the RBAC baseline is stable.

---

## 15) Quick Runbook (dev)
- Node/pnpm (host):
    corepack enable
    pnpm -r install
    pnpm -r build
- Containers:
    docker compose up --build
- Health:
    curl http://localhost:<svc>/health
- Tests (example):
    pnpm --filter @tactix/incident-svc test

If installs fail with 403, verify the root .npmrc uses https://registry.npmjs.org/ and that no auth token is applied to that host.

---

## 16) Contacts & Ownership
- Product Owner: (Major Martin Simard)
- Areas:
  - incident-svc (core workflow, RBAC endpoints)
  - realtime-svc (WS fan-out)
  - tak-ingest-svc (CoT)
  - auth-svc (LDAP/JWT)
  - eng-svc (ENGNET)
  - ui (panels, i18n)
  - gateway (NGINX)

Thanks for keeping TACTIX consistent, reliable, and operator-friendly. Build small, ship often, and document as you go.
