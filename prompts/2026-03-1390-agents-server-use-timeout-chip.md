[⏱️💬] Improve USE TIMEOUT chip UI

-   *(@@@@ Written by agent)*
-   Overview: When an agent sets a timeout the small chip under the message currently exposes raw technical values (milliseconds, UTC, internal flags). Replace this with a simple, friendly default popup and keep an "Advanced" view that shows the raw details (milliseconds, exact UTC, internal IDs). Reuse the existing pattern used by the USE TIME commitment to avoid duplication and keep behaviour consistent.
-   Goals:
    -   Default popup is short, human-friendly and actionable (e.g. "Will retry in 5s" / "Scheduled for 14:05 local time").
    -   Advanced view reveals original technical data (milliseconds, exact UTC timestamp, timezone, internal identifiers) on demand.
    -   Reuse code / components from the commitment "USE TIME" implementation and UI where possible to follow DRY principle and consistent UX (see notes and existing prompt for the commitment). 
-   Scope / files to touch (analysis required):
    -   Chat UI chips component(s) (likely under apps/agents-server or @promptbook/browser chat components) - find and update the chip renderer and click handler to open a popup.
    -   Reuse or extract popup component used by the USE TIME commitment UI (reference: prompts/2026-03-0790-agents-server-use-timeout-commitment.md and related implementation). Link: https://github.com/webgptorg/promptbook/blob/main/prompts/2026-03-0790-agents-server-use-timeout-commitment.md
    -   Unit / integration tests for chip behaviour and popup content.
    -   Add small e2e test or manual QA checklist for default vs advanced views in chat flows.
-   Behavioural details (requirements):
    -   Chip label (collapsed): show a friendly concise text derived from milliseconds (e.g. "Timeout: 5s" or "Scheduled: in 2 minutes").
    -   On chip click open modal/popover with two states:
        -   Default state: simple human readable sentence(s), local timezone, friendly relative time, primary action(s) (Cancel, Snooze, View advanced).
        -   Advanced state (hidden behind an "Advanced" button): exact fields - raw milliseconds, ISO UTC timestamp, timezone, original internal payload/ids.
    -   Accessibility: modal/popover must be keyboard focusable, have proper aria-labels and a clear close control.
-   Implementation notes:
    -   Search for the USE TIME commitment implementation and UI components and reuse them (component extraction preferred). Keep behaviour consistent with that commitment's popup. Do not duplicate parsing logic for milliseconds <-> human readable conversion.
    -   If a reusable helper exists for formatting relative times or timestamps, use it (DRY). If not, add a small util in the browser UI package with tests.
    -   Keep the default popup offline-friendly (no extra network calls) and purely client-side formatting.
-   Acceptance criteria:
    -   Clicking a timeout chip opens the default friendly popup with relative time and primary actions.
    -   Clicking Advanced shows raw technical details (milliseconds, ISO UTC, timezone, internal ids).
    -   The implementation reuses at least one existing helper/component from USE TIME commitment or documents why reuse was not possible.
    -   Automated tests (unit + one e2e or integration) cover default vs advanced UI and accessibility basics.
-   QA / Manual checklist:
    -   Verify chips show friendly text in multiple time ranges (seconds, minutes, hours, scheduled day).
    -   Verify Advanced reveals exact milliseconds and UTC time.
    -   Verify keyboard navigation and screen reader behaviour.
-   Open questions / missing pieces (please provide):
    -   Design mockups for the default popup (preferred copy for the friendly message) — if none, provide guidance on tone/wording.
    -   Exact location of the existing USE TIME UI components or helpers in the repo (if you know the path share it), otherwise I will locate and propose extraction.
    -   Any translation keys / i18n expectations for the messages.
-   Work estimates and steps (draft):
    -   1) Locate chip component and existing USE TIME UI (analysis) — 1d
    -   2) Extract/reuse popup & time-format helpers — 1d
    -   3) Implement default + advanced popup and wire chip click — 1d
    -   4) Tests & accessibility — 0.5d
    -   5) QA & polish — 0.5d
-   You are working with: apps/agents-server (chat UI) and browser UI packages.
-   Notes: Follow DRY and SOLID principles. If you find a critical related issue, record it in ./AGENT_REPORT.md as per repo rules. 


This commit was done by [Promptbook Agent](https://pavol-hejny.ptbk.io/agents/E1upys74QBME7s/)
