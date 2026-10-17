# Shared project status view

[Main specification](../_main.md) · [Terminal dashboard](terminal.md) · [Browser dashboard](dashboard.md)

There is one coherent project status view, presented live or as a snapshot, not a QR-only launch screen and an unrelated status screen. Use the [panel layout](dashboard-layout.md): separately bounded attention, current-work, queue, results/activity and connection regions instead of one undifferentiated rectangle. This specifies observable hierarchy, not a rendering library or internal component structure.

## Live and snapshot forms

`ptbk dashboard`, interactive foreground execution and the browser dashboard continuously update the view from the running service. `ptbk status` and `ptbk show` render one current snapshot and return. Successful start/restart show the same snapshot with the operation outcome; repeated start reports the existing service this way. Stop reports its outcome and stopped state, without advertising a dead server as available. No lifecycle command automatically attaches a live view.

Both forms identify the project, actual service engine version, operating/connection state, current agent/task/harness, phase, queue summary, results, waits/blockers and waiting-for-user and unread chat summaries. Present agents with their stable [mascot badge](../agents/visual-identity.md), readable name and actual activity; raw output retains name/state without decorative artwork. Include connection information and explicit uncommitted mode when applicable. A snapshot shows when it was observed and cannot imply that it continues updating. Unavailable or stale state is explicit; never invent current activity merely to populate the screen.

[Chats awaiting a human response](user-interactions.md) have the highest visual priority, ahead of routine activity, statistics, agent avatars and the QR code. Show the speaking agent, waiting question/action and a direct way to open its thread without making the user open logs. Unread and waiting-for-user are distinct; allow navigation to all chats in live views. Automatic assignment and goal discovery are labeled agent work, not human requests. Ordinary waiting explains its reason and next action/opportunity when known.

Keep setup, authentication, recovery and failed-work blockers visible while their bounded recheck timer runs. Such a timer is not a provider call or a skippable prompt-pacing wait. Show the harness's actual diagnostic (for example, the daemon cannot find `codex` on PATH), the concrete repair/restart action and next recheck time in terminal, browser and API snapshots, including after an action request was answered but the prerequisite remains unresolved. `Skip wait` is applicable only to an actual execution/pacing wait; it cannot dismiss setup or authorize blocked work. Resume/answers trigger fresh prerequisite inspection rather than treating an answer as proof of login. An idle service with no provider turn must not imply it is waiting for provider inference.

## Connection, URL and QR code

Both live and snapshot views contain the same connection panel: separate local HTTP and [remote tunnel](remote-access.md) state, the actual addresses and the relay provider. When remote access is ready, make the verified public HTTPS entry point primary so a phone on another network reaches the project. Retain the loopback URL as a clearly labeled same-computer alternative. Do not guess addresses/ports or substitute another project's endpoint.

In a trusted local pretty terminal, the initial QR and its identical readable entry link support the protected pairing flow. Label any pairing capability as sensitive, short-lived and single-use. Later visits use an authenticated session; the public base URL alone does not grant access. Ordinary API responses and remote browser panels do not reveal fresh pairing credentials. Connection URLs/QR codes are not permission to bypass the API's authorization.

QR display belongs to start's result, status/show and the live dashboard, not a special QR-only screen. It never replaces status or obscures requests. With no-tunnel or remote failure, prominently state local-only/degraded access; a displayed loopback QR is explicitly same-computer-only, not mobile access. With no-server or an unverified/stopped endpoint, omit a working-connection claim and its usable QR. Preserve stale addresses only as labeled diagnostics.

`--no-qr` suppresses only the code in commands rendering this view, including dashboard, status/show, start/restart and foreground run. Raw/redirected output keeps public/local addresses and health without QR art or automatic pairing-secret disclosure. If the terminal cannot fit a scannable code with essential information, preserve status, waiting chats and the readable link and state the QR limitation rather than clipping an invalid code.

Live updates maintain a stable connection panel without repeatedly appending QR codes or displacing focused input. Update links/codes when the verified hostname or pairing validity changes. Requests and current work remain more prominent than connection decoration. Network access follows the explicit tunnel policy, not a rendering side effect.

## Acceptance outcomes

For the same service, start's result, status/show and a newly attached dashboard expose matching status categories and verified connection information, differing in observation time and update behavior. A phone outside the local network can use the ready remote pairing QR; ordinary unauthenticated access cannot read or control the project. Status/show create neither a new tunnel nor a worker. A pending request is visible in every view; no screen consists solely of a QR code or an undivided text panel.

Verify a non-default port, repeated start, no-tunnel, provider failure, no-server, stopped service, expired pairing, no-QR, raw output and a narrow terminal. No view advertises fabricated, stale-ready or clipped connection codes. Client refresh/disconnection never changes service ownership.
