# Dashboard home screen and pages

[Main specification](../_main.md) · [Shared status view](status-view.md) · [Dashboard pages](dashboard-details.md)

Terminal and browser project dashboards are a coherent **operational cockpit**. The root is the **dashboard home screen**: a bounded set of compact labelled tiles that summarizes the engine and routes the operator into full dashboard pages. It is not a long status document and it must not require ordinary scrolling.

The [global dashboard](global-dashboard.md) remains a separate host-wide table, not another project home screen or another engine.

## Home screen contract

The home screen must fit completely inside a normally usable terminal/window. A standard terminal, a moderately narrowed VS Code terminal and a fullscreen terminal must all present the complete home screen without vertical scrolling. Extremely tiny terminals may fall back to a minimal/limited message, but ordinary use must not require the operator to scroll past tiles to discover state or actions.

Use the available width and height responsively:

- wider surfaces may place several tiles side by side and use additional whitespace or slightly richer summaries;
- narrower surfaces reduce columns, shorten secondary copy and stack compact tiles;
- shorter surfaces reduce nonessential lines before dropping an important tile;
- larger surfaces may expand spacing and bounded previews, but must not turn the home screen into a verbose diagnostic dump.

The renderer reacts to terminal resize and repaints the layout without losing selection, drafts or page state. Responsive behavior applies to **height as well as width**. The home screen should utilize the available surface, not assume one fixed terminal geometry.

Render a clearly recognizable **shared application header above the entire tile grid**, identifying **Promptbook / PTBK** and the project name. Use a full-width prominent identity panel, normally about two terminal rows; compact it on smaller surfaces without hiding the project. Actual lifecycle/pause state remains in the relevant tiles, especially System, and its page; do not add another paused/pausing badge to this identity header. It visually unifies the home screen so the tiles read as domains of one application, not unrelated boxes. The header is separate from the tiles, not another focusable tile, and must remain prominent without becoming tall or verbose. Version, installation scope, process/path/location, connection URLs, detailed execution/provider data and other technical metadata belong on the appropriate dashboard page rather than permanently consuming home-screen space.

Reserve the shared header in responsive height/width calculations; shorten secondary content before sacrificing identity or forcing normal-size scrolling. The terminal window/tab title does not replace this in-application header.

The home screen contains compact tiles for operational domains. A tile shows only the smallest useful summary: healthy/idle/busy counts, current work, actionable problem summary or another bounded state. It is a navigation/control surface, not the complete content of that domain. The detailed inventory, diagnostics, lists and long explanations live on the corresponding page.

At minimum preserve the existing domains as compact tiles/pages: Current work, **System**, **Health**, Tools, **Wallet**, Agents, Chats, Tasks, Results/Activity, Connection, and Synchronization only when autosync is enabled. System owns engine/lifecycle/manual-pause controls and pause-reason inspection; Health is the UI for the per-engine [Health sub-engine](health-sub-engine.md). The exact grid and ordering may adapt to the available geometry, but operator attention and current service state remain prominent.

## Focus and attention are independent

The home screen has a **focus** used for navigation. Arrow keys move focus between tiles and the focused terminal tile uses a **double-line border and bold heading**, clearly visible without color. Reserve border/content geometry so focus changes neither resize the tile nor shift its content/neighbors. Browser focus is equivalently prominent and distinguishable from attention. Focus is solely the operator's cursor. It must never be stolen merely because a different tile becomes important.

There is **one shared attention mechanism**, regardless of whether a task question, Wallet login, tool problem or another domain caused it. Apply the engine's [minimal-interruption principle](../concepts/engine-and-project.md#autonomous-operation-and-minimal-interruption): attention is exceptional and resolved automatically when possible, without a global work stop.

Separately, any tile may have **attention** because its underlying domain has a new actionable event, failure, warning or human request. Multiple tiles may require attention simultaneously. Attention does not move focus, open a page, block another action or force the operator to resolve items in system-chosen order. The operator may inspect another tile, solve issues in any order or intentionally ignore an attention item.

New/unseen attention should be visually conspicuous, for example by a restrained blink/pulse in addition to its warning tone. The animation exists to make it difficult to overlook a new issue, not to punish intentional ignoring. Do **not** expire the conspicuous state simply because wall-clock time passed: an unattended dashboard may sit open for hours before an operator looks at it.

