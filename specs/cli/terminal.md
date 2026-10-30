# Terminal runtime dashboard

[Main specification](../_main.md) · [CLI presentation](interactive-ui.md) · [Global dashboard](global-dashboard.md)

## Attaching and lifetime

`ptbk dashboard` opens a live client for the selected project's existing engine; `--path` selects the project. On a suitable TTY it is **pretty and interactive by default** with no extra flag; raw/no-UI/noninteractive/redirected use opts out of that live terminal interaction. Verify the owner. Opening/reopening does not initialize/start an engine, acquire its lock, claim work or change configuration. A missing/unreachable service gives an actionable error/start instruction.

Zero or many dashboards can attach. They share engine state but not viewer focus, current dashboard page, scroll position or acknowledged visual attention. Q, root-level Escape, Ctrl+C and terminal disconnection close only this client; closing all clients leaves the daemon running. Service exit/loss is honest and never starts a replacement.

`dashboard --global` opens the independent host-wide table of known projects, including stopped ones, from any CWD. Selecting a live engine attaches without `cd`, startup or lock acquisition; returning leaves it untouched. Explicit individual/bulk controls and stopped-entry removal follow [the global contract](global-dashboard.md); selecting a stopped row alone never starts it. Foreground start can show equivalent controls but owns execution lifetime. Automatic viewer handoff from start/init/restart is defined by [process modes](process-modes.md).

## Home screen

Use the [dashboard home-screen contract](dashboard-layout.md). The root has a prominent shared **full-width Promptbook / PTBK and project header and [project brief](project-report-ui.md) above the tile grid**, visually identifying one application. It is separate from focusable tiles and from the terminal tab title. The complete header/grid form a compact responsive cockpit, not a vertically scrollable report. In normal terminal sizes the complete root is visible at once, including PTBK/project/service state, current work, operator attention and entries to the major pages.

Width and **height** both affect layout. A narrower/shorter terminal reduces columns and secondary copy before it removes important state. A larger terminal may use more whitespace/richer bounded previews. Handle `resize` live without losing tile focus, page selection, list scroll or drafts.

Arrow keys move focus; the selected tile has a double-line border and bold heading with reserved geometry, so neither its dimensions nor content positions change. Focus is independent from attention. A newly actionable tile may blink/pulse or otherwise stand out without moving focus. If the operator is clearly active in this viewer and continues working elsewhere, the transient animation settles while the unresolved tile remains statically marked. Do not age out unseen attention merely because the dashboard sat unattended. Reduced motion preserves the distinction without animation.

Chats and domains with a concrete required human decision/input/action use this common attention presentation. Health/tool failures and automatic recovery remain inspectable without attention merely because they occurred. The operator may ignore or address them in any order.

## Dashboard pages

Enter opens the focused tile as a full **dashboard page**; the root tile grid is no longer rendered around it. Escape returns one level and restores the prior root focus. Root Escape exits only the viewer.

Pages can scroll. Prefer a stable header/context and shortcut/footer area with a scrollable body for long task/chat/agent/tool/activity content. Inside a focused list/editor/composer, its own arrows/Enter/Escape take precedence until returning to the page.

Use [dashboard pages](dashboard-details.md) for execution, System, Health, Wallet, tools/browser, Agents, Chats, Tasks, activity/results, Usage, Action log, History, Files, Connection and enabled Synchronization. Technical metadata such as engine version, installation/path/location, local URLs and provider/model detail belongs on pages instead of bloating the home screen.

Live updates never steal focus, reset scroll, discard drafts or flood scrollback. Follow [bounded/coalesced rendering](dashboard-layout.md#rendering-under-slow-or-hidden-terminals): hidden/throttled output retains the latest snapshot rather than queued old frames, without dropping real events or blocking the engine.

## Keyboard and shared actions

Keep a discoverable legend and fully keyboard-operable lifecycle/navigation controls. Retain useful direct letter shortcuts, but each shortcut must open/call the same page/domain operation as ordinary navigation rather than an alternate implementation.

Retain C for new Chatter-first chat, A for an existing waiting thread, and access to all chats. Add discoverable Discuss report/Refresh report actions, optionally two-key sequences without lifecycle/composer collisions. Discussion seeds a distinct new chat; refresh requests coalesced engine work and respects pause. Rich-composer/picker keys are not captured by global shortcuts; Ctrl+C in chat closes that view/client, not the service.

Retain state-appropriate pause/resume controls, wait skipping and explicit graceful/force stop/restart under [shared lifecycle](service-lifecycle.md). Manual pause management and the full pause-reason list live on System. Health-generated pause reasons are surfaced through Health/System according to [Health](health-sub-engine.md); Health does not become another manual pause controller.

Browser recheck/retry/restart/kill/test-GitHub-tab targets the named profile pool through engine operations, clearly showing effects on all connected engines. Wallet uses protected input and the common attention mechanism. Synchronize now calls the one shared coordinator and is absent while autosync is off.

O may switch dashboard/plain presentation interactively; End can follow focused activity where applicable. Background tool/sync/health updates do not steal focus or discard an edit.

## Raw output

Raw/noninteractive dashboard streams bounded plain state/events without colour, cursor control, animation or hidden prompts. Keep equivalent state/diagnostic meaning, redacted addresses and attributed waiting-chat notices without decorative art. Status/show are one-shot alternatives. Presentation never resubmits work or changes authority. See [process modes](process-modes.md), [channels](channels.md) and [traces](traces.md).
