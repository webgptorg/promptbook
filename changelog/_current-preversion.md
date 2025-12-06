### 🐇 Agents Server

-   Load federated agents dynamically after page load to improve performance
    -   Add `ExternalAgentsSectionClient` component
    -   Add `/api/federated-agents` endpoint to list federated servers
    -   Fetch agents from each federated server independently in parallel
    -   Show loading spinner for each server while fetching
    -   Enable CORS on `/api/agents` to allow direct browser calls
-   Implement `FROM` commitment to inherit agent source from another agent
    -   Allows inheriting from both internal and external agents
