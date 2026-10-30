# Shared project status view

[Main specification](../_main.md) · [Terminal dashboard](terminal.md) · [Browser dashboard](dashboard.md)

One coherent engine-owned status model is presented live or as a snapshot. Interactive dashboards render it as the [bounded home screen and full pages](dashboard-layout.md), while snapshots/raw output use the same facts without pretending to have tile navigation. Host-wide global overview is a separate table, not a project view backed by a global engine.

## Live and snapshot state

Dashboard, explicit foreground presentation and browser view update continuously; clients do not own state. Status/show render once and return. Start/restart use the same categories with an honest operation outcome and ordinary interactive daemon use then automatically attaches the independent project dashboard unless suppressed. Pause/resume/stop distinguish pending acceptance from completion and remain one-shot controls.

Identify the project, actual engine version, observation freshness, connection and live state (`running`, `pausing`, `pause`, `stopping`), active pause reasons, active task/agent/phase collection and selected detail, shared capacity/queued counts, outcomes and waits/blockers. Empty queue, missing tools or failed synchronization can coexist with running. They are not additional lifecycle states or evidence of process failure. An exited service may be labelled stopped as an observation, never advertised with a dead ready endpoint.

Interactive project home state uses one clearly visible shared application header above the tiles: Promptbook / PTBK and project identity, with actual lifecycle/pause state in System/related tiles rather than an additional state badge in the header. It unifies the domains without introducing another tile or normal-size scrolling; detailed technical metadata stays on pages under [layout](dashboard-layout.md).

Interactive home state contains a compact [Wallet](wallet.md) tile for readiness and protected pending login actions, using the same attention mechanism and no exposed secrets. A saved user response clears that question/action's attention promptly; independent work continues while others wait.

Interactive home state also contains a compact Health summary from the [Health sub-engine](health-sub-engine.md). Healthy state is terse; low disk/memory and connectivity incidents remain observable, while only a concrete required human action marks Health for attention and their full measurements/remediation live on its page. Health-generated pause reasons remain distinct from manual pause reasons shown on System.

Show a compact tools overview even when no usable tools exist, explaining exactly what to enable, add or repair. Details distinguish configured/enabled/usable/in-use instances and old retained uses from newly saved state. New tools and `.env`/configuration changes appear without restart. Show actual task harness instance/variant/model/thinking context, not the first configured provider or stale last-run data. Individual browser detail includes effective profile/path, health and recovery state with no credentials.

Only while autosync is enabled, show its compact dedicated status and drill-down/manual-cycle entry. Details distinguish pending publication, failed fetch, deferred integration, conflict repair and real success. Keep local work state separate from remote failure. When disabled, omit the panel rather than fill the cockpit with an inactive sync box; general settings can report the choice. API/raw output keeps equivalent truthful information.

Agent [mascot badges](../agents/visual-identity.md) accompany readable names and observed activity; raw output keeps meaning without artwork. Explicit uncommitted mode stays visible. Snapshot time cannot imply ongoing updates. Unknown/stale fields and last-run history are labelled; never invent activity, inference or progress to fill the view.

[Chats awaiting a human response](user-interactions.md) have highest priority: actual speaker, concrete question/action, linked work and direct thread entry. Unread and waiting are distinct and all chats remain accessible. New chat defaults to Chatter; existing questions retain authors. Automatic assignment/discovery/repair is agent work, not automatically a user request.

Keep concrete tool/authentication/browser/recovery blockers visible through bounded rechecks even with details closed. Show the actual cause, next action and next check when known; an answered request alone does not prove repair. Skip wait cannot dismiss readiness, grant authority or bypass a resource requirement. A waiting engine with no active provider call is not waiting for inference.

## Local connection

Show the actual loopback HTTP address, readiness and errors for this computer. This connection region is distinct from Git synchronization. Never guess another project's port or present stopped/disabled endpoints as usable. No-server disables HTTP while local engine control remains available. Raw output and browser/API state carry equivalent local connection information without credentials. Rendering never starts a service or changes authentication.

`ptbk status`/`show` prominently print the same last complete [saved brief](project-report-ui.md) once and exit, including with a stopped service/no harness, preserving original time and honest missing/stale/pending data. Reading never calls a model, generates reports or starts the service. Separate Action log/History/Files summarize external effects, Git messages/topology and read-only project content; long Books use the common viewer/editor core.

## Acceptance outcomes

All clients and one-shot commands show matching observed categories with truthful version/time/lifecycle state. Missing browsers/harnesses leave a visible running/resource wait; adding a tool updates and resumes eligibility. Pending/failed sync appears only in its enabled tile/page and does not falsify local state. Inspect actual per-instance diagnostics and metadata by entering/returning from the corresponding dashboard pages. Verify pause in one client appears in others while closing viewers changes nothing. Test narrow/raw/no-server, port conflicts/changes, authenticated local API controls and service exit without fabricated activity or stale ready endpoints.
