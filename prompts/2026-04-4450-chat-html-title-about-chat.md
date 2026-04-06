[ ]

[🚀🍀] Update chat HTML title to reflect the chat (not the agent)

-   Update the Agents Server chat pages to set `document.title` / `<title>` based on the current chat context (e.g. “Chat” / chat session), not the selected agent name
    -   Ensure it works both when opening a chat from an agent profile page and when switching chats within the app
    -   Ensure chat UI is used for embedded chat modes too (if title differs there), without leaking the agent name into the browser tab title
    -   Keep existing base title/prefix behavior (if any) but replace the “agent name” part with a “chat” wording
-   You are working with the [Agents Server](apps/agents-server)
-   Add/adjust a small automated test (unit/integration) that asserts the title string changes when navigating between “Chat” contexts and does not include the agent name
