### 🐇 Agents Server

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
-   Implement system for commitment modifiers, the "co-commitments"
    -   Add `IMPORTANT` co-commitment to emphasize other commitments (e.g., `IMPORTANT RULE`)

### 🔒 Security

-   Update `next` to `15.4.8` and `react` to `19.1.2` to fix CVE-2025-55182
