[ ]

[🧩🧠] New agent wizard: add team picking page (with members + federated agents)

-   *(@@@@ Written by agent)*
-   You are working with the [Agents Server](apps/agents-server)
-   Build on the existing New Agent Wizard flow already implemented for A/B testing (**NEW_AGENT_WIZARD**) and add a new step/page specifically for selecting a team before any agent details are collected
-   Wizard behavior changes
    -   In Wizard mode, before Step 1 (agent basics), add Step 0 (or Page 1): **Pick a team**
    -   Teams must be loaded from the backend source of truth. If teams support is not implemented yet, use the placeholder @@@
    -   Team selection is required to continue; if user cannot pick a team (e.g., no teams / none available), show an empty state + a clear action to create a team (@@@)
    -   Team choice must be persisted through wizard navigation (back/forward + direct step jumping) and included in the final created agent/book
-   UI/UX requirements for the team picking page
    -   Search/filter by team name (only if existing teams list supports it; otherwise show a simple list) (@@@)
    -   Show team name and a short label/description if available; avoid technical/internal fields (@@@)
    -   Clear “Continue” CTA disabled until a team is selected
-   Recursive “create team members” inside the same step
    -   After selecting a team (still on the same step/page), allow creating team members immediately
    -   Reuse the same member-creation form component recursively: each time the user clicks “Add member”, a new member form row/section appears
    -   Provide controls to remove/edit a member before finishing the wizard (@@@)
    -   Persist member inputs through wizard navigation and include them in the final payload
    -   If the backend requires team members to be created first via API, implement the smallest possible orchestration (single submit that creates team + members + agent in order, or a minimal two-phase approach) (@@@)
-   “Pick multiple agents on our federated server” for team members
    -   Team member selection supports selecting one or more agents from the federated server
    -   For each team member being created, the UI lets the user pick multiple federated agents (multi-select), and the selected set is attached to that member (@@@)
    -   If federated agent search/pagination exists, reuse it; otherwise implement a minimal multi-select with server-side filtering (@@@)
    -   Clear UX for empty state (no federated agents found) and loading/error states (@@@)
-   Backend/data requirements
    -   Ensure the wizard create-agent backend payload includes selected team linkage field (canonical field name: @@@)
    -   Ensure the wizard payload includes the created/linked team members and their federated agent mappings (schema: @@@)
    -   Reuse existing create-agent plumbing wherever possible (do not fork the creation logic into parallel codepaths)
-   API/DB exploration TODO (please confirm)
    -   What is the canonical teams API endpoint (route + response shape)? (@@@)
    -   What is the canonical linking field name used when creating an agent/book for team ownership? (@@@)
    -   What is the canonical schema/route for team members and how they relate to agents (local vs remote)? (@@@)
-   Tests & QA
    -   Add/extend an integration test for wizard: selecting a team, creating at least 1 team member, selecting 1+ federated agents for that member, and finishing creates agent/book with correct team linkage + member/agent mappings (@@@)
    -   Add/extend a UI test (Playwright) to cover the new team step: cannot proceed without selection, member forms are persisted on back/forward, and multi-select federated agents works end-to-end (@@@)

