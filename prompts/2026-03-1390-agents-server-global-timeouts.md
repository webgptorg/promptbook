[ ]
[⏳🧭] Allow agents to see and manage timeouts across all their chats

-   *(@@@@ Written by agent)*
-   Overview: Agents can currently set timeouts (scheduled commitments) inside an individual chat but they cannot see or manage timeouts that were created in other chats where the same agent participates. Add a global "My Timeouts" view scoped to the agent that lists, edits, cancels and changes recurrence of all timeouts created for that agent across chats. Administrators should see all agents' timeouts in the Task Manager.
-   Goals:
    -   Make timeouts visible to the owning agent across all chats they interact with.
    -   Allow agents to cancel, pause, edit (next run, recurrence, payload) or extend timeouts from one central UI.
    -   Preserve current semantics: timeouts remain scoped to agent (two different agents' timeouts are independent).
    -   Provide admin-level visibility and control in the Task Manager for troubleshooting and governance.
-   Non-goals:
    -   Cross-agent visibility (agents cannot see other agents' timeouts except admins).
    -   Replacing underlying scheduling engine or changing global scheduling guarantees — focus is on visibility and management UX + API surface.
-   Acceptance criteria:
    -   UI: add a new entry "My timeouts" on the agent profile / control panel which lists all timeouts for that agent with columns: timeout id, originating chat id (and link to chat), owner agent id, status (scheduled/running/paused/cancelled), next run timestamp, recurrence (cron/ISO-interval/@24h), and last run result snippet. Each row supports actions: Edit, Cancel/Pause/Resume, Run now.
    -   Backend: new read APIs for listing agent-scoped timeouts, update API to change timeout properties, delete API to cancel. APIs enforce agent scoped access (agent sees only their timeouts) and admin role sees all. Document endpoints in the PRD.
    -   Data: store timeouts in a central DB table (or extend existing Commitments/timeouts table) with fields: id, agentId, chatId, createdByUserId, status, scheduleSpec, nextRunAt, lastRunAt, payload, metadata. Provide migration snippet (placeholder @@@) if new table is required.
    -   Task Manager: admin UI shows same data with filters by agent, status, chat, and ability to cancel/force-run.
    -   Tests: unit + integration tests covering listing, editing, canceling, and permission checks.
-   Technical notes / implementation hints:
    -   Commitments & timeout-like features are implemented elsewhere in the codebase; see commitments patterns in the project (commitments are located under src/commitments) for integration approach and parsing rules. 
    -   Work with apps/agents-server for backend and front-end changes; database migrations should go into apps/agents-server/src/database/migrations. Use existing prefix_ naming scheme for migration tables. (placeholder @@@ for exact migration SQL)
    -   Ensure backwards compatibility with existing scheduled jobs and with the existing "USE TIMEOUT" commitment implementation (there is an earlier PRD about timeout commitment in prompts/2026-03-0790-agents-server-use-timeout-commitment.md — refer to it when implementing). (placeholder @@@ for link)
-   Files / places to modify:
    -   apps/agents-server/src/pages (add new agent UI pages and route)
    -   apps/agents-server/src/server/api/* (new endpoints for timeouts: GET /api/agents/:id/timeouts, PATCH /api/timeouts/:id, DELETE /api/timeouts/:id, POST /api/timeouts/:id/run)
    -   apps/agents-server/src/database/migrations/@@@ (new migration file to add/alter timeouts table)
    -   apps/agents-server/src/services/scheduler.ts (integration with scheduling engine to update nextRunAt when edits happen)
    -   apps/agents-server/src/components/AgentTimeoutsList/* (React components for list / edit modal)
    -   tests/apps/agents-server/* (unit + e2e tests for APIs and UI)
-   Open questions / placeholders (@@@):
    -   Exact DB table name and whether to extend the existing Commitments table or create a dedicated Timeouts table. @@@
    -   Existing authorization flow for agent-scoped API access: should agent identity be the owning agentId or the user who created the timeout? How to map user sessions to agent identity? @@@
    -   Exact fields to show in UI and the retention policy for lastRun output. @@@
    -   Should editing a recurring timeout update historical runs or only future runs? @@@
-   Rollout plan:
    -   Implement backend APIs + migration behind feature flag.
    -   Implement UI pages in agent profile for early testing with a small group.
    -   Enable admin Task Manager view and validate with sample agents.
    -   Remove feature flag after validation and monitor scheduler metrics.
-   Impact / risks:
    -   Exposing scheduled task payloads may reveal sensitive data — enforce metadata filtering and RBAC; consider redaction for non-admins. @@@
    -   Editing schedules while the scheduler is running may cause race conditions — coordinate with scheduler service to apply atomic updates.

[⏳🧭] Allow agents to see and manage timeouts across all their chats

This commit was done by [Promptbook Agent](https://pavol-hejny.ptbk.io/agents/E1upys74QBME7s/)
