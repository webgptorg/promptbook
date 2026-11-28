# Loading UI Guideline

-   Use a **skeleton** when the user is waiting for a full route or a large layout section, and the final structure is known (profile hero, chat thread, list rows/cards, graph container).
-   Use a **spinner** for small/local actions where structure is already visible (buttons, inline refresh indicators, compact status chips).
-   Use **optimistic UI** when user intent can be applied immediately with low rollback risk (append local item/message first, then reconcile with server response).

## Agent page families

-   `profile`: `/agents/[agentName]`, plus the root-level `/<agentName>` alias
-   `chat`: `/agents/[agentName]/chat`
-   `textarea`: `/agents/[agentName]/textarea`
-   `editor`: `/agents/[agentName]/book`
-   `split-editor-chat`: `/agents/[agentName]/book+chat`
-   `integration-hub`: `/agents/[agentName]/integration`
-   `docs-card`: `/agents/[agentName]/website-integration`, `/agents/[agentName]/system-message`
-   `code-viewer`: `/agents/[agentName]/export-as-transpiled-code`
-   `timeline`: `/agents/[agentName]/history`
-   `gallery`: `/agents/[agentName]/images`

-   Prefer reusing an existing family for new agent routes. Add a new skeleton variant only when the final layout geometry is materially different.
