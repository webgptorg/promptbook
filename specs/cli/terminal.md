# Terminal runtime dashboard

[Main specification](../_main.md) · [CLI presentation](interactive-ui.md) · [Global dashboard](global-dashboard.md)

## Attaching and lifetime

`ptbk dashboard` opens a live client for the selected project's existing engine; `--path` selects the project. Verify the owner. Opening/reopening does not initialize/start an engine, acquire its lock, claim work or change configuration. A missing/unreachable service gives an actionable error/start instruction, not an empty successful project view.

Zero or many dashboards can attach, including terminals in the same project. They share state but not viewer focus/layout. The client has no wizard steps or completion countdown. Q, root-level Escape, Ctrl+C and terminal disconnection close only this client; closing all clients leaves the daemon running. Service exit/loss is honest and never starts a replacement.

`dashboard --global` opens the independent host-wide live table from any CWD and stays open at zero entries. Selecting an engine attaches without `cd`, starting a process or acquiring its lock; returning leaves the engine untouched. Foreground start and finite run can show the same controls but own execution lifetime: their termination uses graceful engine lifecycle, not unrelated process kills. Run stays finite.

## Operational cockpit

Use [shared status](status-view.md) and [panel layout](dashboard-layout.md): project/version/connection and four live states, current agent/task/phase, attention, queue, tools, results/activity and enabled synchronization. Resource waits are running states with a reason, not a stopped process. An enabled sync failure is distinct from active local work.

[Detail panels](dashboard-details.md) show actual execution metadata, the ordered named-tool inventory, individual browser diagnostics and conditional synchronization details. Keep compact tool/resource summaries visible; management supports add/modify/reorder, primary enable/disable and secondary removal through the same shared operations as CLI. Saved changes commit immediately and new tools may be used by current work. Show shared in-use/last-enabled-type confirmations, not terminal-specific rules.

Chats awaiting a human answer have highest attention priority: actual author, affected work and direct thread entry. Unread/all-chats remain distinct. Assignment/discovery/repair are labelled automatic work unless an agent genuinely asks User. Idle/wait states explain reality; do not invent progress or inference.

Keep aligned bounded panels, separate messages/checks/errors and show actionable redacted causes with next actions. Important browser/tool failures remain visible with detail closed. Catalogs use featured/More; configured instances and actual execution remain inspectable regardless of featured status. URL/QR obey raw/no-QR/pairing rules.

## Keyboard and shared actions

Provide a discoverable legend and fully keyboard-operable main lifecycle panel. Retain C for new Chatter-first chat, A for the highest-priority existing waiting thread, and access to all chats. Enter chooses Chatter; alternatives open the full valid list. Existing threads retain authors. Rich-composer/picker keys are not captured by global shortcuts; Ctrl+C in chat closes that view/client, not the service.

Retain P for state-appropriate pause/resume and S for skipping an actual pacing/backoff wait without bypassing readiness. X requests graceful stop and a repeat is not force escalation. Expose restart, explicit whole-engine force stop, pending-intent cancellation/change and required confirmations through [shared lifecycle](service-lifecycle.md), including the meaning of `ptbk stop -F`. Leaving the viewer and stopping the engine are visibly different.

Provide labelled shortcuts to open/close execution, tools, individual-tool and enabled-sync details. Browser recheck/retry/restart targets the named owned instance through engine operations, not local kill commands. Synchronize now calls the one shared coordinator; it is absent while autosync is off. Both preserve underlying safety/revision rules and report pending/failed outcomes.

At panel level, arrows select a panel spatially without enlarging it; Enter drills in, Escape returns one level and root Escape closes the viewer. Inside focused lists/editors their own navigation takes precedence. O switches dashboard/plain presentation interactively; End can follow focused activity, and resize preserves drafts/selection. A background tool/sync update does not steal focus or discard an edit. Equivalent browser/API controls need not copy terminal key choices.

## Raw output

Raw/noninteractive dashboard streams bounded plain state/events without colour, cursor control or hidden prompts. Keep tool/diagnostic information and enabled-sync outcomes, redacted addresses and attributed waiting-chat notices, without QR art. Status/show are one-shot alternatives. Presentation never resubmits work or changes authority. Lifecycle commands render once without attaching this viewer. See [process modes](process-modes.md), [channels](channels.md) and [traces](traces.md).
