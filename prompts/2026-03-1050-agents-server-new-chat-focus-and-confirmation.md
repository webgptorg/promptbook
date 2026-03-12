[ ]

[🧭💬] Agents Server: New Chat should always open the new chat (no focus hijack) + remove browser confirm

-   *(@@@@ Written by agent)*
-   Problem: Clicking **New Chat** sometimes creates a new chat briefly, then UI “blinks” back to the previously open chat; the newly created chat appears in history but is not navigable/selectable (stuck).
-   Goal: Make chat navigation deterministic and always respect the user’s intent (if user clicks New Chat, they must end up in that new chat; if user clicks a chat in history, they must end up in that chat) and remove the blocking native browser confirmation from the New Chat flow.
-   Principles:
    -   Never “steal focus” / route away from the chat explicitly chosen by the user.
    -   Navigation should be last-write-wins based on **explicit user action**, not based on async data refetches, list re-sorting, background updates, or optimistic updates.
    -   Prefer simple UX: New Chat should just create and open a new chat.

-   Required behavior (acceptance criteria):
    -   Clicking **New Chat**:
        -   Creates a new chat.
        -   Immediately navigates to / opens that new chat and stays there.
        -   Does **not** show any native `window.confirm` / browser confirmation.
    -   Switching chats by clicking a chat in history:
        -   Always navigates to that chat and remains there.
        -   Background updates (history refresh, message streaming, chat title updates, sorting by last activity, etc.) must not change the currently viewed chat.
    -   The “stuck new chat” state must not be possible.

-   Implementation notes / suspected causes to investigate (non-exhaustive):
    -   Race between:
        -   route change to the new chat
        -   chat list refetch / reorder
        -   “auto-select first chat” effect running after list updates
        -   optimistic creation being replaced by server response (id change) and selection not being updated
    -   Ensure there is a single source of truth for “currently selected chat id” (ideally derived from route param) and that no effect overwrites it unless it is responding to an explicit user intent.
    -   On new chat create: treat the resulting chat id as the navigation target; if server returns a different id than optimistic one, perform a controlled replace (or update router state) without jumping to an unrelated previous chat.

-   Engineering tasks:
    -   Add instrumentation logs (dev-only) around:
        -   New chat click
        -   chat create mutation start/success/fail
        -   route change
        -   any “auto-select chat” or “sync selected chat” effects
    -   Find and remove native confirm usage in New Chat flow (and any blockers that might cancel navigation).
    -   Fix state machine for chat selection:
        -   Explicit intents: `OPEN_CHAT(chatId)` and `NEW_CHAT()`.
        -   Disallow implicit selection changes triggered by list updates.
    -   Add regression tests.

-   Testing / QA:
    -   Add Playwright test that:
        -   Opens a chat
        -   Clicks New Chat
        -   Asserts URL / selected chat id changes to the new one and remains after history refetch
        -   Asserts there is no native dialog
    -   Add Playwright test that:
        -   Quickly clicks between chats during background updates
        -   Ensures final selected chat equals the last clicked chat
    -   Manual repro checklist: slow network throttling, rapid clicking, multiple chats with reordering.

-   You are working with the [Agents Server](apps/agents-server)
-   Relevant places to look (@@@ refine after code reading):
    -   Chat UI and routing in `apps/agents-server/src/app/**` (or pages/router equivalent)
    -   Chat sidebar/history list component (selection + reorder logic)
    -   New Chat button handler
    -   Any `window.confirm` usage
    -   Any state management for selected chat id (React state/store/query cache)
    -   Playwright tests in `apps/agents-server/tests/**`
-   Add the changes into the [changelog](changelog/_current-preversion.md)
