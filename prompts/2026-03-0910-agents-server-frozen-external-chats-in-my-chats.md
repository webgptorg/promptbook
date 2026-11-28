[x] ~$0.00 an hour by OpenAI Codex `gpt-5.4`

[🧊📡] Frozen chats from API & team members visible in My Chats

-   Chats can be initiated to an Agent from multiple channels (Agents Server web UI, OpenAI / OpenRouter compatible API, “team member” internal tooling, and future channels like email/Telegram). Today, the web UI shows only chats created from the web UI; chats created via other channels are missing or not clearly distinguished.
-   Goal: Make all agent chats discoverable from the web UI, while keeping proper access control and making it clear which channel created the chat.
-   Definitions:
    -   “Web UI chat” = chat initiated from Agents Server web application by a logged-in user or anonymous user
    -   “External chat” = chat initiated via non-web channel (OpenAI-compatible API key, team member/internal, future channels,...).
    -   “Frozen chat” = chat is view-only in the web UI (no sending messages from UI), used as an audit/replay of what the agent saw in that channel.
-   Requirements (backend/data):
    -   Store a `source` (or `channel`) attribute on `Chat` (or equivalent model) to indicate origin.
    -   Ensure chats created via OpenAI-compatible routes and team member tooling always create/persist a `Chat` record and `ChatMessage` records in DB (not just ephemeral runtime), so they appear in listings.
    -   Access control:
        -   Regular user: only see their own Web UI chats.
        -   Admin: can optionally see external chats (API/team/other) across the server.
-   Requirements (My Chats panel UI/UX):
    -   Add a small Settings/Filters panel in the My Chats area (near the existing “Show empty chats” toggle).
    -   Provide two toggles:
        -   “Show empty chats” (existing; keep).
        -   “Show external chats” (new; visible only to admins).
    -   External chats must be visually distinguishable in the list (chip/icon/label), e.g. “API”, “TEAM”.
    -   Clicking an external chat opens it in a read-only mode:
        -   Message input disabled/hidden.
        -   Show a banner: “Chat from (API key/team member). View-only.”
        -   Allow copying messages and downloading/exporting chat (existing download features should work).
    -   For web UI chats nothing changes: full interactive chat.
-   Create dabase migration if needed
-   Security/privacy:
    -   External chats may contain sensitive data; default admin-only visibility.
    -   Ensure api keys are not leaked
-   Acceptance criteria:
    -   When an API client starts chatting with an agent via OpenAI-compatible endpoint, a chat is created in DB and appears in My Chats for admins when “Show external chats” is enabled.
    -   When a team member starts an internal chat, it appears similarly.
    -   External chats open as frozen/read-only and cannot be messaged from the web UI.
    -   Web UI chats remain unchanged.
    -   Regular users cannot see external chats.
-   Work areas / files:
    -   You are working with the [Agents Server](apps/agents-server)
    -   Chat persistence & API routes
    -   My Chats UI panel in the sidebar
    -   Chat view component
    -   Add the changes into the [changelog](changelog/_current-preversion.md)

