[ ]

[🪐🧩] Agents Server: Feedback UI variants (none / stars / report issue)

-   *(@@@@ Written by agent)*
-   We want a single configurable “feedback mode” in the Agents Server UI that controls what the user can do after a chat response:
    -   Variant 1: **Feedback off** (no stars shown)
    -   Variant 2: **Stars** (existing behavior)
    -   Variant 3: **Report issue** (new, replaces stars with a lightweight issue report flow)
-   You are working with [Agents Server](apps/agents-server)
-   Testing rule from Adam
-   Current behavior: stars can already be toggled on/off (Variant 1 should represent the “off” state)
-   Variant 3 requirements (to be implemented)
    -   In the chat UI where the stars currently appear, show a **“Report an issue”** button instead
    -   On click, open a modal with:
        -   short free-text field `What’s wrong?` (required)
        -   optional text area `Steps to reproduce` (optional)
        -   optional text area `Expected behavior` (optional)
        -   submit + cancel
    -   On submit, send an API request to create an issue report record for the specific message/response
    -   After submit, show a confirmation toast/snackbar (no blocking)
-   Data model / API (placeholders)
    -   Decide whether to store these in existing tables (e.g. something like `Feedback` / `ChatFeedback`) or create a new table (e.g. `IssueReports`)
    -   Add/extend an API endpoint like `POST /@@@/feedback/issue` (exact path unknown yet)
-   Admin/config
    -   Add a setting in Agents Server (likely in Metadata/config table) to select `feedbackMode` = `off | stars | issue`
    -   Default should be `stars` unless current product default differs (unknown)
-   Acceptance criteria
    -   With `feedbackMode=off`, the UI never shows stars and no stars-related API calls happen
    -   With `feedbackMode=stars`, UI behavior matches current stars flow
    -   With `feedbackMode=issue`, UI shows “Report an issue” and successfully stores the report via API
-   Quality / safety
    -   Validate that report fields are not empty (at least `What’s wrong?`)
    -   Rate-limit / debounce the submit action to avoid duplicate records (exact strategy TBD)
-   Open questions (please confirm)
    -   Where is the current “stars on/off” setting stored (which file/table)?
    -   Is “report issue” expected to reuse any existing support/helpdesk integration, or just persist in DB? If unknown, use `@@@`.
    -   Should reports be public/admin-only? What privacy constraints apply?
