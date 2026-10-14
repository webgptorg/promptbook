# Shared project status view

[Main specification](../_main.md) · [Terminal dashboard](terminal.md) · [Browser dashboard](dashboard.md)

There is one coherent project status view, presented live or as a snapshot, not a QR-only launch screen and an unrelated status screen. Use the [panel layout](dashboard-layout.md): separately bounded attention, current-work, queue, results/activity and connection regions instead of one undifferentiated rectangle. This specifies observable hierarchy, not a rendering library or internal component structure.

## Live and snapshot forms

`ptbk dashboard`, interactive foreground execution and the browser dashboard continuously update the view from the running service. `ptbk status` and `ptbk show` render one current snapshot and return. Successful start/restart show the same snapshot with the operation outcome; repeated start reports the existing service this way. Stop reports its outcome and stopped state, without advertising a dead server as available. No lifecycle command automatically attaches a live view.

Both forms identify the project, actual service engine version, operating/connection state, current agent/task/harness, phase, queue summary, results, waits/blockers and pending user requests. Present agents with their stable [mascot badge](../agents/visual-identity.md), readable name and actual activity; raw output retains name/state without decorative artwork. Include connection information and explicit uncommitted mode when applicable. A snapshot shows when it was observed and cannot imply that it continues updating. Unavailable or stale state is explicit; never invent current activity merely to populate the screen.

Pending [requests to the user](user-interactions.md) have the highest visual priority, ahead of routine activity, statistics, agent avatars and the QR code. Show what requires attention and how to respond without making the user open logs. Automatic assignment and goal discovery are labeled agent work, not human requests. Ordinary waiting explains its reason and next action/opportunity when known.

Keep setup, authentication, recovery and failed-work blockers visible while their bounded recheck timer runs. Such a timer is not a provider call or a skippable prompt-pacing wait. Show the harness's actual diagnostic (for example, the daemon cannot find `codex` on PATH), the concrete repair/restart action and next recheck time in terminal, browser and API snapshots, including after an action request was answered but the prerequisite remains unresolved. `Skip wait` is applicable only to an actual execution/pacing wait; it cannot dismiss setup or authorize blocked work. Resume/answers trigger fresh prerequisite inspection rather than treating an answer as proof of login. An idle service with no provider turn must not imply it is waiting for provider inference.

## URL and QR code

Whenever the project's HTTP dashboard is available, both live and snapshot pretty terminal views show its actual URL and a scannable QR code for that same URL. This includes start's result, status/show and an attached dashboard, not only the initial launch. The browser view offers the same connection information. Keep URL, QR code and project status together; QR display never substitutes for status or obscures user requests.

Use the service's actual address/selected port rather than an assumed default or another project's URL. The textual URL remains visible and usable independently of scanning; a localhost URL does not imply access from another device. Do not change bind address, network exposure or authorization to make the QR code reachable.

`--no-qr` suppresses only the code in commands rendering this view, including dashboard, status/show, start/restart and foreground run. Raw/redirected output contains no QR art or terminal decoration but retains the URL when available. If the terminal cannot fit a scannable code alongside essential information, keep status, requests and the textual URL usable and explicitly indicate the QR limitation rather than clipping an invalid code. No-server, failed startup and stopped/disconnected states must not present an unverified URL/code as a working connection.

Live updates do not repeatedly append QR codes to scrollback or displace focused input. Render a stable connection area while its address remains unchanged; update it when the actual connection changes. Requests and current work remain more prominent than connection decoration.

## Acceptance outcomes

For the same running project, start's result, status/show and a newly attached dashboard contain the same status categories and working URL/QR, differing in observation time and update behavior. Status/show return without starting or stopping work. A pending request is immediately visible in every view; no screen consists solely of a QR code or a single undivided text panel.

Verify a non-default port, repeated start, no-server, stopped service, no-QR, raw/redirected output and a narrow terminal. No view advertises a fabricated or clipped connection code; plain text retains actionable status and available URL. Client refresh/disconnection never changes service ownership.
