[x] ~$0.00 an hour by OpenAI Codex `gpt-5.4`

[🧰🧾] Admin dashboard for running chat tasks (server task manager)


-   In administration (Agents Server) add a dashboard page that shows all running / queued background chat-related tasks across all users (not chat transcripts), in one place.
-   The goal is operational visibility: an admin can quickly see what the server is doing right now (similar to a task manager), identify stuck tasks, and understand queue/backlog health.
-   Provide an admin-only route in [Agents Server](apps/agents-server) under the administration / control panel area (exact URL + nav placement in menu
-   Data shown per task row (MVP):
    -   Task id
    -   Type / kind (e.g. chat completion, toolcall, scraping, indexing, etc.) 
    -   Status
    -   Created at, started at, updated at, finished at
    -   Runtime duration (if running) / total duration (if finished)
    -   Priority (if supported)
    -   Attempt / retry count + last error summary (if failed)
    -   Owning user id (and optional email/name if available) but do not show message content
    -   Agent id / agent name (if applicable)
    -   Chat id / conversation id reference (if exists) but do not render chat messages
    -   Worker / node id (if applicable) + queue name (if applicable)
-   UI/UX:
    -   Default view = only non-finished tasks (queued + running + retrying)
    -   Tabs/filters: Running, Queued, Failed (recent), All (time window)
    -   Sort by: started desc (running), created desc (queued)
    -   Auto-refresh / polling with reasonable interval (configurable; default: 3 seconds) + manual refresh button
    -   Fast search by task id / chat id / user id / agent id
    -   Status badges and a compact table optimized for scanning
-   Admin actions (guardrails required):
    -   Cancel task (if cancellation is supported)
    -   Retry failed task (if retry is supported)
    -   Mark as resolved / dismiss from “failed” view (optional)
    -   For destructive actions show confirmation + reason input
-   Security & privacy:
    -   Admin-only (ensure server-side authorization; do not rely only on hiding UI)
    -   Do not display chat itself, this is administrative visibility into task processing, not a chat transcript viewer
-   Observability requirements:
    -   The dashboard must reflect actual queue/worker state, not only client-side pending states
    -   Consider stuck-task detection: highlight tasks running longer than threshold (configurable; default: 5 minutes)
    -   Show counters at top: running count, queued count, failed last 24h count, oldest queued age
-   Implementation notes (adapt to existing architecture):
    -   Identify the existing background job system used by Agents Server
    -   Ensure listing is performant (server-side pagination, indexes if DB-backed)
    -   Prefer reusing existing types/utilities used for chat pending/background status (DRY)
-   Files/areas likely involved:
    -   [Agents Server](apps/agents-server)
    -   Add the changes into the [changelog](changelog/_current-preversion.md)

