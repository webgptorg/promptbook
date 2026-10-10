[x] ~$0.00 an hour by OpenAI Codex `gpt-5.4`

[🧩⏳] Clickable ongoing chips in Agents Server chat

-   In Agents Server chat, message can contain chips that represent what happened (sources used, teamate called, tools used, external actions, timing, etc.). When the message is completed, chips are clickable and open a pop-up with details (simple default + advanced raw logs under extra button).
-   Problem: while a tool call is ongoing, chips render with a spinner but are not clickable, so the user cannot inspect what is already known (e.g., request prepared but results pending; browser opened but steps not done yet).
-   Goal: Make ongoing chips clickable and show the same pop-up UI as for completed chips, progressively rendering whatever data is already available. Keep advanced mode available at all times.
-   Non-goal: changing chip taxonomy / which chips exist; redesigning the chip visuals beyond enabling click + proper disabled states when truly no data.

-   UX requirements

    -   Ongoing chips (spinner variant) must be clickable.
    -   Clicking an ongoing chip opens the same pop-up component used for finished chips.
    -   The pop-up content must support partial data states and update live as new data arrives.
    -   Simple mode (default): human-readable description of what is happening / what is known so far; avoid exposing low-level tool technicalities.
    -   Advanced mode: show raw logs progressively (tool name, timestamps, JSON request/params already known, streamed partial outputs, etc.).
    -   The pop-up should visually communicate “still running” states (e.g., skeleton/placeholder rows like “Search results pending”, “Browser actions pending”).
    -   If a chip has genuinely zero inspectable data yet, clicking still opens the pop-up but shows a meaningful placeholder with skeleton loading and does not error.

-   DRY / architecture requirements

    -   Do not duplicate implementation for ongoing vs finished.
    -   Introduce (or refactor to) a universal chip pop-up rendering contract where each chip provides:
        -   stable identity (chip type + instance id)
        -   “view model” selectors that can produce a Partial<ChipDetails> from the current runtime state
        -   rendering component(s) that accept partial data and can re-render
    -   Chip pop-up renderer must be able to render from:
        -   completed toolcall record(s)
        -   in-flight / streaming toolcall record(s)
        -   a mix (e.g., request stored, response pending)

-   Data / state requirements

    -   Define explicit states for chip details: `PENDING | PARTIAL | COMPLETE | ERROR`
    -   Ensure the ongoing toolcall stream emits enough incremental events for the UI to hydrate details progressively (request known first, then response chunks, then final response / error).
    -   Ensure the same event/log format can back both simple mode and advanced mode.

-   Acceptance criteria

    -   When a search toolcall starts, the “search” chip is clickable immediately; pop-up shows the query/params when available and later shows results when they arrive.
    -   When a browser toolcall starts, the “browser” chip is clickable immediately; pop-up shows session/opened status, then progressively shows actions (navigate/click/type/wait/scroll) as they happen.
    -   When a toolcall errors mid-flight, the chip remains clickable; pop-up shows partial data and an error state.
    -   Finished chips still work exactly as before.
    -   No duplicated chip-detail UI for ongoing vs completed (verified by code review / structure).

-   Implementation notes / affected parts of the project (update paths as discovered)
    -   You are working with the [Agents Server](apps/agents-server)
    -   Add the changes into the [changelog](changelog/_current-preversion.md)

