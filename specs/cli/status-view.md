# Shared project status view

[Main specification](../_main.md) · [Terminal dashboard](terminal.md) · [Browser dashboard](dashboard.md)

There is one coherent engine-owned project status view, presented live or as a snapshot, not a QR-only launch screen and an unrelated status screen. Use the [panel layout](dashboard-layout.md): separately bounded attention, current-work, service-controls, queue, results/activity and connection regions. Technical execution/browser information belongs to [expandable detail panels](dashboard-details.md). This specifies observable hierarchy, not a rendering library or component structure. The host-wide [global overview](global-dashboard.md) is a separate table of project engines, not a project status view with a global worker.

## Live and snapshot forms

`ptbk dashboard`, explicit foreground presentation and the browser dashboard continuously update from the running engine. Any number of clients may observe it; none owns its state. `ptbk status` and `ptbk show` render one snapshot and return. Start/restart results use the same categories with their operation outcome; repeated start reports the existing service. Pause/resume/stop distinguish accepted pending requests from completed outcomes. No lifecycle command automatically attaches a live view.

Both forms identify the project, actual engine version, connection state and live service state (`running`, `pausing`, `pause`, `stopping`), current agent/task, phase, queue summary, results, waits/blockers and waiting-for-user/unread chat summaries. An empty queue is compatible with `running`; task phases and blockers are not additional service states. An exited service may be displayed as stopped, but there is no fifth live `stopped` state. Never advertise its dead endpoint as available.

Expose the actual effective harness/model/thinking level, including overrides and unavailable/not-applicable distinctions, through detail state rather than a mandatory verbose main panel. Include the effective browser profile source/resolved path, health and diagnostic/recovery status for authorized inspection. Raw/API/detail snapshots retain this information. Saved defaults and last-run metadata must not be misrepresented as a currently active configuration.

Present agents with their stable [mascot badge](../agents/visual-identity.md), readable name and actual activity; raw output retains name/state without artwork. Show connection information and explicit uncommitted mode when applicable. A snapshot records observation time and cannot imply continued updates. Unavailable/stale state is explicit; never invent activity to fill the screen.

[Chats awaiting a human response](user-interactions.md) have highest priority, ahead of routine activity, statistics, avatars and QR. Show the speaking agent, concrete question/action and direct thread entry without logs. Unread and waiting are distinct; all chats remain accessible. New-chat entry uses Chatter by default; opening a waiting thread retains its author. Automatic assignment/discovery is agent work, not a human request. Waiting explains its reason and next opportunity when known.

Keep setup, authentication, browser recovery and failed-work blockers visible during bounded rechecks, even with diagnostic panels closed. Show the actual diagnostic (for example, `codex` is missing from the daemon's PATH), repair/restart action and next recheck when known in terminal, browser and API. An answered request does not prove the prerequisite was fixed. A setup recheck timer is not provider inference or a skippable pacing wait. Skip wait cannot dismiss setup/authorize blocked work; resume/answers trigger fresh inspection. No active provider turn must not be shown as waiting for inference.

## Connection, URL and QR code

Live and snapshot forms share a connection panel separating local HTTP and [remote tunnel](remote-access.md) state, actual addresses and relay provider. When remote access is ready, make the verified public HTTPS entry point primary for a phone on another network. Retain the loopback URL as a same-computer alternative. Never guess addresses/ports or substitute another project's endpoint.

In a trusted local pretty terminal, initial QR and identical readable entry link support protected pairing. Label its capability as sensitive, short-lived and single-use. Later visits use authenticated sessions; a public base URL alone grants no access. Ordinary API responses and remote browser panels do not reveal fresh pairing credentials. URLs/QR are not permission to bypass authorization.

QR belongs to start's result, status/show and the live dashboard, not a special QR-only screen. It never replaces status or obscures requests. With no-tunnel/remote failure, clearly report local-only/degraded access; loopback QR is same-computer-only. With no-server or an unverified/stopped endpoint, omit working-connection claims and usable QR. Old addresses may remain only as labelled diagnostics.

`--no-qr` suppresses only the code in commands rendering this view, including dashboard, status/show, start/restart and foreground run. Raw/redirected output keeps addresses/health without QR art or automatic pairing-secret disclosure. If a scannable QR cannot fit with essential information, retain status, waiting chats and readable link, and explain the limitation rather than clip it.

Live updates keep stable connection placement without repeated QR output or displaced focus. Update addresses/codes when verified hostname or pairing validity changes. Network exposure follows tunnel policy, not a rendering side effect.

## Acceptance outcomes

For one engine, lifecycle results, status/show and multiple attached dashboards expose matching observed categories, with honest observation time and live/pending state. Pause in one client appears in all; closing any/all viewers does not alter state or ownership. A phone outside the network can pair through ready remote access; unauthenticated clients cannot inspect/control the project. Status/show create neither worker nor tunnel. Waiting requests remain visible with technical panels collapsed.

Verify non-default port, repeated start, no-tunnel, provider failure, no-server, service exit, expired pairing, no-QR, raw/narrow views and unknown execution/profile metadata. No fabricated activity, stale-ready address or clipped QR is presented. Client refresh/disconnection never changes engine ownership.
