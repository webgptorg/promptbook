[ ]

[🧠⚡] Fix temporary agent hello blink; only render the real default initial message

-   *(@@@@ Written by agent)*
-   You are working with [Agents Server](apps/agents-server)
-   Problem: when setting an agent’s default/initial message, the UI currently shows a temporary fallback “hello” first, then quickly replaces it with the real agent default message (a visible blink). We must ensure the user sees only the real default initial message from the start.
-   Entry point in product/UI flow: user opens an agent chat / profile -> chat initializes -> initial/default agent message is rendered in the chat timeline.
-   Expected behavior:
    -   On first render, the chat should display the agent’s real default initial message (the one configured for that agent), with no intermediate temporary placeholder message.
    -   If the real default initial message cannot be resolved immediately, show a non-message placeholder state (e.g. skeleton/loader), but do not show any temporary message content that later gets replaced.
-   Scope (implementation):
    -   Identify where the temporary fallback hello is generated (client-side default state vs server-side response vs streaming “first token” behavior).
    -   Ensure the client never renders fallback message content for agent initial message; it should render real message only when available and validated.
    -   If the initial message is fetched asynchronously, gate rendering behind “initial message resolved” flag.
-   Acceptance criteria:
    -   Visual: zero blink when opening the chat on a page that uses agent default initial message. Only the real default initial message is visible.
    -   Data: the first message item in the chat list corresponds to the correct agent default initial message.
    -   Reliability: behavior is consistent under slow network / delayed API responses (no temporary hello content).
    -   Regression: existing chat initialization behaviors (including any optimistic UI, streaming, and chat history) continue to work.
-   Open questions / placeholders:
    -   Where exactly is the “temporary default hello” defined? @@@
    -   What is the canonical API/DB field that represents the “real default initial message” for an agent? @@@
    -   Should the initial message be generated client-side or returned from the server on chat boot? @@@
-   QA plan:
    -   Add/extend e2e coverage for chat boot on an agent page verifying the first rendered message text equals the configured agent default initial message.
    -   Simulate slow responses (throttle network) to confirm no temporary hello appears.
-   Changelog:
    -   Add entry to [changelog/_current-preversion.md](changelog/_current-preversion.md)
