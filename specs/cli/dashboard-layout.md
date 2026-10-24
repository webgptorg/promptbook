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

Keep the top identity/status extremely concise: use **PTBK**, the project name and the actual engine lifecycle state. Version, installation scope, process/path/location, connection URLs, detailed execution/provider data and other technical metadata belong on the appropriate dashboard page rather than permanently consuming home-screen space.

The home screen contains compact tiles for operational domains. A tile shows only the smallest useful summary: healthy/idle/busy counts, current work, actionable problem summary or another bounded state. It is a navigation/control surface, not the complete content of that domain. The detailed inventory, diagnostics, lists and long explanations live on the corresponding page.

At minimum preserve the existing domains: current work, service/system controls, tools, Agents, Chats, Tasks, results/activity, connection, and synchronization only when autosync is enabled. [Health and system ownership](health-sub-engine.md) add their dedicated home/page behavior. The exact grid and ordering may adapt to the available geometry, but operator attention and current service state remain prominent.

## Focus and attention are independent

The home screen has a **focus** used for navigation. Arrow keys move focus between tiles and the focused tile has a clear visual selection state. Focus is solely the operator's cursor. It must never be stolen merely because a different tile becomes important.

Separately, any tile may have **attention** because its underlying domain has a new actionable event, failure, warning or human request. Multiple tiles may require attention simultaneously. Attention does not move focus, open a page, block another action or force the operator to resolve items in system-chosen order. The operator may inspect another tile, solve issues in any order or intentionally ignore an attention item.

New/unseen attention should be visually conspicuous, for example by a restrained blink/pulse in addition to its warning tone. The animation exists to make it difficult to overlook a new issue, not to punish intentional ignoring. Do **not** expire the conspicuous state simply because wall-clock time passed: an unattended dashboard may sit open for hours before an operator looks at it.

Once the viewer has clear evidence that the operator is actively using that dashboard while leaving the attention item unresolved, the transient blink/pulse should settle into a persistent static warning. This acknowledgement is viewer-local presentation state; it may be derived from a short period or several meaningful navigation/actions after the operator becomes active. The exact debounce/count is an implementation choice. The underlying incident/request remains unresolved and the tile remains visibly marked until the domain reports it resolved. Focus and attention must still be distinguishable when both apply to the same tile.

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

Technical details are not deleted; they move to pages. The System page owns engine/process/configuration/lifecycle detail. The Health page owns host-resource health. Tool pages own provider/profile readiness and configuration. Connection owns URLs/QR/access. Execution owns harness/model/thinking details. Activity/log pages own verbose history.

A concrete blocker may be summarized on the related home tile so the operator knows *where* attention is required. The complete cause, evidence and remediation can live on its page. Long errors, paths, URLs, model names, version strings and QR codes must not inflate the root layout.

## Responsive and live behavior

Live updates must not flicker, move focus, reset page scroll, discard drafts or flood scrollback. A viewer's focus, page, scroll position and acknowledged visual attention are local presentation state and do not modify the engine or another viewer.

Pretty one-shot snapshots may reuse the same information hierarchy without pretending to be navigable. Raw output remains labelled plain sections and need not imitate the tile geometry.

When an enabled synchronization domain, tool, chat, health monitor or other subsystem produces an actionable issue, it marks its own tile/page through the shared attention presentation rather than inventing a modal global alarm. Severe engine state may also be summarized in the top status. The operator remains in control of navigation.

## Acceptance outcomes

Exercise the dashboard at standard Windows terminal size, a moderately reduced VS Code terminal, wide/fullscreen sizes and live resize. The complete home screen remains visible without scrolling in all normal cases and uses the available space sensibly. Long paths/versions/URLs do not force the root taller.

Create simultaneous attention in several domains. New items are conspicuous without moving focus; an operator can continue navigating elsewhere, after clear interaction the transient animation settles while unresolved warnings remain. Reduced motion preserves the meaning.

Open every tile with Enter. The home grid disappears and a full page is shown; long pages scroll inside their content while stable controls/context remain usable. Escape returns to the same home focus. No page, avatar, log, QR or background refresh obscures required controls or mutates engine state merely by being viewed.
