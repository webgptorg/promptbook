[ ]

[✨🧂] USE TIMEOUT commitment method (thread-scoped timers)

-   *(@@@@ Written by agent)*
-   Implement new commitment method `USE TIMEOUT` that behaves like `setTimeout` (single argument `milliseconds: number`) and is scoped to a single chat thread (not to the agent globally).
-   When the agent calls `USE TIMEOUT`, the toolcall resolves immediately with a short response like `The timer was set.` and returns a unique `timeoutId` (used only for cancellation + UI).
-   After the timeout elapses, the agent is woken up by injecting a new user-like event/message into the same chat thread, so it continues with full previous context as if the user manually typed at that time.
    -   The injected message should explicitly say it is a timeout wake-up (e.g. `⏱️ Timeout elapsed after 60000ms`) and include `timeoutId`.
    -   The agent should be able to "message itself in the future" by scheduling a timeout and then, on wake-up, continuing work / calling tools / sending emails / committing, etc.
-   Split into two operational categories (same API, different implementation path):
    -   Short-running (seconds–~minutes): can be handled in-process (best effort) but must still be thread-scoped and visible/cancellable in UI.
    -   Long-running (~hours–days): must be persisted in DB and reliably executed even if user reloads, switches devices, or no client is focused.
-   UI requirements:
    -   In the chat thread where the timer is set, show a small persistent indication that one or more timers are active for this thread ("particle" / chip / badge).
    -   Show a list of active timers for the thread (at least: due time / remaining time, created time, timeout duration, timeoutId) with a **Cancel** action.
    -   User can cancel timers (idempotent cancel); user cannot edit/update existing timers.
    -   When timer fires, the UI should show the wake-up message in the transcript.
-   Server/runtime requirements:
    -   Store timeouts by `chatId` (thread id) and `timeoutId` and ensure multi-device consistency.
    -   Ensure that timeout execution is not coupled to browser focus and happens at the scheduled time.
    -   Define behavior for edge cases:
        -   If agent is currently running/streaming in same thread when timeout fires, queue the wake-up message to run after the current run finishes (no concurrent runs in one thread).
        -   If a timeout fires while the chat is archived/deleted, decide whether to drop it or log it (@@@).
        -   On server restart, long-running timers must resume.
        -   Add minimal rate limits / caps per thread to prevent abuse (e.g. max active timers per thread) (@@@).
-   Persistence/migration:
    -   Add a DB table (e.g. `ChatTimeout` / `ThreadTimeout`) with fields like: `id`, `chatId`, `createdAt`, `dueAt`, `delayMs`, `status` (`scheduled|cancelled|fired|failed`), `firedAt`, `cancelledAt`, `toolCallId` (optional), `payload` (optional future extension) (@@@ exact schema).
    -   Add migration and ensure it works with existing deployments.
-   Background execution:
    -   Add a background scheduler/worker that periodically claims due timers (with locking) and enqueues a wake-up message into the correct chat processing pipeline.
    -   Ensure exactly-once or effectively-once delivery semantics (at least avoid double fire).
-   Commitments & protocol:
    -   Expose `USE TIMEOUT` in the commitments list for agents (similar to other `USE ...` commitments).
    -   The tool schema should be minimal: `{ milliseconds: number }`.
    -   The tool response should include `{ status: 'set', timeoutId, dueAt }` while the assistant-visible text is just `The timer was set.`
-   Observability:
    -   Log lifecycle events (set/cancel/fired/failed) and link them to `chatId` + `timeoutId`.
    -   Surface failures to the user in the same thread (system message) if a timer could not be executed (@@@).
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Files/areas to touch (non-exhaustive):
    -   `apps/agents-server` tool/commitment definitions + validation
    -   chat thread runtime / message injection pipeline
    -   UI chat thread components (timer indicator + cancel UI)
    -   DB schema + migrations + background worker/scheduler
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🧂] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🧂] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🧂] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
