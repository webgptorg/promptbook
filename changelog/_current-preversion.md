### 📖 Book Format

-   Horizontal lines (`---`) now end commitments
    -   Allows separating metadata/configuration from conversation flow
    -   Supports various horizontal line formats: `---`, `-----`, `- - -`, `___`, `***`
-   Implement `USE BROWSER` commitment to enable browser tool capability
    -   Indicates that the agent should utilize a web browser tool to access and retrieve up-to-date information from the internet
    -   Content following `USE BROWSER` is ignored (similar to `NOTE`)
    -   First commitment in the `USE` family (future: `USE SEARCH ENGINE`, `USE FILE SYSTEM`, `USE MCP`)
    -   Stores `useBrowser: true` and `tools: ['browser']` in agent metadata
-   Implement `META FONT` commitment to set the agent's font
    -   Allows setting custom font family for the agent page
    -   Dynamically loads fonts from Google Fonts
-   Update `META COLOR` commitment to support multiple colors
    -   Allows specifying multiple colors separated by comma (e.g., `#FF5733, #33FF57`)
    -   Used to create a gradient background on the agent page

### 🐇 Agents Server

-   Simplify agent page design (`/agents/[agentName]`)
    -   New visually appealing profile view with agent's color theme as gradient background
    -   Large rounded card with agent image (or initial letter fallback)
    -   Poppins font for agent name display
    -   Prominent "Start Chat" button
    -   All secondary actions (standalone chat, edit book, integration, etc.) moved to dropdown "More options" menu
    -   QR code available via modal dialog from options menu
    -   Admin-only menu items for chat history, feedback, clone, and export
-   Support `META FONT` on agent page
    -   Agent page now uses the font specified in `META FONT` commitment for agent name and other text
-   Support multiple colors in `META COLOR` on agent page
    -   Agent page background now uses a gradient of all colors specified in `META COLOR`
-   Add `/models` endpoint to OpenAI-compatible API (`/agents/[agentName]/api/openai/models`)
    -   Required for OpenAI-compatible clients (Jan, LM Studio, etc.) to discover available models
-   Fix OpenAI API compatibility route (`/agents/[agentName]/api/openai`) to use server's API keys instead of BYOK (Bring Your Own Keys) strategy
    -   The route now uses the same `OpenAiAssistantExecutionTools` as the web chat interface
-   Fix `OpenAiAssistantExecutionTools` to always include current user message in thread
    -   Previously, when a thread was provided (even empty), the current message was ignored
    -   Now the current message is always appended to the thread messages
-   Load federated agents dynamically after page load to improve performance
    -   Add `ExternalAgentsSectionClient` component
    -   Add `/api/federated-agents` endpoint to list federated servers
    -   Fetch agents from each federated server independently in parallel
    -   Show loading spinner for each server while fetching
    -   Enable CORS on `/api/agents` to allow direct browser calls
-   Implement `FROM` commitment to inherit agent source from another agent
    -   Allows inheriting from both internal and external agents
-   Implement `COMPONENT` commitment to define UI components that the agent can render in the chat
    -   Allows defining component name and syntax/usage description
-   Implement `OPEN` and `CLOSED` commitments to control agent learning
    -   `OPEN` (default) allows agent to learn from conversation and modify its source
    -   `CLOSED` prevents agent from being modified by conversation
-   Implement `LANGUAGE` commitment to specify the language(s) the agent should use in its responses

### 🔒 Security

-   Update `next` to `15.4.8` and `react` to `19.1.2` to fix CVE-2025-55182
