[x] ~$1.21 an hour by OpenAI Codex `gpt-5.3-codex`

[🧩📌] Add chat visual mode toggle (BUBBLE vs ARTICLE) in Agents Server

-   You are working with [Agents Server](apps/agents-server)
-   Problem: Currently, user and agent messages render with the same “bubble” look, so it’s hard to visually distinguish agent responses from the user.
-   Add two chat visual modes, selected by the control panel:
    -   BUBBLE_MODE (current behavior): both user and agent messages appear as bubbles
    -   ARTICLE_MODE: user messages still appear as regular bubbles, but agent messages render as seamless/borderless “article” blocks (ChatGPT-like)
-   API/props requirement for Article mode: the chat component must accept a prop for chat visual mode (must be an uppercase constant with underscores), e.g. `CHAT_VISUAL_MODE` with possible values `BUBBLE_MODE` and `ARTICLE_MODE` (exact naming TBD)
-   Control panel + metadata requirement:
    -   Add setting in the control panel named **Chat visual mode**
    -   Default value comes from chat/agent metadata (metadata already exists for other controls like language)
    -   Users can override the default in the control panel between the two modes
-   Persistence expectation:
    -   Clarify whether the selected visual mode should persist per user/session/chat (TBD)
-   UI/UX details:
    -   In ARTICLE_MODE, agent messages should have no visible bubble border/background and should flow like regular text blocks
    -   Ensure message spacing/typography remains readable and consistent with current theme
-   Rendering rules:
    -   User messages: always bubble-style in both modes
    -   Agent messages: bubble-style only in BUBBLE_MODE; seamless in ARTICLE_MODE
-   Backwards compatibility:
    -   Existing chats should default to BUBBLE_MODE unless metadata specifies ARTICLE_MODE
-   QA/testing:
    -   Visual regression checks for both modes
    -   Verify streaming messages render correctly in ARTICLE_MODE (no late border/bubble flash)
    -   Verify mobile layout
-   Documentation:
    -   Add a note to the relevant chat UI docs / README if such a document exists (file TBD)
-   Acceptance criteria:
    -   Control panel toggle changes rendering immediately without page reload
    -   Metadata “Chat visual mode” sets the default correctly
    -   Agent messages are borderless in ARTICLE_MODE while user bubbles remain

