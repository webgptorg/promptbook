[x] ~$0.9064 17 minutes by OpenAI Codex `gpt-5.4`

[🔄⏳] Agents Server: indicate running vs scheduled chats in chat list (left tray)

-   In Agents Server, in the agent page left sidebar / left tray showing chat history (previous + current chats with the agent), add clear per-chat indicators for:
    -   (A) the chat is actively running right now (agent is still responding / tool-calling / streaming / otherwise progressing without new user action)
    -   (B) the chat is not running right now, but is scheduled to wake up in the future (timer / delayed action / expected future activity)
-   These indicators must work consistently for both internal chats (started in UI) and external chats (created/continued via API).
-   Indicators must be visually complementary (same placement + overall style family), but clearly different in “activity intensity”: - Running: Suble spinner with animation - Unread: Bold dot - Scheduled: Subtle clock
-   The indicators must appear in the My chats listing in the agent left tray sidebar

-   UX requirements:

    -   Placement: keep consistent spot on each chat of the chats
    -   Tooltip / accessible label on hover/focus with more details
    -   When both states could apply, define priority/order:
        -   If chat is currently running, show Running indicator even if there is a future schedule pending
        -   If not running and has future wake-up, show Scheduled indicator
    -   Keep the UI stable (avoid row width jitter); reserve space for indicator even when absent

-   You are working with the [Agents Server](apps/agents-server)

