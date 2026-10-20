# Shared project status view

[Main specification](../_main.md) · [Terminal dashboard](terminal.md) · [Browser dashboard](dashboard.md)

One coherent engine-owned view is presented live or as a snapshot, not unrelated launch/QR and status screens. Use the [cockpit panel hierarchy](dashboard-layout.md): attention, current work, main lifecycle controls, tools, enabled synchronization, queue, bounded activity/results and connection. Verbose information uses the existing [detail pattern](dashboard-details.md). Host-wide global overview is a separate table, not a project view backed by a global engine.

## Live and snapshot state

Dashboard, explicit foreground presentation and browser view update continuously; clients do not own state. Status/show render once and return. Start/restart use the same categories with an honest operation outcome; pause/resume/stop distinguish pending acceptance from completion. No lifecycle command automatically attaches a viewer.

Identify the project, actual engine version, observation freshness, connection and live state (`running`, `pausing`, `pause`, `stopping`), task/agent/phase, queue, outcomes and waits/blockers. Empty queue, missing tools or failed synchronization can coexist with running. They are not additional lifecycle states or evidence of process failure. An exited service may be labelled stopped as an observation, never advertised with a dead ready endpoint.

Show a compact tools overview even when no usable tools exist, explaining exactly what to enable, add or repair. Details distinguish configured/enabled/usable/in-use instances and old retained uses from newly saved state. New tools and `.env`/configuration changes appear without restart. Show actual task harness instance/variant/model/thinking context, not the first configured provider or stale last-run data. Individual browser detail includes effective profile/path, health and recovery state with no credentials.

Only while autosync is enabled, show its compact dedicated status and drill-down/manual-cycle entry. Details distinguish pending publication, failed fetch, deferred integration, conflict repair and real success. Keep local work state separate from remote failure. When disabled, omit the panel rather than fill the cockpit with an inactive sync box; general settings can report the choice. API/raw output keeps equivalent truthful information.

Agent [mascot badges](../agents/visual-identity.md) accompany readable names and observed activity; raw output keeps meaning without artwork. Explicit uncommitted mode stays visible. Snapshot time cannot imply ongoing updates. Unknown/stale fields and last-run history are labelled; never invent activity, inference or progress to fill the view.

[Chats awaiting a human response](user-interactions.md) have highest priority: actual speaker, concrete question/action, linked work and direct thread entry. Unread and waiting are distinct and all chats remain accessible. New chat defaults to Chatter; existing questions retain authors. Automatic assignment/discovery/repair is agent work, not automatically a user request.

Keep concrete tool/authentication/browser/recovery blockers visible through bounded rechecks even with details closed. Show the actual cause, next action and next check when known; an answered request alone does not prove repair. Skip wait cannot dismiss readiness, grant authority or bypass a resource requirement. A waiting engine with no active provider call is not waiting for inference.

## Connection, URL and QR

Separate local HTTP and [remote dashboard access](remote-access.md) with actual addresses/provider/health. This connection region is distinct from Git synchronization. A verified ready public HTTPS address is primary for phone access; retain labelled loopback for the same computer. Never guess another project's port/address.

A trusted local pretty terminal may display the existing short-lived single-use pairing QR and identical readable entry link. Label its sensitivity and lifetime. Paired sessions authorise later visits; public base URL alone grants no authority. Ordinary API and remote browser output never reveal fresh pairing credentials or profile/secret content.

QR may appear in start/status/show/live views, not as a replacement for work/requests. No-tunnel/failure is local-only/degraded; loopback QR is not mobile-network access. No-server, unverified or stopped endpoints get no usable-connection claims. Old addresses are diagnostic history only. `--no-qr` suppresses code, not exposure. Raw/redirected output retains redacted public addresses/health without QR art or automatic secret disclosure.

If a QR does not fit, keep essential state, requests and readable guidance rather than clipping it. Live updates preserve placement/focus and change verified URLs/validity honestly without repeated QR scrollback. Rendering never creates a tunnel or mints new pairing credentials.

## Acceptance outcomes

All clients and one-shot commands show matching observed categories with truthful version/time/lifecycle state. Missing browsers/harnesses leave a visible running/resource wait; adding a tool updates and resumes eligibility. Pending/failed sync appears only in its enabled panel and does not falsify local state. Inspect actual per-instance diagnostics and metadata with details collapsed/open. Verify pause in one client appears in others while closing viewers changes nothing. Test narrow/raw/no-QR/no-server, pairing expiry, port changes, tunnel failure and service exit without fabricated activity or stale ready endpoints.
