[ ]

[⏱️💬] Improve `USE TIMEOUT` chip UI

-   Overview: When an agent sets a timeout the small chip under the message currently exposes raw technical values (milliseconds, UTC, internal flags). Replace this with a simple, friendly default popup and keep an "Advanced" view that shows the raw details (milliseconds, exact UTC, internal IDs). Reuse the existing pattern used by the USE TIME commitment to avoid duplication and keep behaviour consistent.
-   Goals:
    -   Default popup is short, human-friendly and actionable (e.g. "Will retry in 5s" / "Scheduled for 14:05 local time").
    -   Show some nice visual clock, look how `USE TIME` commitment does it and reuse if possible.
    -   Advanced view reveals original technical data (milliseconds, exact UTC timestamp, timezone, internal identifiers) on demand.
    -   Reuse code / components from the commitment "USE TIME" implementation and UI where possible to follow DRY principle and consistent UX (see notes and existing prompt for the commitment).
-   Scope / files to touch (analysis required):
    -   Chat UI chips component(s) (likely under apps/agents-server or @promptbook/browser chat components) - find and update the chip renderer and click handler to open a popup.
    -   Reuse or extract popup component used by the `USE TIME` commitment UI (reference: prompts/2026-03-0790-agents-server-use-timeout-commitment.md and related implementation).
    -   Unit / integration tests for chip behaviour and popup content.
    -   Add small e2e test or manual QA checklist for default vs advanced views in chat flows.
-   Behavioural details (requirements):
    -   Chip label (collapsed): show a friendly concise text derived from milliseconds (e.g. "Timeout: 5s" or "Scheduled: in 2 minutes").
    -   On chip click open modal/popover with two states:
        -   Default state: simple human readable sentence(s), local timezone, friendly relative time, primary action(s) (Cancel, Snooze, View advanced).
        -   Advanced state (hidden behind an "Advanced" button): exact fields - raw milliseconds, ISO UTC timestamp, timezone, original internal payload/ids.
    -   Accessibility: modal/popover must be keyboard focusable, have proper aria-labels and a clear close control.
-   Implementation notes:
    -   Search for the `USE TIME` commitment implementation and UI components and reuse them (component extraction preferred). Keep behaviour consistent with that commitment's popup. Do not duplicate parsing logic for milliseconds <-> human readable conversion.
    -   If a reusable helper exists for formatting relative times or timestamps, use it (DRY). If not, add a small util in the browser UI package with tests.
    -   Keep the default popup offline-friendly (no extra network calls) and purely client-side formatting.
-   Acceptance criteria:
    -   Clicking a timeout chip opens the default friendly popup with relative time and primary actions.
    -   Clicking Advanced shows raw technical details (milliseconds, ISO UTC, timezone, internal ids).
    -   The implementation reuses at least one existing helper/component from `USE TIME` commitment or documents why reuse was not possible.
    -   Automated tests (unit + one e2e or integration) cover default vs advanced UI and accessibility basics.
-   You are working with the [Agents Server](apps/agents-server)
