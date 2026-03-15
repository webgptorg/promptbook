[ ]

[🔄⏳] Agents Server: indicate running vs scheduled chats in chat list (left tray)

-   *(@@@@ Written by agent)*
-   In Agents Server, in the agent page left sidebar / left tray showing chat history (previous + current chats with the agent), add clear per-chat indicators for:
    -   (A) the chat is actively running right now (agent is still responding / tool-calling / streaming / otherwise progressing without new user action)
    -   (B) the chat is not running right now, but is scheduled to wake up in the future (timer / delayed action / expected future activity)
-   These indicators must work consistently for both internal chats (started in UI) and external chats (created/continued via API).
-   Indicators must be visually complementary (same placement + overall style family), but clearly different in “activity intensity”:
    -   Running (A): active spinner / animated loader, “live” feel
    -   Scheduled (B): softer / calmer indicator (e.g., clock icon, subtle pulse, countdown, or “Later” chip)
-   The indicators must appear in:
    -   the chat listing in the agent left tray
    -   the “My chats” listing (global listing) @@@ (confirm exact page/route)

-   UX requirements:
    -   Placement: keep consistent spot on each chat row (recommended: right side of row, near timestamp/overflow menu) @@@
    -   Tooltip / accessible label on hover/focus:
        -   Running: “Running” + optional short detail @@@ (e.g., “Searching…”, “Responding…”, “Tool: web_search”)
        -   Scheduled: “Scheduled” + optional ETA time or relative time (“in 5 min”)
    -   When both states could apply, define priority/order:
        -   If chat is currently running, show Running indicator even if there is a future schedule pending @@@
        -   If not running and has future wake-up, show Scheduled indicator
    -   Do not confuse “unread/new messages” with “running”; if unread exists, it should remain a separate, non-conflicting indicator @@@
    -   Keep the UI stable (avoid row width jitter); reserve space for indicator even when absent @@@

-   Technical requirements (server-side model):
    -   Define a minimal, explicit chat “activity state” for list items, returned by APIs used by both the left tray and My Chats:
        -   `activityState: 'idle' | 'running' | 'scheduled'` @@@ (final naming)
        -   `scheduledAt?: ISODateString` (or `nextWakeAt`) for scheduled
        -   `runningSince?: ISODateString` (optional) for running
        -   `activityDetail?: string` (optional, short)
    -   Ensure state is derived from authoritative backend signals rather than only client heuristics.
    -   Ensure external/API-created chats can set/transition into these states (e.g., via background job runner / orchestrator) @@@
    -   Consider eventual consistency: UI should update quickly when state changes:
        -   real-time updates via SSE/WebSocket OR
        -   polling/refresh cadence for lists @@@

-   Technical requirements (frontend):
    -   Implement a reusable UI component for the indicator (e.g., `ChatActivityIndicator`) used in both list UIs.
    -   Animation should be lightweight; respect reduced-motion preferences.
    -   Scheduled indicator should optionally show formatted time (absolute or relative) @@@

-   Edge cases:
    -   Chat starts running while user is currently viewing another chat: the list item updates to Running.
    -   Chat finishes: indicator disappears (returns to idle) without needing full page reload.
    -   Scheduled time passes and chat begins running: transition Scheduled → Running.
    -   Scheduled chat is cancelled: returns to idle @@@
    -   Failure/errored run: do not show Running indefinitely; show existing error UI (or add separate “error” state) @@@

-   Analytics/observability @@@:
    -   Track counts of running chats, scheduled chats, and average time in running state.

-   Implementation notes / project touchpoints:
    -   You are working with the [Agents Server](apps/agents-server)
    -   Likely frontend locations:
        -   `apps/agents-server/src/components/**` for chat list row UI @@@
        -   `apps/agents-server/src/app/**` routes for agent page + My Chats page @@@
    -   Likely backend/API locations:
        -   chat listing endpoints returning chat summaries @@@
        -   background job / scheduler / run loop that knows “running” vs “scheduled” @@@
    -   Add the changes into the [changelog](changelog/_current-preversion.md)
