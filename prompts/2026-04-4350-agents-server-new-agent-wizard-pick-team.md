[ ]

[🧩🧠] New agent wizard: add team picking page

-   *(@@@@ Written by agent)*
-   You are working with the [Agents Server](apps/agents-server)
-   Build on the existing New Agent Wizard flow already implemented for A/B testing (**NEW_AGENT_WIZARD**) and add a new step/page specifically for selecting a team before any agent details are collected 
-   Wizard behavior changes
    -   In Wizard mode, before Step 1 (agent basics), add Step 0 (or Page 1): **Pick a team**
    -   Teams must be loaded from backend (source of truth) and presented as a selectable list/grid
    -   Team selection is required to continue; if user cannot pick a team (no teams / none available), show an empty state and a clear action (@@@)
    -   Team choice must be persisted through the wizard navigation (back/forward + direct step jumping) and included in the final created agent/book
-   UI/UX requirements for the team picking page
    -   Search/filter by team name (if existing teams list supports it; otherwise simple list) (@@@)
    -   Show team name and a short label/description if available; avoid technical/internal fields (@@@)
    -   Clear “Continue” CTA disabled until a team is selected
-   Backend/data requirements
    -   Ensure the wizard create-agent backend payload includes the selected `teamId` (or equivalent) so the agent is created under that team (@@@)
    -   Reuse existing create-agent plumbing wherever possible (do not fork the creation logic into parallel codepaths)
-   API/DB exploration TODO (please confirm)
    -   What is the canonical teams API endpoint (route + response shape)? (@@@)
    -   What is the field name used when creating an agent/book for team ownership? (@@@)
-   Tests & QA
    -   Add/extend an integration test for wizard: selecting a team and finishing creates agent with correct team linkage (@@@)
    -   Add/extend a UI test (Playwright) to cover the new team step: cannot proceed without selection, team persists when navigating back 

