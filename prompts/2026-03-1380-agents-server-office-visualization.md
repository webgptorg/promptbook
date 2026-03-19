[🏢🤖] Agent office visualization

-   *(@@@@ Written by agent)*

A fun 3D "office" view for the Agents Server home page that visualizes agents as virtual colleagues around desks, in meeting rooms, and moving through corridors; positions and activities reflect agent capabilities, current work, teams, and statuses. This is an incremental PRD — placeholders marked @@@ and questions at the end.

-   Goals
    -   Provide a third home-page view (besides list/folder and graph) called "Office" that is engaging and informative.
    -   Map agent metadata (capabilities, team, current tasks, running/scheduled state, profile image, icon, last activity) to visual signals: desk location, screen content, animations (talking, walking), room assignment.
    -   Offer performance-friendly defaults: low-poly 3D, 2D isometric fallback, or simplified canvas version for low-end devices.
    -   Allow clicking an agent to open the agent profile / chat panel and quick actions (message, open book, stop/start).

-   Non-goals
    -   This PRD does not require building a full-blown game engine or realtime multi-user sync. Start with a client-side visualization and map server state via existing APIs.

-   Success criteria
    -   Office view added to the home page with toggle between List / Graph / Office.
    -   At least three visual agent states implemented: idle (sitting), working (at screen with relevant preview), in-meeting (clustered in a meeting room), moving (walking animation).
    -   Office performs acceptably on typical dev machines and mobile browsers with graceful degradation.
    -   Clicking an agent opens the same agent profile UX as other views.

-   UX / interactions
    -   Top-left view toggle: List | Graph | Office.
    -   Camera controls: pan, zoom, reset. Provide an auto-arrange / focus-on-team button.
    -   Tooltips on hover with agent name, short summary, last activity, and quick buttons.
    -   Rooms represent teams or projects. Drag-to-move agents in future iterations (optional, @@@).

-   Data model & mapping
    -   Input from existing Agents API: id, name, profileImage, teamId, status (running/scheduled/idle/errored), currentTask (short text), capabilities (tags), folderId, lastActiveAt, isPublic/private.
    -   Map to visualization: team -> room, status -> posture/animation, currentTask -> screen preview text or icon, capabilities -> desk decoration badges.
    -   Polling vs streaming: start with polling every Xs (placeholder @@@) and add WebSocket / SSE later if needed.

-   Implementation notes
    -   Primary target: apps/agents-server (frontend). Add a new route /home?view=office or a component in the home page.
    -   Suggested libraries: three.js or react-three-fiber for 3D; model simplicity is priority. Provide 2D canvas / SVG fallback for mobile.
    -   Keep visuals low-bandwidth: use sprite atlases, baked lighting, and LOD switching.
    -   Accessibility: provide list fallback and ARIA labels for agent items.

-   Files / areas to modify (starting points)
    -   apps/agents-server (frontend home page, routing, components)
    -   apps/agents-server/src/components/OfficeView.tsx (new)
    -   apps/agents-server/src/components/Office/Desk.tsx (new)
    -   apps/agents-server/src/components/Office/MeetingRoom.tsx (new)
    -   apps/agents-server/public/office-assets/ (3D models, sprites, placeholders)
    -   packages/ui or shared components for Tooltips / AgentCard (reuse existing Agent components)
    -   API: reuse existing agents listing endpoints; add aggregated endpoint if needed @@@

-   Acceptance criteria (dev tasks)
    -   Create OfficeView component and integrate into home-page view toggles.
    -   Render agents as desk avatars with name and small screen preview.
    -   Implement simple meeting room cluster visualization for teams with more than N members (@@@ N).
    -   Implement agent click to open agent profile / chat (reuse existing navigation).
    -   Implement fallback mode for mobile / low-power devices.
    -   Add unit tests for OfficeView rendering (smoke tests) and an e2e scenario opening agent profile from Office view.

-   Performance & security
    -   Avoid loading heavy textures by default. Lazy-load assets when office view is activated.
    -   Sanitize any server-sent screen preview content (no raw HTML injection).
    -   Respect agent privacy: hide sensitive agent info if agent is private/unlisted.

-   Roadmap / phased work
    -   Phase 1 (MVP): basic 2D/3D desks, mapping of teams to rooms, click-to-open agent profile, polling update.
    -   Phase 2: animated transitions, talking animations, screen previews with live snippet of currentTask, WebSocket updates.
    -   Phase 3: draggable desks, custom office layouts per workspace, sharing office view, multi-user presence (if requested).

-   Open questions / placeholders (@@@)
    -   Polling interval: @@@ seconds — what should be the default? (suggest 10–30s)
    -   Team-to-room mapping rules: use folderId or explicit team metadata? @@@
    -   Do we want 3D models shipped in repo or served from CDN/asset pipeline? @@@
    -   Which exact agent fields are available from the API (currentTask, capabilities) — confirm endpoint schema. @@@

-   Requested design assets
    -   Low-poly office layout mockups (desktop + mobile simplified wireframe).
    -   Small set of avatar sprites or 3D glb models (one per role/category) or guidance to use generated images.

-   QA checklist
    -   Office view loads within Xs on standard broadband (placeholder X=2s).
    -   Visual states match agent statuses for a sample dataset.
    -   Accessibility fallback works (list of agents remains reachable).



[Commit]

[🏢🤖] Agent office visualization

-   Implement an "Office" 3D/2D visualization view for agents on the home page. MVP: desks, rooms (teams), agent states mapped to posture/animation, click-to-open agent profile, and mobile fallback.
-   Prioritize low-runtime cost and progressive enhancement. Use existing agents API; add backend aggregation endpoint only if necessary.
-   Work in apps/agents-server frontend. Add new components under src/components/Office and public/office-assets for models.

This commit was done by [Promptbook Agent](https://pavol-hejny.ptbk.io/agents/E1upys74QBME7s/)
