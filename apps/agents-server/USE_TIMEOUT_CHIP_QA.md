# USE TIMEOUT Chip QA

-   Friendly default popup:
    Trigger a `set_timeout` tool call in an agent chat, click the timeout chip under the assistant message, and confirm the first view shows friendly copy (for example `Will retry in ...`) plus local time, relative time, and timezone.
-   Default primary actions:
    In the same popup, confirm `Cancel`, `Snooze`, and `View advanced` actions are visible and keyboard-focusable (`Tab` order reaches each button).
-   Advanced details:
    Click `Advanced` (or `View advanced`) and confirm technical timeout fields are visible, including milliseconds, exact ISO UTC due timestamp, timezone, timeout id, and idempotency/internal ids.
-   Keyboard accessibility:
    With the popup open, confirm focus moves into the dialog, the close button has a clear accessible label, and `Escape` closes the popup.
-   Chip text regression:
    Confirm the timeout chip label is concise and non-technical (for example `Timeout: 5s`) and no longer shows raw `timeoutId` by default.