Once the viewer has clear evidence that the operator is actively using that dashboard while leaving the attention item unresolved, the transient blink/pulse should settle into a persistent static warning. This acknowledgement is viewer-local presentation state; it may be derived from a short period or several meaningful navigation/actions after the operator becomes active. The exact debounce/count is an implementation choice. The underlying incident/request remains unresolved and the tile remains visibly marked until the domain reports it resolved. Focus and attention must still be distinguishable when both apply to the same tile.

A saved user response clears its question's attention immediately, before agent/model processing or a Git batch, and updates every surface. Viewing/reading only settles local animation; it does not answer. Several pending items retain their individual state behind the same attention presentation.

Reduced-motion mode removes blinking/motion but retains equally clear unseen-versus-active warning semantics without relying on animation or color alone.

## Pages, not expanded panels

Enter on a focused tile opens that domain as a **dashboard page**. Do not keep rendering the whole home-screen grid behind or around an enlarged "subpanel". The page replaces the home screen as the primary content of the dashboard until the operator returns.

Escape returns one level to the previous dashboard page/home screen. Escape at the home screen exits only that dashboard viewer, never the engine. Direct letter shortcuts may jump to the same pages/actions, but must not create alternate business logic.

A dashboard page may use the full terminal/window and may scroll when its content is larger than the viewport. Prefer a stable page frame: keep a concise page title/context and discoverable controls/footer fixed where practical, while the list/log/detail body scrolls. Lists such as tasks, chats, agents and activity preserve selection and scroll across live updates and resize. Editing/composer controls retain drafts and local navigation.

Opening a page is inspection/navigation, not mutation. Actions on that page use the shared engine/domain operations. Returning to the home screen preserves the operator's tile focus and reasonable local page state.

## Information hierarchy

The home screen favors:

1. project identity and service state;
2. new/actionable operator attention;
3. what is currently working/waiting;
4. compact state of the major domains;
5. navigation and lifecycle discoverability.

Technical details are not deleted; they move to pages. Wallet owns its encrypted credential labels, protected pending login actions and restoration input; no secret appears in home summaries. The **System page** owns engine/process/configuration/lifecycle detail, generic manual pause/resume and the complete active pause-reason list. The **Health page** owns host-resource measurements, health incidents, allowed soft-incident override and remediation from the [Health sub-engine](health-sub-engine.md); it does not own generic manual pause controls. Tool pages own provider/profile readiness and configuration. Connection owns URLs/QR/access. Execution owns harness/model/thinking details. Activity/log pages own verbose history.

A concrete blocker may be summarized on the related home tile so the operator knows *where* attention is required. The complete cause, evidence and remediation can live on its page. Long errors, paths, URLs, model names, version strings and QR codes must not inflate the root layout.

## Responsive and live behavior

Live updates must not flicker, move focus, reset page scroll, discard drafts or flood scrollback. A viewer's focus, page, scroll position and acknowledged visual attention are local presentation state and do not modify the engine or another viewer.

Pretty one-shot snapshots may reuse the same information hierarchy without pretending to be navigable. Raw output remains labelled plain sections and need not imitate the tile geometry.

When an enabled synchronization domain, tool, chat, health monitor or other subsystem produces an actionable issue, it marks its own tile/page through the shared attention presentation rather than inventing a modal global alarm. Lifecycle/pause state remains summarized in the relevant tiles, with detail on System; do not add another state badge to the identity header. The operator remains in control of navigation.

## Acceptance outcomes

Exercise the dashboard at standard Windows terminal size, a moderately reduced VS Code terminal, wide/fullscreen sizes and live resize. The complete home screen, including the prominent full-width shared Promptbook/project header above the grid and lifecycle state within System/related tiles, remains visible without scrolling in all normal cases and uses the available space sensibly. The header cannot be mistaken for an independent tile and remains recognizable through live updates/resize. Long paths/versions/URLs do not force the root taller.

Move focus through every tile: double border/bold heading never changes its dimensions or shifts content. Keep state visible in tiles without an extra pause badge in the identity header. Include Wallet within the normal-size no-scroll layout.

Create simultaneous attention in several domains. New items are conspicuous without moving focus; an operator can continue navigating elsewhere, after clear interaction the transient animation settles while unresolved warnings remain. Reduced motion preserves the meaning.

Open every tile with Enter. The home grid disappears and a full page is shown; long pages scroll inside their content while stable controls/context remain usable. Escape returns to the same home focus. No page, avatar, log, QR or background refresh obscures required controls or mutates engine state merely by being viewed.
