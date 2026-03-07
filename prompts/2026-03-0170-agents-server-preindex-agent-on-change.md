[ ]

[✨🍾] Pre-index agent in background on create/update/book write (debounced)

-   Today the agent’s underlying vector store is created on the first chat message to the agent, which adds latency to the first response and worsens UX.
-   When an agent is created, modified, or its source book/knowledge is written, schedule pre-emptive indexing/preparation of the agent in the background.
-   Add debounce/coalescing so that frequent edits (auto-save in book editor, rapid agent updates) do not trigger repeated indexing work.
    -   Debounce window: @@@ (propose initial value, make it configurable)
    -   Coalesce multiple changes into a single latest-index job
-   Ensure only one indexing job per agent+version (or agent+content hash) runs at a time; avoid stampedes when multiple events fire.
-   Define/implement a clear “prepared” state for the agent (vector store exists and is up to date with the latest agent/book content).
    -   Store and compare a content/version fingerprint used for indexing (e.g., `agent.updatedAt` + `book.updatedAt`, or a computed hash).
-   Trigger points to cover:
    -   Agent create
    -   Agent update (name/description/system prompt/settings)
    -   Source book write / knowledge change (including file attachments / scraped sources, if applicable)
-   Background execution:
    -   Use existing background processing mechanism in [Agents Server](apps/agents-server) (queue/worker/cron) or introduce a minimal one if missing.
    -   Must not block the HTTP request that performs the save.
    -   Ensure retries/backoff on transient failures; mark job as failed and re-schedulable.
-   Observability:
    -   Log when a pre-index job is scheduled, started, skipped (already up-to-date), completed, failed.
    -   Add basic metrics/counters if available (scheduled/completed/failed, duration).
-   UX:
    -   The first chat after an edit should typically not need to create the vector store from scratch.
    -   If pre-indexing is still running when a chat starts, chat should proceed (either wait for completion if quick or fall back to on-demand behavior) with minimal perceived delay.
-   Data model:
    -   If needed, add DB fields/tables to store last indexed fingerprint, job status, timestamps.
    -   Do the database migration if needed.
-   Implementation notes:
    -   Keep in mind the DRY _(don't repeat yourself)_ principle.
    -   Do a proper analysis of the current functionality before you start implementing.
    -   You are working with the [Agents Server](apps/agents-server)
-   Project touchpoints (update as discovered during implementation):
    -   [apps/agents-server] agent create/update endpoints / actions @@@
    -   [apps/agents-server] source book persistence + autosave @@@
    -   [apps/agents-server] vector store/indexing code path currently triggered on first chat @@@
    -   [apps/agents-server] background jobs/queue utilities @@@
    -   [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍾] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍾] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍾] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍾] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
