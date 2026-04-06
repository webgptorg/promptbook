[ ]

[🧩🧠] New agent wizard: add team picking page

-   You are working with the [Agents Server](apps/agents-server)
-   Build on the existing New Agent Wizard flow already implemented for A/B testing (**NEW_AGENT_WIZARD**) and add a new step/page specifically for selecting a team before any agent details are collected
-   Wizard behavior changes
    -   In Wizard mode, before Step 1 (agent basics), add Step 0 (or Page 1): **Pick a team**
    -   Teams must be loaded from backend (source of truth) and presented as a selectable list/grid
    -   Team selection is required to continue; if user cannot pick a team (no teams / none available), show an empty state and a clear action (@@@)
    -   Team choice must be persisted through the wizard navigation (back/forward + direct step jumping) and included in the final created agent/book
-   UI/UX requirements for the team picking page
    -   Allow to pick the teammates from the simmilar list as in the homepage of the Agents Server, try to reuse the existing UI components and patterns for consistency (e.g. team cards, selection states, folders, etc.)
    -   Clear “Continue” CTA disabled until a team is selected
-   Backend/data requirements
    -   Team should add `TEAM` commitment to the created book
    -   Reuse existing create-agent plumbing wherever possible (do not fork the creation logic into parallel codepaths)
