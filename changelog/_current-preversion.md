-   Fixed rapid Agents Server homepage organization changes so quickly moving multiple agents or folders no longer snaps back to stale positions:

    -   Serialized optimistic organization writes on the client, so rapid drag-and-drop changes are persisted in the same order they were made instead of racing each other.
    -   Prevented background organization sync from overwriting newer optimistic moves while organization mutations are still pending or when the sync started before a newer move was queued.
    -   Made the `/api/agent-organization` sync endpoint bypass and invalidate the short-lived active organization cache, so re-syncs now read freshly updated folder and agent ordering.

-   Finished dark-mode styling for the Agents Server chat page:

    -   Added shared dark-aware chat surface variables so the standalone chat composer footer no longer falls back to a bright gradient in dark mode.
    -   Darkened article-mode message utility controls, report-issue pills, reply previews, file previews, speech status bubbles, and dictation panels to keep chat interactions visually consistent.

-   Tightened Agents Server agent visibility enforcement:

    -   Added shared server-side visibility checks so private agents return forbidden responses to anonymous profile/chat/API access while unlisted agents remain usable by direct link.
    -   Added a same-origin internal TEAM access token so public or unlisted agents can consult private local teammates without allowing federated servers to access private agents.
    -   Hid logged-in-only agent actions from anonymous menus and protected agent source, editing, export, integration, history, analytics, feedback, and system-message routes accordingly.

-   Preferred singular commitment names over plural aliases in the commitment registry and generated catalogs:

    -   Reordered the shared commitment registry so canonical singular keywords now appear before their plural aliases, including `RULE` before `RULES` and `LANGUAGE` before `LANGUAGES`.
    -   Kept the sorted documentation and Book editor completion flow unchanged, so `/docs`, `/api/docs/book-language.md`, and BookEditor intellisense now reflect the singular-first registry order automatically.
    -   Added regression coverage for the raw registry ordering plus the grouped documentation and completion catalogues that consume it.

-   Marked the `MODEL` / `MODELS` commitment family as low-level instead of regular:

    -   Added a shared `isLowLevel` commitment flag and surfaced low-level commitments with the same warning plumbing as deprecated and unfinished ones, but with a caution message that they are not used by most of the users.
    -   Kept the runtime behavior unchanged, while moving low-level commitments to the bottom of the catalog, fading them in the Agents Server docs and Book editor, and marking them as low-level in the generated Book language docs.
    -   Added regression coverage for the new notice metadata, commitment ordering, editor diagnostics, and docs/menu presentation.

-   Grouped `OPEN` and `CLOSED` as one documentation family across the Agents Server docs and Book language markdown:

    -   Made the shared commitment grouping helper keep `OPEN` and `CLOSED` together as one catalog entry so the `/docs` pages, documentation dropdown, search results, and `/api/docs/book-language.md` now present them side by side.
    -   Rendered both commitment docs inside the shared page/catalog output, while keeping the underlying runtime commitments unchanged.
    -   Added regression coverage for the grouped family and the combined documentation renderer.

-   Flagged the legacy `DELETE` / `CANCEL` / `DISCARD` / `REMOVE` commitment family as unfinished and low-level instead of deprecated:

    -   Added a shared `isUnfinished` commitment flag and surfaced unfinished commitments with the same warning plumbing as deprecated ones, but with a caution message that they are not ready to use.
    -   Kept the runtime behavior unchanged, while moving unfinished commitments to the bottom of the catalog, fading them in the Agents Server docs, and marking them as low-level in the Book editor and generated documentation.
    -   Added regression coverage for the new notice metadata, commitment ordering, editor diagnostics, and docs/menu presentation.

-   Deprecated the legacy `TEMPLATE` / `TEMPLATES` and `FORMAT` / `FORMATS` commitment families in favor of `WRITING SAMPLE` and `WRITING RULES`:

    -   Added deprecation metadata and migration docs to both commitments so generated Book language documentation and the Book editor now surface them as legacy aliases.
    -   Kept the legacy runtime behavior unchanged for backward compatibility, including existing books that still compile with `TEMPLATE` or `FORMAT`.
    -   Added regression coverage for the deprecation metadata, grouped commitment catalog, and editor warning diagnostics.

-   Deprecated the legacy `ACTION` / `ACTIONS` commitment family in favor of the dedicated `USE*` commitments:

    -   Added deprecation metadata and migration docs to `ACTION` so editors and generated Book language documentation now surface it as a legacy commitment.
    -   Kept the legacy runtime behavior unchanged for backward compatibility, including existing `ACTION` books that still compile.
    -   Added regression coverage for the deprecation metadata and legacy compile path.

-   Made the core Book commitment catalog prioritize `GOAL`, `RULE`, `KNOWLEDGE`, and `TEAM` everywhere they are surfaced:

    -   Added a shared `isImportant` flag to commitment definitions and used it to sort the commitment catalog for documentation, the Agents Server documentation menu, and Book editor intellisense.
    -   Kept deprecated commitments at the bottom of the documentation catalog while preserving the existing grouped alias behavior.
    -   Added regression coverage for the commitment ordering in the shared catalog, the documentation dropdown, and Monaco completion suggestions.

-   Added built-in TEAM hierarchy support to Agents Server transpiled-code exports, so exported harnesses now include teammate metadata and sources instead of depending on a running Agents Server for `TEAM` tools:

    -   Reused the existing server agent-reference resolver, inherited-source import path, and model-requirement compiler to resolve local and federated teammates recursively before transpilation.
    -   Added a shared transpiler TEAM payload and runtime helper so every JavaScript export emits one reusable `PROMPTBOOK_TEAM_AGENTS` hierarchy block instead of duplicating tool code per teammate.
    -   Updated transpiler coverage across OpenAI SDK, OpenAI Agents SDK, Anthropic Claude SDK, Anthropic Claude Managed, AgentOS, and E2B exports to verify TEAM hierarchy data is embedded.

-   Added a warning banner to the Agents Server `export-as-transpiled-code` page for agents that use non-transpilable `OPEN`/default-open, `MODEL`, `USE USER LOCATION`, or `USE PRIVACY` commitments, so users are told when exported code may not match the live agent 1:1:

    -   Centralized the check in a pure export-warning helper so the warning stays transpiler-agnostic and is driven by parsed agent commitments.
    -   Rendered the warning only when the current agent actually uses one of the unsupported behaviors.

-   Added optimistic homepage rendering in Agents Server so clicking the server logo from an agent page now swaps the persistent shell to the homepage loading skeleton immediately instead of waiting for the homepage data stream to finish:

    -   Added a shared client-side homepage optimistic-navigation wrapper in the root layout shell, driven by the existing navigation-start event, so homepage-bound clicks can render the loading skeleton before the new route finishes loading.
    -   Reused the existing homepage loading skeleton instead of duplicating the loading UI, keeping the fixed header and footer shell intact while the homepage data is still streaming.
    -   Added regression coverage for the optimistic homepage transition so the layout now keeps the agent page visible until the navigation starts and then switches to the homepage skeleton immediately.

-   Fixed federated Agents Server avatar defaults so remote agents now render with the federated server's built-in avatar visual instead of the local server fallback:

    -   Extended the federated `/api/agents` payload with the server's resolved `DEFAULT_AGENT_AVATAR_VISUAL` metadata and propagated that visual id through the shared federated-agent loader.
    -   Updated the shared avatar resolver to honor the federated server fallback before the local server default, while keeping local agents unchanged.
    -   Added regression coverage for the federated agent loader, the `/api/agents` payload, and the avatar resolver fallback order.

-   Fixed Agents Server TEAM teammate calls so internal agent-to-agent chat requests no longer create a fresh anonymous browser user, allowing same-server private and unlisted teammates to answer when referenced by another agent.

-   Removed the generic `USE` commitment from the Book commitment registry so only concrete `USE *` commitments are parsed, documented, and suggested in the Book editor.

-   Added an `OpenAI Agents SDK` transpiler to the Agents Server `export-as-transpiled-code` flow, so `@openai/agents`-based runnable harnesses can now be generated and downloaded alongside the existing SDK export:

    -   Added a new `openai-agents` Book transpiler that emits a standalone Node.js CLI harness built on `@openai/agents`, including Promptbook function-tool wrapping, conversation resumption through `previousResponseId`, and native OpenAI vector-store RAG for knowledge commitments.
    -   Kept the transpiler implementation DRY by reusing the shared Book-to-harness preparation helpers and the common function-tool formatting path already used by the other JavaScript transpilers.
    -   Registered the new transpiler in the Agents Server export registry, mapped it to JavaScript harness metadata for preview/download packaging, and extended regression coverage for export-page listing, ZIP/runtime metadata, and OpenAI Agents transpiler output.

-   Added a new `Orb` built-in avatar visual to the shared avatar registry and utils `/avatars` playground:

    -   Implemented a seeded, smooth morphing circle-orb renderer that varies its silhouette, glow layers, and interior sheen from the agent name, hash, and colors while keeping the avatar recognizably orb-like.
    -   Varied the orb gradients and color bands by seeded family so different agents can render as pearl-like, nebula-like, ember-like, or glacier-like orbs without replacing any of the existing visuals.
    -   Registered `orb` alongside the current built-in visuals and extended registry / playground URL-state coverage so the existing `/avatars` page now shows it automatically without adding a separate route.

-   Added an Anthropic Claude Managed transpiler to the Agents Server `export-as-transpiled-code` flow, so Claude Agent SDK-based managed harnesses can now be generated and downloaded alongside the existing SDK export:

    -   Added a new `Anthropic Claude Managed` Book transpiler that emits a standalone Node.js CLI harness built on `@anthropic-ai/claude-agent-sdk`, including Claude Code preset system prompts, managed session resumption, MCP tool wiring, and the same retrieval-based knowledge scaffolding already used by the existing SDK export path.
    -   Kept the managed transpiler implementation DRY by reusing the shared Book-to-harness preparation helpers, the common Claude model resolver, and the shared Zod schema conversion used by the other JavaScript transpilers.
    -   Registered the new transpiler in the Agents Server export registry, mapped it to JavaScript harness metadata for preview/download packaging, and extended regression coverage for export-page listing, ZIP/runtime metadata, and managed Claude transpiler output.

-   Fixed the Agents Server transpiled-code export so generated SDK harnesses now emit valid `tools` / `toolImplementations` object members instead of malformed `name: async name()` entries:

    -   Added a shared SDK transpiler helper that normalizes tool implementations from object methods, function declarations, and arrow functions into valid object-literal method syntax before embedding them in exported code.
    -   Reused that helper in both the OpenAI and Anthropic SDK transpilers so the `USE TIME`, `USE SEARCH ENGINE`, `USE EMAIL`, `USE BROWSER`, and related tool exports all keep the same formatting path.
    -   Tightened transpiler regression tests to verify the emitted harness includes the corrected `async toolName(...) {}` shape and no longer emits the broken property/value form.

-   Added an Anthropic Claude SDK transpiler to the Agents Server `export-as-transpiled-code` flow, so Claude-based runnable harnesses can now be generated and downloaded alongside the existing OpenAI export:

    -   Added a new `Anthropic Claude SDK` Book transpiler that emits a standalone Node.js CLI harness built on `@anthropic-ai/sdk`, including Claude tool-use loops, Promptbook tool implementations, and the same retrieval-based knowledge scaffolding already used by the existing SDK export path.
    -   Kept the SDK transpiler implementation DRY by extracting the shared Book-to-harness preparation logic used by both OpenAI and Anthropic SDK transpilers instead of duplicating knowledge/tool parsing.
    -   Registered the new transpiler in the Agents Server export registry, mapped it to JavaScript harness metadata for preview/download packaging, and extended regression coverage for Anthropic ZIP exports and file metadata inference.

-   Added an AgentOS transpiler to the Agents Server `export-as-transpiled-code` flow, so Book agents can now export a runnable AgentOS harness with Pi session setup and optional host tools:

    -   Added a new `AgentOS` Book transpiler that emits a standalone Node.js harness backed by `@rivet-dev/agent-os-core`, `@rivet-dev/agent-os-common`, and `@rivet-dev/agent-os-pi`, including a generated Pi extension, streamed session events, and the prompt loop used by the export page.
    -   Mapped the export page to show AgentOS as a JavaScript harness with the `.mjs` entry filename, and reused the existing runtime packaging path so the downloaded ZIP includes the same self-contained scaffold as the other runnable exports.
    -   Registered the new transpiler in the Agents Server export registry and covered the export-page listing plus ZIP/runtime metadata with regression tests.

-   Made Agents Server transpiled-code exports self-contained and directly runnable, so downloaded agent harness archives now behave like small standalone projects instead of loose code files:

    -   Moved transpiled export assembly into shared Agents Server export utilities that now decide which helper files belong in every export, while the ZIP route remains a thin system-level wrapper that only archives the prepared file set.
    -   Added system-generated runtime scaffolding for runnable JavaScript exports, including `package.json` with inferred dependencies and `npm start`, a mocked `.env` file with detected environment variables and fill-in instructions, a `.gitignore`, and a short `README.md` explaining how to run the exported agent with `npm install` and `npm start`.
    -   Expanded the transpiled export manifest and regression coverage so archives now describe their inferred runtime, bundled helper files, and required environment variables in one consistent format for current and future transpilers.

-   Enhanced the Agents Server `export-as-transpiled-code` page so it now works as a fuller export workspace instead of only a code preview:

    -   Added a read-only Book viewer showing the stored agent source directly on the export page, together with a dedicated `Edit Book` action that jumps to the existing Book editor instead of making the export page itself editable.
    -   Added ZIP downloads for transpiled exports, so the page can now bundle the stored `agent.book`, the generated harness file, and a small manifest into one archive from the selected transpiler.
    -   Kept the export flow DRY by centralizing transpiler resolution, transpiled ZIP generation, and browser download helpers that are now shared across the export page and existing backup download UI.

-   Improved Agents Server migration failure diagnostics so blocked or broken SQL runs now report actionable context instead of only dumping the raw PostgreSQL error:

    -   Added shared migration failure enrichment in the Agents Server migration runner, so manual migrations, automatic startup checks, and managed-server migration flows now include the failing stage, selected prefixes, and current prefix/migration file when available.
    -   Detect advisory-lock timeouts caused by waiting on `pg_advisory_lock(...)` and explain that another migration process is likely holding the lock until PostgreSQL `statement_timeout` cancels the wait.
    -   Kept downstream PostgreSQL logging compatible by preserving the original `pg` error fields on the branded migration error while making the CLI output print the richer human-readable message directly.

-   Simplified the Agents Server control panel so the dropdown now uses one consistent tile grid instead of mixing an overview banner with separate lower cards:

    -   Removed the redundant overview summary card from the control panel header because it only repeated the state already visible in the individual controls.
    -   Reworked the lower Theme, Language, Chat visual mode, and Enter-key preference controls into the same icon-tile visual language as the existing top toggles, keeping the compact dropdown more consistent and easier to scan.
    -   Kept the richer dedicated keybindings settings page unchanged, while using one shared control-panel state model and adding regression coverage for the new unified tile layout.

-   Fixed the remaining Agents Server dark-mode regressions across homepage surfaces, chat layouts, control-panel keybinding cards, and new-agent creation dialogs:

    -   Replaced the light-only homepage directory background and card overlays with shared dark-aware route/card surfaces, so the agents home and folder views no longer fall back to bright page chrome in dark mode.
    -   Reworked the shared Enter-key preference cards and first-run prompt used by the control panel, keeping the keyboard previews, helper states, and dismiss actions readable in dark mode instead of rendering as white tiles inside the dark panel.
    -   Centralized dark-aware wizard surface, input, chip, and preview styling for the new-agent flow and advanced editor dialog, so selected presets, upload/setup panels, mocked chat previews, and the raw book editor all render as finished dark UI rather than bright fallback blocks.

-   Added completed sample Book agent definitions in `agents/default`, so the built-in examples now demonstrate realistic Book 2.0 patterns instead of placeholder drafts:

    -   Finished the previously sketched sample agents such as `Product Manager`, `Správce kalendáře`, `Copywriter`, `Firemní advokát`, `Social Media Manager`, `Webmaster`, `Chat nad firemními dokumenty`, `Chat na webu`, and `Aktualizátor prezentací` with concrete `GOAL`, `RULE`, `INITIAL MESSAGE`, and tool commitments.
    -   Added a new `agents/default/knowledge` folder with reusable example knowledge documents referenced from the sample agents via local `KNOWLEDGE ./knowledge/...` commitments.
    -   Kept all of the new sample agents `CLOSED` so they act as deterministic examples of static agent definitions.

-   Fixed Agents Server standalone chat-route loading so the skeleton now matches the page that actually resolves instead of briefly showing a different card-style shell:

    -   Reused the shared chat loading skeleton for `/agents/[agentName]/chat`, including the default collapsed sidebar geometry, so the route fallback stays aligned with the durable chat layout.
    -   Kept the optimistic profile-to-chat handoff bubble and composer placeholder, but layered them onto the shared chat shell instead of maintaining a separate loading layout.
    -   Made the standalone chat loading route respect `?headless`, so embedded chat transitions do not render the desktop sidebar skeleton.

-   Added a metadata-controlled default agent avatar visual in Agents Server, so agents without `META IMAGE` can switch away from the built-in octopus globally while keeping one shared fallback pipeline:

    -   Added new metadata key `DEFAULT_AGENT_AVATAR_VISUAL` with default value `OCTOPUS3`, derived its allowed values from the shared built-in avatar registry, and resolved invalid values back to the safe `Octopus3` fallback.
    -   Wired the metadata-resolved visual through the live Agents Server avatar components, the remote agent profile API payload, and the generated `/images/default-avatar.png` route, so interactive UIs and static fallback images stay aligned.
    -   Kept the change avatar-visual-agnostic by reusing one shared resolver instead of hardcoding `Octopus3` across metadata defaults, layout wiring, and avatar image generation paths.

-   Added per-agent default avatar visual selection through the new `META AVATAR` commitment in Agents Server:

    -   Parsed `META AVATAR` into normalized `meta.avatar` values derived from the shared built-in avatar registry, so forms like `PIXEL_ART`, `pixel art`, and `pixel-art` all resolve to the same visual.
    -   Made `META AVATAR` override the metadata-controlled `DEFAULT_AGENT_AVATAR_VISUAL` for both live avatar components and the generated `/images/default-avatar.png` fallback route, while keeping explicit `META IMAGE` as the highest-priority image override.
    -   Reused the shared avatar visual resolver for metadata, parser, remote profile payloads, and documentation so future built-in visuals become selectable without maintaining separate option lists.

-   Suppressed default agent-profile navigation in Agents Server so generic agent clicks now open a fresh chat instead of landing on the profile page:

    -   Replaced shared agent entry links across homepage cards and visualizations, graph nodes, header agent navigation, search results, teammate capability chips, and directory context-menu actions with fresh-chat URLs that force `chat=new`.
    -   Kept the agent profile page itself available for direct/profile-specific navigation, while preserving explicit profile/share URLs in places that still need the canonical agent page.
    -   Added regression coverage for the shared fresh-chat href builder and updated office-layout route expectations so local and federated agent entry points stay aligned.

-   Added a new `Maze` homepage view to Agents Server that turns the shared office layout into a responsive isometric maze office for built-in agent avatars:

    -   Added the `Maze` tab alongside `List`, `Graph`, `Office`, and `Pixel`, including query-state support and lazy client loading through the existing homepage view-mode plumbing.
    -   Reused the shared office layout and avatar pipeline so local and federated agents render inside themed rooms and corridors in an isometric 2D scene, while built-in avatar visuals use transparent surfaces to stay integrated into the environment instead of inside square cards.
    -   Omitted agents with explicit `META IMAGE` from the maze so the visualization keeps one coherent in-world avatar language, while still remaining avatar-visual-agnostic for future built-in visuals beyond the default octopus family.
    -   Designed the new scene to stay lightweight and theme-aware with CSS-driven corridor and avatar motion, room/desk ambience, responsive pan/zoom on desktop and mobile, and dark-mode styling instead of introducing a heavier continuously animated canvas scene.

-   Made the built-in `Octopus3` avatar visual more diverse across agents, so seeded default avatars now feel more distinct while staying clearly octopus-like:

    -   Reworked `Octopus3` into deterministic morphology families that vary body proportions, blob silhouette, crown highlight, and shadow footprint more broadly from the agent seed instead of clustering around one similar mantle shape.
    -   Expanded the shared ribbon-tentacle generator with opt-in shape scales and used them in `Octopus3`, so different agents can now render noticeably different arm counts, reach, spread, thickness, and motion without shifting other octopus-family visuals.
    -   Added deterministic regression coverage for the new `Octopus3` morphology profiles and tentacle scaling, keeping the broader variety intentional while preserving anchored tentacle roots inside the mantle.

-   Added full light/dark theming to Agents Server with a persisted per-user theme preference and consistent dark-mode support across the app shell, control panel, chat surfaces, editors, and Monaco-based tools:

    -   Added a new theme preference stored alongside the other browser-user settings, exposed it in the control panel as `System`, `Light`, and `Dark`, and applied it immediately on first paint with shared client/server theme bootstrapping.
    -   Extended the shared Promptbook `Chat`, `MockedChat`, `BookEditor`, and nested Monaco/code-block renderers so Agents Server can pass an explicit resolved theme instead of relying on document-level inference.
    -   Updated Agents Server shell, header, dialogs, chat routes, book/history editors, admin custom CSS/JS editors, and global styling tokens so both light and dark mode render as complete, polished themes rather than a partially inverted UI.

-   Reworked the Agents Server backup download so the archive now follows user-facing data instead of raw database tables:

    -   Flattened metadata and limits into one key-value JSON file, kept the existing agents/books layout, and changed conversations into per-chat JSON exports with sidecar metadata for feedback details.
    -   Exported one JSON file per user with memories, structured user data, and wallet records redacted to omit secrets, while keeping uploaded files and generated media as original binaries paired with restore metadata sidecars.
    -   Switched the backup page UI to selectable user-facing sections, moved security and cache/runtime parts into explicit "always excluded" notes, and exported messages as one JSON file per message with delivery history instead of raw send-attempt tables.

-   Optimized Agents Server default avatar visuals so animated built-in avatars, especially the octopus family, use substantially less rendering work without changing their look or capabilities:

    -   Reworked the shared `src/avatars` runtime to use one global animation-frame scheduler, pause avatar animation when the canvas is off-screen, and keep pointer-tracking bounds cached between frames instead of forcing repeated layout reads for every live avatar.
    -   Fixed the shared canvas preparation path so avatar renders no longer recreate the canvas backing store on every frame, preserving the same visual output while removing a major source of CPU/GPU churn across all built-in avatar visuals.
    -   Kept the optimization avatar-visual-agnostic by applying it in the common renderer used by Agents Server chat, profile, modal, and shared avatar surfaces, and added regression coverage for the new canvas reuse behavior.

-   Fixed Agents Server agent profile avatar visuals so built-in default avatars now render centered inside the tall profile card instead of sitting oversized near the bottom edge:

    -   Replaced the profile page's bottom-aligned built-in avatar layout with one centered square stage, so default visuals such as the octopus family fit the card consistently without depending on visual-specific tweaks.
    -   Reduced the built-in avatar footprint on the profile page while leaving thumbnail and explicit `META IMAGE` rendering behavior unchanged across other surfaces.
    -   Added component regression coverage for the shared profile card layout so future avatar-visual changes keep the centered, size-constrained presentation.

-   Added the new `USE DEEPSEARCH` commitment for Book 2.0 agents and Agents Server, so agents can explicitly request deeper web research instead of lightweight search:

    -   Added `USE DEEPSEARCH` to the commitment registry, fast agent-source parsing, and standalone Book language documentation, including aggregated system-message guidance and regression coverage for the new commitment.
    -   Compiled `USE DEEPSEARCH` into a dedicated `deep_search` tool instead of reusing regular `web_search`, keeping the capability explicit in model requirements and chat/tool UIs.
    -   Implemented the Agents Server runtime with native OpenAI Agents SDK primitives by mapping `deep_search` to a nested deep-research agent that uses hosted OpenAI web search, while keeping a local SERP-backed fallback tool implementation for non-AgentKit paths.

-   Improved built-in agent avatar visuals so the default animated octopus now feels more alive and polished across Agents Server and the utils avatar playground:

    -   Added one shared avatar interaction layer in `src/avatars` that tracks desktop cursor and mobile touch position once, then feeds smoothed gaze/body motion into the live canvas renderers without duplicating behavior across Agents Server and utils preview surfaces.
    -   Updated the octopus-family visuals, including the default `Octopus3` agent avatar, so their eyes now follow the viewer and the body subtly leans with the interaction while preserving the existing deterministic palette/shape generation.
    -   Fixed visible animation resets caused by harmless React re-renders by keying the shared avatar animation loop off normalized avatar data instead of transient object identity, keeping the morphing loop continuous instead of snapping back to the start.

-   Refined the built-in `Octopus3` avatar visual so tentacle roots now emerge cleanly from the mantle instead of appearing clipped or detached near the head:

    -   Anchored `Octopus3` tentacle roots against the generated mantle silhouette instead of distributing them on a fixed horizontal band, so outer tentacles no longer start from visible empty space on some seeded avatars.
    -   Kept the shared ribbon-tentacle generator backward compatible by making the new body-aware anchoring opt-in, limiting the visual change to `Octopus3` instead of shifting `AsciiOctopus` and other visuals at the same time.
    -   Added deterministic geometry regression coverage that checks seeded `Octopus3` tentacle roots stay inside the generated mantle silhouette across multiple avatar seeds.

-   Fixed Agents Server teammate-call popups so the internal TEAM conversation now renders immediately as a visible mocked chat instead of opening with an empty-looking blank panel:

    -   Kept the existing TEAM tool-call modal and shared `MockedChat` renderer, but prefilled the teammate exchange from the stored `conversation` payload so the popup shows the full internal discussion as soon as it opens.
    -   Preserved the existing request/response fallback path for older TEAM payloads that do not include a structured `conversation`, so the popup still shows a two-message mocked chat instead of an empty area.
    -   Added regression coverage for both structured TEAM conversations and the request/response fallback inside the shared chat modal component.

-   Improved Agents Server agent profile avatars so default agents now use the shared animated `Octopus3` visual and profile cards render built-in visuals directly on the tall card background instead of inside a smaller framed square:

    -   Switched the shared default fallback avatar from `Octopus2` to `Octopus3`, so profile APIs, live agent UIs, and generated `default-avatar.png` routes all inherit the same updated built-in visual without per-surface overrides.
    -   Added a shared avatar surface mode that lets deterministic visuals render either in their existing framed square or transparently on top of a parent card, keeping future avatar-presentation changes DRY instead of special-casing the agent profile page.
    -   Updated the Agents Server agent profile card to show built-in avatar visuals larger and more prominently, with the profile card itself owning the background instead of nesting the octopus inside a second square box.

-   Fixed `ptbk coder run` rich UI time estimation so elapsed time, total duration, and ETA now advance correctly during normal `--no-wait` runs:

    -   Started the rich dashboard timer immediately like the plain CLI progress header, while still excluding explicit wait/pause periods, so the shared estimate logic now receives real elapsed active time instead of staying pinned at `0s`.
    -   Added regression coverage for the rich UI state so a run that has already completed prompts no longer reports `Total 0s` and an ETA equal to the current clock time.
    -   Hardened the Agents Server build verification path on Windows, so `npm run test-for-ptbk-coder` no longer aborts when Next.js worker cleanup or the temporary prerender server hits `kill EPERM` during best-effort shutdown.

-   Fixed Agents Server header navigation so the shared server logo/name link now reliably reaches the homepage even when client-side routing stalls on agent pages:

    -   Hardened the shared Agents Server client navigation helpers with one reusable hard-navigation fallback, so header links, search navigation, and other shared `router.push(...)` flows recover automatically when the SPA transition never updates the URL.
    -   Reused the same fallback logic in the agent profile chat navigation helper, keeping the stalled-navigation recovery DRY instead of maintaining a second copy of the timeout-and-assign logic.
    -   Added regression coverage for navigating to the homepage from both desktop and mobile header branding while already on an agent profile page.

-   Added the new deterministic `Octopus3` avatar visual alongside the existing avatar set, with a morphing alien mantle and more visible ribbon tentacles that vary from the agent name, hash, colors, and animation time:

    -   Added the new built-in `octopus3` canvas renderer to the shared avatar registry without changing the existing `Octopus`, `Octopus2`, pixel-art, Minecraft, or Fractal visuals.
    -   Extracted the shared smooth organic octopus geometry helpers so `Octopus2` and `Octopus3` stay DRY while keeping `Octopus2` visually unchanged.
    -   Updated the existing utils `/avatars` playground and regression coverage so the new renderer appears in the selector, preview grid, deterministic sample gallery, and supported URL-state parsing without creating a separate page.

-   Fixed Agents Server chat progress checklists so in-progress items show an animated spinner and completed items render a visible checkmark again:

    -   Fixed the shared chat markdown progress-marker styling used by Agents Server progress cards, so the completed-state checkmark no longer collapses and disappears inside checklist items.
    -   Kept the progress-state rendering DRY by fixing the shared `@promptbook-local/components` markdown checklist marker instead of adding Agents Server-specific progress UI logic.

-   Fixed Agents Server chat reply notifications so the “new message” sound and vibration now play only after a live assistant reply finishes, not for the initial seeded message or preloaded chat history.

-   Fixed `ptbk coder run` pausing/resuming so the runner now behaves as an explicit three-state flow: `running`, `pausing`, and `paused`:

    -   Kept the shared pause controller DRY by routing both the plain terminal listener and the rich UI hotkey through the same toggle lifecycle, so pressing `P` while running requests a pause, pressing it again while pausing cancels that request, and pressing it while paused resumes the runner.
    -   Tightened the main `scripts/run-codex-prompts` loop so a pending pause is checked again immediately before each new task starts, which prevents `--no-wait` runs from launching another prompt after the current one finishes when the user already requested a pause.
    -   Updated the rich `ptbk coder run` dashboard to render distinct `PAUSING` and `PAUSED` states, including pause-aware badges, footer controls, and animation timing so the UI stays visibly active while the current task is finishing and then becomes fully paused before the next task.

-   Optimized `ptbk coder generate-boilerplates` emoji selection so large repositories no longer rescan every file against every emoji on each run:

    -   Replaced the old nested `files x emojis` string-search loop with a shared bracketed-emoji scanner that reads each file once and extracts matching tags with a compiled regex, which also speeds up the related `ptbk coder find-fresh-emoji-tags` path.
    -   Added a best-effort persisted cache in `.promptbook/ptbk-coder/emoji-tag-scan-cache.json`, so unchanged files reuse their previously discovered emoji tags across repeated boilerplate-generation runs instead of being reread every time.
    -   Updated `ptbk coder init` gitignore bootstrapping to ignore the new `.promptbook/ptbk-coder` cache directory while preserving existing project rules without duplicating unchanged entries.

-   Fixed published `ptbk` CLI packaging so installed `ptbk` commands now run directly without `npx`:

    -   Replaced the generated `ptbk` wrapper placeholder with a real Node proxy that resolves and executes the published `@promptbook/cli` launcher through the installed `promptbook` dependency, so `ptbk ...` works for both hoisted and nested installs.
    -   Fixed generated package dependency detection for side-effect-only and subpath ESM imports, so published CLI manifests now include runtime dependencies such as `@supabase/supabase-js` and `react-dom` when the bundle imports `@supabase/supabase-js` or `react-dom/server`.
    -   Added regression coverage for both generated `ptbk` executable files and runtime dependency detection, keeping the forwarding launcher in package generation instead of relying on a checked-in placeholder script.

-   Improved Agents Server optimistic folder/query navigation so slow same-page server renders no longer block common workspace browsing flows:

    -   Moved homepage and dashboard folder/view query handling onto a shared client-side section wrapper, so opening folders, returning to parent folders, and switching homepage view modes now update immediately while reusing the existing client-maintained agent/folder snapshot.
    -   Replaced homepage and recycle-bin folder query pushes with one shared current-path history helper, keeping the URL in sync without waiting for a server round-trip when the page already has the data needed to render the next folder.
    -   Added opt-in same-path optimistic behavior to the shared `HeadlessLink` and enabled it across the main header folder-navigation links, so folder navigation from the header now feels immediate on the homepage as well.

-   Changed Agents Server default agent avatars to the shared animated `Octopus2` visual whenever an agent does not define `META IMAGE`, while still honoring explicit `META IMAGE` overrides and `META COLOR` palettes across agent cards, chat UI, profile views, metadata images, and default avatar image routes:

    -   Added one shared avatar-resolution contract that can return either an explicit image or a deterministic built-in visual, keeping the fallback logic DRY and making future default-visual swaps straightforward.
    -   Replaced the old AI-generated default-avatar route output with a deterministic `Octopus2` PNG rendered from the shared avatar visual system, so OG images, manifests, icons, embeds, push notifications, and other image-only surfaces now inherit the same default avatar, while preserving the legacy generated-image flow behind an explicit `?mode=generated` opt-in.
    -   Updated interactive Agents Server surfaces such as homepage agent cards, folder previews, graph nodes, header breadcrumbs, profile cards, and chat participant rendering to show the live animated visual instead of a static fallback image when no explicit `META IMAGE` is set.

-   Enhanced the `ptbk coder run` octopus branding so the dashboard now opens with a wider animated mascot that uses space more efficiently while prompts are actively running:

    -   Replaced the stacked octopus-and-terminal splash with a horizontal octopus illustration that keeps the head on the left, tentacles on the right, and only the natural `ptbk.io` label inside the visual.
    -   Moved the branding art into a dedicated reusable UI helper and extracted shared ANSI text-layout helpers so the frame builder and animated brand stay DRY.
    -   Tied the octopus motion to the same active-phase refresh gate as the timed UI redraws, increasing the refresh cadence so tentacles visibly animate during loading/running/verifying without reintroducing idle-state flicker.

-   Refined `ptbk coder run` rich terminal branding so the dashboard now opens with standalone `ptbk.io` octopus art and a more readable session summary:

    -   Replaced the boxed `Brand` header with a centered colorful octopus-and-terminal illustration, keeping the branding outside the framed status sections as requested.
    -   Moved runner/config metadata into the `Session` box and reorganized it into labeled state, runner, context, test, current-run, backlog, scope, timing, and progress rows.
    -   Refactored the rich UI frame builder so the session summary is assembled through shared helpers instead of duplicating config strings across separate header sections.

-   Improved Agents Server optimistic route rendering so slow server responses no longer keep users staring at the previous screen during common navigation:

    -   Switched same-origin desktop header dropdown navigation and shared context-menu links back onto the Next app router, so admin, system, docs, and agent-route selections now trigger client navigation with the existing route-loading UX instead of forcing a full document reload.
    -   Replaced the agent profile action links with the shared `HeadlessLink`, preserving fast client-side transitions and the `?headless` query handoff for internal agent pages.
    -   Added reusable console/docs loading skeletons and wired them to the slow route families that previously had no segment-level fallback: `/admin`, `/system`, `/docs`, `/swagger`, `/recycle-bin`, and `/agents/[agentName]/timeouts`.

-   Improved Agents Server modal dismissal UX so edit dialogs and popups can now be closed by an intentional outside click without reintroducing accidental data loss:

    -   Reworked the shared portal `Dialog` backdrop handling to dismiss only when the pointer both starts and ends on the backdrop with minimal movement, which avoids closing while users drag, select text, or otherwise finish an interaction outside the modal.
    -   Enabled outside-click dismissal for the guarded create/edit flows such as the new-agent editor and wizard, folder editor, wallet dialog, login/change-password dialogs, create-server wizard, pseudo-user reply dialog, and async prompt/visibility popups, while continuing to reuse their existing unsaved-changes confirmation prompts before discarding progress.
    -   Added a dirty-close guard to the agent timeout edit dialog so both its close button and intentional outside clicks now confirm before discarding unsaved timeout edits.

-   Fixed Agents Server shared navigation links so header, drawer, and menu links still navigate reliably when surrounding UI state closes immediately on click:

    -   Updated the shared `HeadlessLink` helper to drive same-origin client navigation itself for normal left-clicks, which keeps route changes working even when a drawer or dropdown unmounts the clicked link during the same event.
    -   Added regression coverage for homepage branding navigation on desktop and mobile, plus a unit test that verifies shared links still navigate after their own click handler removes them from the tree.

-   Added the new deterministic `Fractal` avatar visual alongside the existing avatar set, with layered dragon-curve geometry that changes its ribbon composition, orientation, and color interplay from the agent name, hash, and colors:

    -   Added the new built-in `fractal` canvas renderer to the shared avatar registry without changing the existing Octopus, Octopus2, pixel-art, or Minecraft visuals.
    -   Kept the utils `/avatars` playground on the existing page while automatically exposing the new renderer in the selector, preview grid, and deterministic sample gallery through the shared avatar registry.
    -   Added regression coverage that verifies `fractal` stays registered as a supported avatar visual and remains selectable through the utils avatar playground URL state.

-   Added the new deterministic `Octopus2` avatar visual alongside the existing avatar set, with a single smooth morphing blob silhouette that keeps an octopus-like form while changing its organic alien shape from the agent name, hash, colors, and animation time:

    -   Added the new built-in `octopus2` canvas renderer to the shared avatar registry without changing the existing `Octopus`, pixel-art, or Minecraft visuals.
    -   Updated the utils `/avatars` playground so the new renderer appears in the existing selector, preview grid, and deterministic sample gallery without creating a separate page.
    -   Added regression coverage that verifies `octopus2` stays registered as a supported avatar visual and remains selectable through the utils avatar playground URL state.

-   Fixed Agents Server teammate tool execution so TEAM calls like `team_chat_slave` now stay callable after the chat runtime is initialized:

    -   Reworked `apps/agents-server/src/tools/getAllToolFunctionsForServer.ts` to preserve the live commitment tool-function proxy instead of flattening it into a one-time snapshot, which keeps dynamically registered TEAM tools available to the JavaScript execution layer.
    -   Added a regression test that creates the server tool registry before compiling a TEAM-enabled agent and verifies the newly registered teammate tool becomes available afterward.

-   Fixed published `@promptbook/*` package manifests so built-in TypeScript declarations now resolve correctly in downstream projects without extra `@types/*` packages:

    -   Updated generated package manifests to point both `types` and `typings` at the declaration entrypoints Rollup actually emits in `esm/src/_packages/*.index.d.ts` instead of the stale non-existent `esm/typings/...` path.
    -   Added regression coverage for generated package entrypoint metadata so buildable packages keep matching runtime/type entrypoints and `@promptbook/types` continues to publish declarations without fake runtime bundles.

-   Fixed rich `ptbk coder run` terminal UI flicker so long-running coding sessions no longer keep blinking the whole dashboard while waiting or streaming output:

    -   Replaced the unconditional `200ms` full-frame repaint loop with an adaptive refresh policy that keeps timed redraws only for active running phases and stays visually still in waiting, paused, done, and error states.
    -   Changed the ANSI renderer to rewrite only the frame lines whose visible content changed, which greatly reduces flicker during live agent output and other incremental updates.
    -   Kept the live-output panel at a stable height so the frame no longer keeps resizing as the first streamed lines arrive.
    -   Added regression coverage for the new refresh gating and the stable live-output frame height.

-   Fixed `ptbk coder run` successful prompt rounds so temporary runtime `.log.txt` files no longer dirty the Git working tree between tasks:

    -   Updated the shared coding-agent commit helper to stage all round changes first and then unstage selected temporary artifacts before `git commit`, keeping the logic DRY for future exclusions.
    -   Excluded the per-round live runtime log from default successful commits unless `--preserve-logs` is explicitly enabled, so each finished prompt now stays self-contained in one clean commit without leaving a missing tracked log behind.
    -   Added regression coverage for the new excluded-path staging flow in the shared Git commit helper.

-   Hardened Agents Server durable chat jobs against false background-worker lease expirations during long-running Vercel chat turns:

    -   Added a bounded timeout to each `UserChatJob` heartbeat renewal, so one stuck Supabase lease-update call can no longer wedge the entire serialized heartbeat loop until the lease expires.
    -   Changed the default heartbeat failure budget to span the full durable-job lease window instead of aborting a running chat turn after only three missed renewals, which better matches long-running background tasks and transient Vercel/Supabase stalls.
    -   Extended expired-job diagnostics to record the heartbeat timeout threshold alongside the worker duration, lease duration, and heartbeat cadence used when the failure snapshot was captured.
    -   Added regression coverage for the new heartbeat failure budget and the timed-out heartbeat query path.

-   Deprecated `PERSONA` in favor of `GOAL` for agent profile text and inheritance-safe rewrites:

    -   Updated `parseAgentSource` and related profile consumers to derive `personaDescription` from the last `GOAL` / `GOALS` commitment, while still falling back to deprecated `PERSONA` / `PERSONAE` for backward compatibility.
    -   Changed commitment compilation so only the last effective `GOAL` survives inherited or rewritten sources, preventing stale parent goals from accumulating in the final system message and prompt suffix.
    -   Marked `PERSONA` as deprecated in commitment metadata and Book editor diagnostics, and updated the New Agent wizard to emit only `GOAL`, folding selected persona traits into the generated goal text.
    -   Added regression coverage for single-vs-multiple goal precedence, goal-over-persona profile resolution, inherited goal overrides, and the updated wizard source output.

-   Added `--preserve-logs` to `ptbk coder run`, so successful coding rounds can now keep their generated runner shell and shared runtime log files for debugging and analytics, while failed rounds automatically preserve those artifacts even without the flag:

    -   Threaded the new option through the CLI wrapper and legacy `scripts/run-codex-prompts` option parser.
    -   Refactored prompt-round temp artifact cleanup to decide once per whole round, which keeps runner `.sh` and `.log.txt` files after final failures without leaking artifacts from transient internal retries.
    -   Kept generated verification `.test.sh` files temporary, while continuing to preserve the original prompt `.md` files in `prompts/` as before.

-   Added `--preserve-logs` to `ptbk coder run` / `scripts/run-codex-prompts`, so successful runs can now keep their generated temp prompt artifacts for debugging and analytics while the default behavior still cleans them up automatically:

    -   Routed the new flag through the CLI wrapper, legacy option parser, and shared runner options without duplicating per-runner cleanup logic.
    -   Updated the shared temp shell/log lifecycle so successful runs preserve `.sh`, `.test.sh`, and `.log.txt` files only when explicitly requested, while failed runs now keep those artifacts automatically for post-mortem debugging.

-   Added live temporary `.log.txt` shell tracing to `ptbk coder run`, so each prompt round now writes the raw runner/test shell input and streamed output into a sibling debug log such as `prompt-1.log.txt` while the agent is running and then deletes that log again after the round finishes:

    -   Routed both the main runner shell and the optional verification `.test.sh` shell through one shared runtime-log pipeline so the log file updates progressively in real time for debugging without duplicating shell-runner logic.
    -   Scoped the new log file lifecycle to a single prompt-processing round, matching the existing temporary shell artifacts and cleaning it up after both successful and failed runs.
    -   Hardened shared temp-shell cleanup so `.sh` / `.test.sh` files are now removed even when the underlying shell command fails.

-   Fixed published `ptbk coder init` CLI bootstrapping so standalone projects no longer depend on an accidentally missing or differently-shaped local `typescript` install:

    -   Normalized runtime loading of the `typescript` package before `mergeStringRecordJsonFile` calls `parseConfigFileTextToJson`, so bundled CLI builds now handle both direct module namespaces and `default`-wrapped imports when parsing JSONC files such as `tsconfig.json`.
    -   Updated package generation metadata so `@promptbook/cli` explicitly publishes the required `typescript` runtime dependency, with the version resolved from the root manifest even though it is maintained in `devDependencies`.

-   Fixed TEAM teammate prompting so model-facing TEAM guidance now keeps both the original commitment instructions and resolved teammate profile hints:

    -   Updated `src/commitments/TEAM/TEAM.ts` to carry parsed TEAM instruction text into teammate tool descriptions and the TEAM system-message section instead of dropping that guidance after URL resolution.
    -   Added explicit TEAM system-message guidance telling agents to consult relevant teammates before asking the user for information that a listed teammate can provide directly.
    -   Fixed Agents Server chat runtimes to reuse already resolved model requirements during actual agent execution, so compact teammate references such as `TEAM Ask for anything {slave}` now reach the model as callable `team_chat_*` tools instead of being lost during a second unresolved compilation pass.
    -   Replaced ad-hoc agent prompt debug dumps with structured verbose logging that shows whether precomputed model requirements, teammate tools, and prompt-level tool merges were actually forwarded to the model.

-   Changed `ptbk coder run` / `scripts/run-codex-prompts` git pushing to opt-in mode, so coding-agent runs now keep commits local by default and only push when `--auto-push` is explicitly provided:

    -   Replaced the old disable-style `--no-push` flag with the clearer `--auto-push` opt-in flag across the CLI wrapper, legacy option parser, and shared runner options.
    -   Updated coder documentation and examples to describe the safer default and the explicit push workflow.

-   Added a dedicated Agents Server limits configuration surface so operational quotas no longer live only in metadata blobs and hardcoded constants:

    -   Added the new `ServerLimit` database table plus shared `constants/serverLimits.ts` and `utils/serverLimits.ts` helpers so defaults, validation, deprecated metadata mapping, and runtime reads stay DRY.
    -   Added the new admin page `/admin/limits`, kept `/admin/tool-limits` as a backward-compatible redirect, and linked Metadata/Limits together through a shared configuration sub-navigation.
    -   Moved timeout caps, file upload size, federated import retry delay, and `spawn_agent` depth/rate-window limits onto the dedicated limits service while keeping legacy metadata rows like `TOOL_USAGE_LIMITS`, `MAX_FILE_UPLOAD_SIZE_MB`, and `FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS` mirrored for backward compatibility.
    -   Updated `/admin/metadata` to clearly mark limit-backed metadata rows as deprecated, make them read-only in that screen, and send admins to the dedicated Limits page instead.

-   Refactored Agents Server `useBrowserPushNotificationsState.ts` into smaller focused private browser-push hooks without changing external behavior:

    -   Split persisted settings bootstrap, permission synchronization, subscription/service-worker mutations, user-facing enable-disable actions, and consistency effects into dedicated private hooks so `useBrowserPushNotificationsState` now reads as a thin composition layer.
    -   Kept the existing browser permission prompting, server preference persistence, service-worker registration, subscription upsert/delete cleanup, default-off hint persistence, auto-prompt-after-message flow, and focused-chat synchronization intact while reducing branching complexity in the hook.

-   Refactored Agents Server `useNewAgentWizard.ts` into smaller focused private wizard helpers without changing external behavior:

    -   Extracted the wizard's preset/chip/team mutations, knowledge-upload and drag-and-drop orchestration, and source/submission actions into dedicated private modules so `useNewAgentWizard.ts` now reads as a thin composition layer.
    -   Kept the existing wizard state flow, dirty-close guarding, knowledge URL/file handling, advanced-editor handoff, and direct-create behavior intact while reducing responsibility density in the hook.

-   Refactored Agents Server `useAgentsListFolderState.ts` into smaller focused private folder-management helpers without changing external behavior:

    -   Split the branching-heavy folder state into dedicated private dialog, deletion, visibility, and API helpers so `useAgentsListFolderState` now reads as a thin composition layer.
    -   Kept the existing folder create/edit dialog flow, breadcrumb refresh after rename, subtree delete handling, and subtree visibility updates intact while making the homepage folder logic easier to follow and maintain.

-   Refactored Agents Server `useAgentsGraphState.ts` into smaller focused private graph helpers without changing external behavior:

    -   Extracted graph query/filter synchronization, canvas/layout/highlighting state, and download/export handling into dedicated private modules so `useAgentsGraphState` now reads as a thin composition layer.
    -   Kept the existing graph selection, hover highlighting, drag-position persistence, viewport fitting, and PNG/SVG/ASCII export behavior intact while reducing the hook's responsibility density.

-   Refactored Agents Server `useHeaderDropdownState.ts` into smaller focused private header-dropdown helpers without changing external behavior:

    -   Extracted nested submenu state, desktop hover/click timing, mobile drawer state/effects, and repeated per-menu desktop controllers into dedicated private modules so `useHeaderDropdownState` now focuses on composing the shared header dropdown behavior.
    -   Kept the existing desktop preview vs interactive dropdown behavior, nested submenu portals, touch-outside dismissal, mobile drawer swipe handling, scroll locking, and first-open hoisted mobile section behavior intact while reducing responsibility density in the hook.
    -   Prevented the extracted desktop and nested dropdown hooks from clearing freshly scheduled hover timers during initial hydration, preserving the first desktop hover-open interaction after agent-view navigation.

-   Refactored Agents Server `HeaderSearchBox.tsx` into a thinner facade plus focused private search helpers without changing external behavior:

    -   Moved debounced query orchestration, search fetching, active-option bookkeeping, and keyboard navigation into the private `useHeaderSearchBoxState` hook so `HeaderSearchBox.tsx` now focuses on composing the input.
    -   Extracted grouped dropdown rendering into the private `HeaderSearchBoxDropdown` component while preserving the existing search-page action, grouped result list, hover/keyboard highlighting, and navigation behavior.

-   Refactored Agents Server `HeaderMobileDrawer.tsx` into smaller focused private mobile-drawer helpers without changing external behavior:

    -   Split the branching-heavy mobile drawer into focused hoisted-menu, server/agent navigation, user account, and top-level menu helpers so `HeaderMobileDrawer` now reads as a thin composition layer.
    -   Kept the existing federated-server switcher, agent selection/view toggles, search box, hoisted actions, login/account actions, and nested mobile menu rendering intact while reducing branching complexity in the drawer component.

-   Refactored Agents Server `useControlPanelContentState.ts` into smaller focused private control-panel modules without changing external behavior:

    -   Extracted shared state contracts, audio-toggle orchestration, private-mode confirmation, and pure view-model building into dedicated private modules so the public hook now focuses on composing provider state and handlers.
    -   Kept the existing sound, vibration, notifications, self-learning/private-mode, language, chat visual mode, and Enter-key behavior flows intact while making the control-panel code easier to follow and maintain.

-   Refactored Agents Server `AgentDirectoryDropdown.tsx` into a smaller stateful wrapper and focused private menu-column helpers without changing external behavior:

    -   Moved the recursive `AgentMenuColumn` renderer into a dedicated private module and split folder, action, agent, label, and child-branch rendering into smaller helpers so the dropdown reads more clearly top-down.
    -   Kept the existing touch-first folder expansion, pointer-hover nested columns, action/button/link handling, and navigation callbacks intact while reducing branching density in the dropdown rendering path.

-   Refactored Agents Server `ClientVersionMismatchListener.tsx` into smaller focused private client-version helpers without changing external behavior:

    -   Split mismatch subscription, fetch interception, response inspection, auto-refresh countdown orchestration, and overlay rendering into dedicated private modules so `ClientVersionMismatchListener.tsx` now reads as a thin composition layer.
    -   Kept the existing mismatch reporting, 426/header detection, focus-gated 7-second refresh countdown, manual refresh/pause controls, and overlay copy/styling intact while reducing branching complexity in the listener component.

-   Refactored Agents Server `useAgentContextMenuItems.ts` into smaller private context-menu helpers without changing external behavior:

    -   Moved the branching-heavy action logic and clipboard-feedback state into dedicated private hooks so `useAgentContextMenuItems` now focuses on composing menu sections.
    -   Split rename, clone, delete, URL-update, and visibility flows into focused helpers while preserving the existing dialogs, redirects, admin links, and copy/share behavior.

-   Added a rich terminal UI for `ptbk coder run` that replaces the raw console output with a branded interactive dashboard:

    -   Displays Promptbook Coder branding, active agent name, model, thinking level, context, and priority in a compact header section.
    -   Shows a live progress bar with session/total prompt counts, elapsed time, and estimated completion time that ticks every second.
    -   Streams the coding agent's real-time thinking output in a scrolling area within the UI, keeping the last 12 lines visible.
    -   Integrates pause/resume controls (press `P`) directly through keyboard input, with a dedicated control bar at the bottom.
    -   Displays retry attempt counts and error messages inline as they occur during test-feedback loops.
    -   Falls back gracefully to the existing console-based output on non-interactive (non-TTY) terminals.
    -   Works universally across all supported runners (OpenAI Codex, GitHub Copilot, Cline, Claude Code, Opencode, Gemini).

-   Added optional `--test <test-command...>` support to `ptbk coder run`, so Promptbook Coder can verify each completed prompt with a shell command, retry the same prompt up to three times with the failing test output fed back into the coding agent, and annotate prompt status lines with retry counts such as `[x] (2 attempts)` or `[!] (failed after 3 attempts)`; Promptbook's local `.vscode/terminals.json` coder workflows now pass `--test npm run test`.

-   Refactored Agents Server `useAgentChatHistorySyncState.ts` into smaller focused private chat-history modules without changing external behavior:

    -   Extracted optimistic chat bookkeeping, payload application, async chat operations, shared error-message resolution, and side-effect wiring into dedicated private modules so `useAgentChatHistorySyncState` now reads as a thinner synchronization facade.
    -   Kept the existing bootstrap selection flow, optimistic new-chat lifecycle, durable draft preservation, active-stream reconnect/polling, failed-send tracking, and cancel/delete behavior intact while reducing the hook's responsibility density.

-   Refactored Agents Server `useBookEditorHistory.ts` into smaller focused private history helpers without changing external behavior:

    -   Split the hook into dedicated loading, named-version save, restore, Escape-close, and selection-synchronization helpers so `useBookEditorHistory` now reads as a thin composition layer.
    -   Kept the existing history filtering, autosave coordination, restore confirmation, diagnostics refresh, and side-panel interactions intact while making each step easier to follow and maintain.

-   Refactored Agents Server `apps/agents-server/src/app/agents/[agentName]/api/calendar-events/route.ts` into smaller focused calendar-operation helpers without changing external behavior:

    -   Split the branching-heavy `executeCalendarOperation` flow into dedicated per-operation executors and shared provider-input builders so the route now reads top-down.
    -   Kept the existing scope resolution, calendar connection lookup, token handling, activity logging, request normalization, and JSON response shapes intact while removing repeated event-input shaping.

-   Refactored Agents Server `AgentProfileChat.tsx` into smaller focused private helpers without changing external behavior:

    -   Moved the profile-to-chat navigation orchestration, SPA-stall fallback, and transition timers into the private `useAgentProfileChatNavigation` hook so `AgentProfileChat.tsx` no longer mixes rendering with navigation bookkeeping.
    -   Extracted resumable-chat loading into the private `useAgentProfileChatExistingChats` hook and consolidated mobile-menu, initial-message, and feedback-translation derivation into focused helpers while preserving the existing optimistic handoff, private-mode behavior, deleted-agent banner, and preview chat rendering.

-   Refactored Agents Server `AgentProfileChat.optimisticNavigation.test.tsx` into smaller optimistic-navigation test helpers without changing external behavior:

    -   Moved the render-only mock chat components into the private `AgentProfileChatOptimisticNavigationTestComponents` module so the scenario file no longer mixes behavior assertions with mocked UI implementation details.
    -   Extracted the mocked bootstrap/setup lifecycle, pending-bootstrap orchestration, and stable render/assertion helpers into the private `AgentProfileChatOptimisticNavigationTestSupport` facade so the main test file now focuses on the three profile-to-chat handoff scenarios.

-   Refactored Agents Server `UsageClient.tsx` into a smaller private usage-state module without changing external behavior:

    -   Moved search-param synchronization, analytics loading, selected-scope derivation, timeframe-label formatting, and mutual agent/folder filter coordination into the private `useUsageClientState` hook so `UsageClient.tsx` now reads as a thin composition layer.
    -   Kept the existing filter semantics, loading/error handling, analytics rendering, and query synchronization intact while also removing the local pathname nullability issue from the router replacement flow.

-   Refactored Agents Server `useServersRegistryState.ts` into smaller focused private server-registry helpers without changing external behavior:

    -   Extracted the `/api/admin/servers` fetch, save, migrate, and delete calls into the private `ServersRegistryApi` helper so the public hook no longer mixes request details with React orchestration.
    -   Split draft management, registry reloads, migration reporting, delete confirmation, and per-action callbacks into focused helpers while preserving the existing editable drafts, dashboard switching, migration summary dialog, current-server deletion confirmation, and redirect behavior.

-   Refactored Agents Server `ImagesGalleryClient.tsx` into smaller focused private image-gallery modules without changing external behavior:

    -   Moved image loading, view-mode resets, infinite-scroll observation, and prompt-copy feedback into the private `useImagesGalleryState` hook so `ImagesGalleryClient.tsx` now reads as a thin composition layer.
    -   Split the view toggle, table view, grid view, and shared prompt/purpose/parameter render helpers into focused private components while preserving the existing table pagination, grid infinite scroll, empty states, prompt copy feedback, and badge styling.

-   Refactored Agents Server `ImageGeneratorTestClient.tsx` into smaller focused private image-generator modules without changing external behavior:

    -   Moved prompt/model state management, sequential generation orchestration, and API response handling into the private `useImageGeneratorTestState` hook so `ImageGeneratorTestClient.tsx` now reads as a thin composition layer.
    -   Split the prompt form, results rendering, and attachment uploading UI into focused private components while keeping the existing single-vs-multiple flows, uploaded-image support, progress updates, status rendering, and raw-result details intact.

-   Refactored Agents Server `FilesGalleryClient.tsx` into smaller focused private file-gallery modules without changing external behavior:

    -   Moved paginated loading, view-mode resets, and grid infinite-scroll observation into the private `useFilesGalleryState` hook so `FilesGalleryClient.tsx` now reads as a thin composition layer.
    -   Extracted the view toggle, table view, grid view, and shared status badge into focused private components while preserving the existing pagination, infinite scroll, file and agent links, status styling, and empty-state behavior.

-   Refactored Agents Server `useCustomJsClientState.ts` into smaller focused private custom-JS modules without changing external behavior:

    -   Moved custom JavaScript file-state normalization, change detection, save reconciliation, and delete fallback handling into the private `CustomJavascriptFileState` module so the public hook focuses on React orchestration and editor actions.
    -   Extracted browser-side `/api/custom-js` load/save/delete helpers into the private `CustomJsApi` module while keeping the existing unsaved-change guarding, analytics wiring, editor actions, and status messaging intact.

-   Refactored Agents Server `useCustomCssClientState.ts` into smaller focused private custom-CSS modules without changing external behavior:

    -   Extracted stylesheet-state normalization, change detection, save reconciliation, and delete fallback handling into the private `CustomStylesheetFileState` module so the public hook focuses on React orchestration.
    -   Moved browser-side `/api/custom-css` load/save/delete helpers into the private `CustomCssApi` module while keeping the existing validation, unsaved-change guarding, editor actions, and status messaging intact.

-   Refactored Agents Server `ChatHistoryClient.tsx` into smaller focused private chat-history modules without changing external behavior:

    -   Kept `ChatHistoryClient.tsx` as the public admin page facade while moving chat-history loading, filters, pagination, view-mode transitions, export URL derivation, and destructive actions into a dedicated private `useChatHistoryState` hook.
    -   Split the filter controls, table rendering, and shared pagination into focused private components while preserving the existing search, agent filter, chat/table toggle, CSV export, per-row delete, and agent-history clearing behavior.

-   Refactored Agents Server `ChatFeedbackClient.tsx` into smaller focused private feedback modules without changing external behavior:

    -   Extracted the feedback loading, agent-option loading, sorting, destructive actions, export URL, and thread-dialog state into a dedicated private `useChatFeedbackState` hook so `ChatFeedbackClient.tsx` now reads as a thin composition layer.
    -   Moved the filter card, feedback table, and chat-thread dialog into focused private components while keeping the existing search, pagination, CSV export, per-row delete, per-agent clear, and thread preview behavior intact.

-   Refactored Agents Server `syncVercelDomainsMain.ts` into smaller focused domain-sync helpers without changing external behavior:

    -   Split the branching-heavy sync orchestration into dedicated context-loading, input-logging, reconfiguration, addition, verification, flagged-domain handling, Cloudflare sync, and completion-summary helpers so `syncVercelDomainsMain` now reads top-down.
    -   Kept the existing database guards, dry-run event payloads, add-and-verify behavior, delete-removed handling, optional Cloudflare skip/reporting flow, and human-readable sync report intact while making each step easier to follow and maintain.

-   Refactored Agents Server `useAgentsListState.ts` into smaller focused homepage hooks without changing external behavior:

    -   Moved route/query handling, folder navigation, federated-agent refresh gating, and agent URL/email building into dedicated private `useAgentsListQueryState` and `useAgentsListNavigationState` helpers so the main hook reads more clearly as a composition layer.
    -   Extracted context-menu and QR-code detail derivation into the private `useAgentsListOverlayDetailsState` helper while keeping the existing synchronization, folder-path recovery, drag-and-drop, dialog, and overlay flows intact.

-   Added repeatable `--ignore` support to `ptbk coder verify` so one verification run can skip prompt candidates whose filename or first prompt line matches a given value case-insensitively:

    -   Extended `ptbk coder verify` to forward repeatable `--ignore` filters into the verifier, allowing commands like `npx ptbk coder verify --ignore Refactor` to skip refactor-only prompts temporarily.
    -   Applied the ignore matching consistently across the verification queue and prompt-file reloads while keeping the existing reverse-order flow intact.

-   Seeded default agents for newly created managed Agents Server instances:

    -   Added create-server bootstrap seeding from repository `agents/default/*.book`, creating one persisted local agent and its initial history snapshot for each default book inside the existing managed-server transaction.
    -   Extracted the shared agent-persistence row builder so the managed-server bootstrap reuses the same normalized agent/hash/permanent-id payload construction as `AgentCollectionInSupabase.createAgent`.

-   Fixed the Agents Server Vercel startup regression where automatic database migrations could break all requests with a blank `500` page:

    -   Changed Next.js instrumentation startup migrations to use a non-blocking advisory-lock path, so one runtime instance can migrate while the others continue serving requests instead of piling up behind `pg_advisory_lock`.
    -   Fixed the automatic-migration promise cache so a single timeout no longer poisons the whole runtime until redeploy, and added structured startup logging with PostgreSQL error details when automatic migration checks fail.

-   Enhanced the Agents Server new-agent wizard team step so it can pick multiple teammates from local and federated servers:

    -   Reworked the wizard team page to reuse the homepage agent-card/grid presentation, load local agents plus federated agents, respect the hidden-core-server federated filter, and let users toggle multiple teammate cards while keeping the existing manual TEAM chip input.
    -   Extended the shared homepage federated-agent loading path with the existing direct-plus-proxy fallback so the wizard and homepage surfaces resolve remote agent cards consistently.

-   Added a branded Agents Server `500 / Internal Server Error` page that now reuses the shared 404-style error layout across both app-router and production fallback errors:

    -   Refactored the app-router application error boundary to render inside the shared `ErrorPage` shell, keeping retry, digest, and report-export actions while making the 500 experience visually consistent with the existing 404 page.
    -   Added a pages-router `500` fallback with a lightweight shared `_app` shell so production failures that happen before the app-router boundary can still render the branded error card instead of the default Next.js black 500 page.
    -   Extended the shared error-page wrapper with reusable actions and a wide-card option so the detailed 500 variant can keep its troubleshooting guidance without duplicating page chrome.

-   Made the Agents Server README quick deploy flow truly standalone:

    -   Split the branching-heavy homepage state hook into dedicated derived-state, synchronization, route-recovery, organization-mutation, folder-management, agent-action, overlay, and drag-and-drop helpers so `useAgentsListState` now reads as a thin composition layer.
    -   Kept the existing background synchronization, folder URL recovery, folder dialog flows, delete/visibility actions, context-menu and QR-code behavior, visible-scope derivation, and drag-and-drop organization updates intact while making each step easier to follow and maintain.

-   Refactored Agents Server `useAgentChatHistoryClientState.ts` into smaller focused private history-state hooks without changing external behavior:

    -   Extracted durable chat synchronization, optimistic chat lifecycle, and draft persistence into the private `useAgentChatHistorySyncState` and `useAgentChatHistoryDraftState` helpers so `useAgentChatHistoryClientState` now reads as a thin composition layer.
    -   Moved queued user-turn submission, failed-send retry tracking, and browser-notification hint orchestration into the private `useAgentChatHistorySubmissionState` helper while preserving the existing selection guards, optimistic chat create/rollback flow, draft saving, stream refresh, and auto-execute behavior.

-   Refactored `src/remote-server/startRemoteServer.ts` into smaller focused remote-server helpers without changing external behavior:

    -   Split the branching-heavy startup flow into dedicated configuration, execution-tool resolution, HTTP route registration, server-index rendering, socket request handling, and lifecycle helpers so `startRemoteServer` now reads top-down.
    -   Kept the existing REST routes, Socket.io events, anonymous/application mode checks, task tracking, OpenAI-compatible endpoint behavior, and public `RemoteServer` lifecycle intact while reducing branching complexity in the file.

-   Refactored `src/llm-providers/openai/OpenAiVectorStoreHandler.ts` into smaller focused vector-store upload helpers without changing external behavior:

    -   Split the branching-heavy `uploadKnowledgeSourceFilesToVectorStore` flow into dedicated upload, batch-creation, batch-id resolution, progress tracking, terminal-state, and timeout helpers so the vector-store ingestion path now reads top-down.
    -   Kept the existing per-file upload diagnostics, file-type summary logging, OpenAI batch-id fallbacks, stall diagnostics, timeout/cancel behavior, and final batch result handling intact while reducing branching complexity.

-   Refactored `src/llm-providers/openai/OpenAiCompatibleExecutionTools.ts` into smaller focused chat and retry helpers without changing external behavior:

    -   Moved the chat-specific request building, tool-call loop, progress snapshots, and final result shaping behind the private `callOpenAiCompatibleChatModel` helper so the main execution-tools class keeps only the provider-facing flow.
    -   Consolidated unsupported-parameter retry/error-history state into the private `OpenAiCompatibleUnsupportedParameterRetrier` helper and kept the existing prompt templating, thread/file handling, retry stripping, verbose logging, and exported result shapes intact across chat, completion, embedding, and image-generation calls.

-   Refactored `src/llm-providers/openai/OpenAiAssistantExecutionTools.ts` into smaller focused assistant helpers without changing external behavior:

    -   Split `callChatModelStream` into dedicated validation, prompt/thread preparation, tool-run orchestration, streaming finalization, progress emission, and result-export helpers so the assistant flow now reads top-down.
    -   Kept the existing thread/history handling, file attachments, tool-call progress snapshots, script-tool execution behavior, file-citation filename rewriting, and final exported result shapes intact while reducing branching complexity.

-   Refactored `src/llm-providers/agent/AgentLlmExecutionTools.ts` into smaller focused helpers without changing external behavior:

    -   Split `callChatModelStream` into dedicated prompt-preparation, backend-dispatch, AgentKit cache/preparation, OpenAI Assistant reuse/update, generic fallback, and final-result normalization helpers so the streaming flow now reads top-down.
    -   Kept the existing attachment-context handling, tool and knowledge-source merging, assistant preparation progress events, backend-specific caching/reuse rules, and final markdown normalization behavior intact while reducing branching complexity in the file.

-   Refactored `src/execution/createPipelineExecutor/40-executeAttempts.ts` into smaller focused helpers without changing external behavior:

    -   Split the branching-heavy attempt loop into dedicated joker-resolution, task-type execution, postprocessing, validation, failure-bookkeeping, and prompt-report helpers so `executeAttempts` now reads top-down.
    -   Kept the existing joker retry order, prompt/script/dialog execution semantics, expectation retry summaries, and prompt execution-report logging behavior intact while reducing repeated branching.

-   Refactored `src/conversion/parsePipeline.ts` into smaller focused private helpers without changing external behavior:

    -   Extracted pipeline normalization, markdown-structure validation, head/task command application, section-name resolution, parameter bookkeeping, and final cleanup/export steps so `parsePipeline` now reads top-down.
    -   Kept the existing shebang handling, markdown flattening, head/task command semantics, implicit parameter direction inference, sync high-level abstractions, and exported pipeline JSON shape intact while reducing branching complexity.

-   Refactored `src/collection/pipeline-collection/constructors/createPipelineCollectionFromDirectory.ts` into smaller focused helpers without changing external behavior:

    -   Split the branching-heavy directory-loading flow into dedicated tool-resolution, option-resolution, file-sorting, file-loading, root-URL normalization, collection-registration, and shared error-wrapping helpers so `createPipelineCollectionFromDirectory` now reads top-down.
    -   Kept the existing lazy/eager loading behavior, file-priority ordering, source/archive loading, implicit root-URL assignment, duplicate-pipeline handling, and collection error reporting intact while reducing repeated branching and duplicated error formatting.

-   Refactored `src/cli/cli-commands/run.ts` into smaller focused private helpers without changing external behavior:

    -   Split the branching-heavy `ptbk run` flow into dedicated validation, LLM/bootstrap, pipeline loading, input prompting, execution, report saving, and result-printing helpers so `$initializeRunCommand` now reads top-down.
    -   Kept the existing CLI output, chatbot formfactor shortcut, `.env` bootstrap behavior, parse-error reporting, and interactive/non-interactive input handling intact while reducing repeated branching in the file.

-   Refactored `src/book-components/Chat/LlmChat/LlmChat.tsx` into smaller focused private chat modules without changing external behavior:

    -   Kept `LlmChat.tsx` as the public chat facade while moving message persistence/state orchestration and send/stream/retry lifecycle handling into dedicated private hooks.
    -   Preserved the existing initial-message seeding, local persistence, streaming stop, background recovery, teammate metadata loading, auto-execute, and delegated reset behavior while reducing branching in the component.

-   Refactored `src/book-components/Chat/Chat/renderRunBrowserToolCallDetails.tsx` into smaller focused browser-replay helpers without changing external behavior:

    -   Moved the derived browser replay state, metadata normalization, and action-row assembly into a dedicated private `resolveRunBrowserToolCallDetailsState` helper so the modal renderer now reads top-down.
    -   Kept the existing browser session metadata, warnings, fallback content, media replay, streamed action states, and partial-error notice behavior intact while reducing branching in `renderRunBrowserToolCallDetails`.

-   Refactored `src/book-components/Chat/Chat/ChatToolCallModal.tsx` into smaller focused private modal helpers without changing external behavior:

    -   Extracted modal state, TEAM profile loading, focus restoration, Escape handling, and advanced-report export orchestration into a dedicated private `useChatToolCallModalState` hook so `ChatToolCallModal.tsx` now reads as a thin modal shell.
    -   Moved the view-selection branch into a focused private `ChatToolCallModalContent` component while keeping the existing TEAM drilldown, locale-aware simple details, advanced raw details, and copy/save report behavior intact.

-   Refactored `src/book-components/Chat/Chat/ChatInputArea.tsx` into smaller focused private composer modules without changing external behavior:

    -   Extracted textarea state, send/newline behavior, and deferred Enter resolution into a dedicated private `useChatInputAreaComposer` hook so `ChatInputArea.tsx` now reads as a composition layer.
    -   Moved the shared uploaded-file type into a dedicated private module and kept the existing reply preview, attachment upload, dictation controls, optimistic send clearing, IME handling, and deferred Enter safeguards intact while reducing branching in the component.

-   Refactored `src/book-components/Chat/Chat/Chat.tsx` into smaller focused private chat helpers without changing external behavior:

    -   Extracted render-only message normalization, scroll/overlap orchestration, and tool-call/citation modal selection into dedicated private hooks so `Chat.tsx` now reads top-down.
    -   Kept the existing message postprocessing, auto-scroll indicator, action-bar overlap fading, tool-call detail resolution, citation modal flow, and feedback wiring intact while reducing repeated branching.

-   Refactored `src/book-components/BookEditor/useBookEditorMonacoUploads.ts` into smaller focused upload helpers without changing external behavior:

    -   Split upload state transitions, progress normalization, placeholder insertion, and upload-stats aggregation into focused helpers so `useBookEditorMonacoUploads` now reads top-down.
    -   Kept the existing Monaco placeholder placement, debounced progress/editor updates, queued/uploading/paused/failed/completed lifecycle, retry flow, and final `KNOWLEDGE` replacement behavior intact while reducing repeated branching.

-   Refactored `src/book-2.0/agent-source/parseAgentSource.ts` into smaller focused helpers without changing external behavior:

    -   Split the branching-heavy parser into dedicated persona, initial-message, sample, capability, knowledge, and metadata helpers so the main `parseAgentSource` flow now reads top-down.
    -   Kept the existing commitment ordering, sample extraction, capability labeling, metadata overrides, and knowledge-source collection behavior intact while reducing repeated branching and making the file easier to follow.

-   Refactored `src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments.ts` into smaller focused helpers without changing external behavior:

    -   Split the branching-heavy requirements builder into dedicated initialization, DELETE filtering, commitment application, import processing, non-commitment aggregation, example-interaction assembly, and final cleanup helpers so the flow now reads top-down.
    -   Kept the existing commitment ordering, agent-reference fallback behavior, TEAM profile pre-resolution, import warnings, MCP extraction, inline-knowledge uploads, and final comment stripping intact while reducing duplicated branching.

-   Refactored `scripts/generate-packages/generate-packages.ts` into smaller focused package-generation helpers without changing external behavior:

    -   Split the large `generatePackages` orchestration into dedicated preparation, entry-file generation, README/package-json generation, bundling, bundle-safety validation, dependency finalization, and publish-workflow helpers so the flow now reads top-down.
    -   Kept the generated package contents, dependency inference rules, marker checks, publish-workflow output, and optional commit behavior intact while removing repeated branching and duplicated package-json writing logic.

-   Refactored Agents Server `UsageAnalyticsAggregation.ts` into smaller focused aggregation helpers without changing external behavior:

    -   Split usage-response construction into dedicated summary, grouped-call accumulation, breakdown, and detail-formatting helpers so the main response builder now reads top-down.
    -   Preserved the existing invalid-timestamp handling, sorting rules, and top-25 detail limits while removing repeated aggregation logic.

-   Refactored Agents Server `handleChatCompletion.ts` into smaller focused chat-completion helpers without changing external behavior:

    -   Split the OpenAI-compatible chat flow into focused request-parsing, agent-runtime resolution, prompt creation, streaming, and finalization helpers so the main entry point now reads top-down.
    -   Kept the existing API surface, frozen-chat persistence, history recording, message-suffix handling, agent-preparation waiting, and branch-specific learning behavior intact while removing duplicated response-side effects.

-   Refactored Agents Server `WalletRecordDialog.tsx` into smaller focused private wallet-dialog modules without changing external behavior:

    -   Kept `WalletRecordDialog.tsx` as the public dialog facade while moving draft state, validation, unsaved-change handling, and connect-redirect decisions into a dedicated private `useWalletRecordDialogState` hook.
    -   Split the large form rendering into focused private dialog sections so the GitHub, Calendar, and manual credential branches are easier to follow and maintain.

-   Refactored Agents Server `BrowserPushNotificationsProvider.tsx` into smaller focused private push-notification modules without changing external behavior:

    -   Kept `BrowserPushNotificationsProvider.tsx` as the public context facade while moving settings, permission, and subscription orchestration into a dedicated private `useBrowserPushNotificationsState` hook.
    -   Extracted focused-chat heartbeat synchronization into a private `useBrowserPushFocusedChatSync` hook and split repeated branching into smaller helpers so the browser-push flow is easier to follow and maintain.

-   Refactored Agents Server `AgentsList.tsx` into smaller focused private homepage modules without changing external behavior:

    -   Extracted the listing state, synchronization, folder management, visibility updates, and drag-and-drop orchestration into a dedicated private `useAgentsListState` hook so `AgentsList.tsx` now reads as a thin composition layer.
    -   Moved the heading toolbar, active view surface, sortable list view, and dialog/popover rendering into focused private components so the remaining branching logic is easier to follow and maintain.

-   Refactored Agents Server `AgentsGraph.tsx` into smaller focused private graph modules without changing external behavior:

    -   Extracted graph URL/filter/export/highlight orchestration into a dedicated private `useAgentsGraphState` hook so `AgentsGraph.tsx` now reads as a thin composition layer.
    -   Moved the toolbar controls and React Flow surface into focused private components, with smaller helpers for selection parsing and grouped option rendering so the graph UI is easier to follow and maintain.

-   Refactored Agents Server `Header.tsx` into smaller focused private header modules without changing external behavior:

    -   Moved shared dropdown timing, hover/touch behavior, drawer swipe handling, and menu open-state orchestration into a dedicated private `useHeaderDropdownState` hook so `Header.tsx` now reads as the composition shell.
    -   Extracted desktop context navigation, desktop user/profile controls, and focused helper builders for agent-view items, federated-server items, top-menu items, and rename-path resolution so the header branching is easier to follow and maintain.

-   Refactored Agents Server `ControlPanel.tsx` into smaller focused private control-panel modules without changing external behavior:

    -   Kept `ControlPanel.tsx` as the dropdown facade while moving control-panel state derivation, toggle composition, and branching helpers into a dedicated private `useControlPanelContentState` hook.
    -   Moved the control-panel body into a focused private `ControlPanelContent` component with reusable section helpers so the rendering flow is easier to follow and maintain.

-   Refactored Agents Server `AgentContextMenu.tsx` into smaller focused private menu modules without changing external behavior:

    -   Extracted `useAgentContextMenuItems` into a dedicated private hook file so `AgentContextMenu.tsx` now reads as the public facade for install-prompt state and menu rendering.
    -   Split menu-item assembly into focused helper functions for directory, install, share, workspace, management, and admin sections, making the branching logic easier to follow and maintain.

-   Refactored Agents Server standalone `search/page.tsx` into smaller focused private search-page modules without changing external behavior:

    -   Moved URL state, filter selection, debounced query syncing, and paginated result loading into a dedicated private `useSearchPageState` hook so the route-facing page now reads top-down.
    -   Split the standalone search heading/form and results/pagination rendering into focused private components so the page branching is easier to follow and maintain.

-   Refactored Agents Server `AgentTimeoutsClient.tsx` into smaller focused private timeout-manager modules without changing external behavior:

    -   Extracted timeout loading, polling, filter/edit state, and timeout action orchestration into a dedicated private `useAgentTimeoutsClientState` hook so the route-facing client now reads top-down.
    -   Moved the timeout manager header, summary/filter surfaces, table row rendering, and edit dialog into focused private components so the branching logic is easier to follow and maintain.

-   Refactored Agents Server `CanonicalAgentChatPanel.tsx` into smaller focused private chat modules without changing external behavior:

    -   Extracted durable-chat orchestration, prompt-parameter composition, auto-execute lifecycle, and dialog state into a dedicated private `useCanonicalAgentChatPanelState` hook so the panel reads top-down.
    -   Moved the large chat-thread rendering branch into a focused private `CanonicalAgentChatSurface` component with isolated translation/background/loading helpers, making the chat UI configuration easier to follow and maintain.

-   Refactored Agents Server `AgentChatSidebar.tsx` into smaller focused private sidebar modules without changing chat behavior:

    -   Extracted shared sidebar item resolution, empty-chat filtering, and mobile-dismiss chat actions into a dedicated private `useAgentChatSidebarState` hook so the route-facing sidebar reads top-down.
    -   Moved the ChatGPT-like and default sidebar render branches into focused private components, with smaller row/filter helpers per layout to keep the branching logic easier to follow and maintain.

-   Refactored Agents Server `AgentChatHistoryClient.tsx` into smaller focused private chat-history modules without changing external behavior:

    -   Moved durable-history bootstrap, selection, refresh, and send orchestration into a dedicated private `useAgentChatHistoryClientState` hook so the route-facing client reads top-down.
    -   Split private-mode, loading, ready-state, and ChatGPT-like top-bar rendering into focused helpers so the chat branching is easier to follow while preserving the existing sidebar and durable-chat behavior.

-   Refactored Agents Server `TaskManagerClient.tsx` into smaller focused private task-manager modules without changing external behavior:

    -   Extracted task listing, polling, pagination, and guarded admin actions into a dedicated private `useTaskManagerState` hook so the admin route is easier to follow.
    -   Moved the task-manager filters, summary metrics, table shell, and task-row rendering into focused private components so `TaskManagerClient.tsx` now reads as a thin composition layer.

-   Refactored Agents Server `ServersClient.tsx` into smaller focused private server-admin modules without changing external behavior:

    -   Extracted managed-server registry loading, draft persistence, migration, delete, navigation, and create-server wizard orchestration into dedicated private hooks so the admin route is easier to follow.
    -   Moved the registered-server table, create-server dialog, and delete-current-server panel into focused private components so `ServersClient.tsx` now reads as a thin composition layer.

-   Refactored Agents Server `CustomJsClient.tsx` into smaller focused private custom-JS modules without changing editor behavior:

    -   Kept `CustomJsClient.tsx` as a thin layout facade while moving custom-script state/persistence and analytics metadata orchestration into dedicated private hooks.
    -   Extracted the script list, script editor, and analytics settings UI into focused private panels so the admin custom-JavaScript flow is easier to read and maintain.

-   Refactored Agents Server `CustomCssClient.tsx` into smaller focused private custom-CSS modules without changing editor behavior:

    -   Extracted the custom CSS loading, save/delete orchestration, unsaved-change tracking, and local file-state transitions into a dedicated private `useCustomCssClientState` hook so the route component is easier to follow.
    -   Moved the stylesheet list, editor panel, and selector reference sidebar into focused private components so `CustomCssClient.tsx` now reads as a thin layout facade.

-   Expanded `ptbk coder find-refactor-candidates` level spread so `xlow` and `extreme` are now much farther apart:

    -   Rebalanced all six scan levels with a substantially wider threshold range across line count, entity count, function count, and function complexity, so `xlow` stays highly benevolent while `extreme` is intentionally aggressive.
    -   Added dedicated regression coverage that enforces strictly decreasing thresholds per level and guards a large `xlow` vs `extreme` ratio.
    -   Expanded `.gitignore` scan coverage with an explicit directory-ignore test to ensure ignored folders are excluded from refactor candidate discovery.

-   Fixed Agents Server wallet agent scoping so manual credentials, GitHub App tokens, and `USE PROJECT` now all use canonical agent identifiers:

    -   Wallet create/update/list/token-resolution paths now resolve incoming agent names or route identifiers to canonical `Agent.permanentId` values before touching the wallet tables, which avoids foreign-key failures for agent-scoped records.
    -   This keeps the chat wallet popup and GitHub-backed `USE PROJECT` credentials aligned on the same stored agent scope instead of mixing route aliases with database permanent ids.
    -   Added a defensive `Agent.permanentId` backfill/default migration plus regression coverage for canonical wallet agent scoping.

-   Fixed `ptbk coder find-refactor-candidates` so scans now respect the project `.gitignore`:

    -   The command now resolves the scan root from the nearest ancestor `.gitignore`, so it works from project subdirectories without hardcoding Promptbook-repository paths.
    -   Source-file discovery now filters project-relative matches through the parsed `.gitignore`, so ignored files and directories no longer produce refactor prompts while later negated keep-rules still work.
    -   Added regression coverage for both project-root `.gitignore` resolution and ignored-vs-restored refactor-candidate scans.

-   Replaced Agents Server default agent avatars with a deterministic two-stage procedural pixel-art pipeline:

    -   The default-avatar still-image route now uses an explicit stage-1 LLM classification step to derive compact enum-bounded avatar traits, stores the validated intermediate JSON parameters in a new `AgentDefaultAvatar` table with schema/render versions, and reuses that cache on later requests.
    -   Stage 2 now renders reproducible pixel-art SVG from those stored parameters with deterministic hash-derived seeds instead of diffusion/image-generation models, while keeping custom agent images untouched and preserving the existing default-avatar URL surface.
    -   Added regression coverage for byte-stable rendering plus schema-contract validation of the stage-1 LLM output, including sample kind and strict personas.

-   Fixed Agents Server initial-message boot so agent pages no longer blink through a temporary hello before showing the real default message:

    -   Passed the server-resolved agent `INITIAL MESSAGE` into the profile preview so first render can show the configured message immediately instead of waiting for a client-side profile fetch.
    -   Reworked durable-chat initial-message rendering to wait for initial-message resolution before injecting any synthetic first bubble, while still preserving the existing generic greeting only for agents that truly have no configured initial message.
    -   Added delayed-profile-load regression coverage so slow `/api/profile` responses still show only the configured initial message and never a temporary fallback hello.

-   Added durable message replies to Agents Server chats:

    -   Extended the shared chat message model plus Agents Server durable-chat pipeline so user messages can persist an in-message `replyingTo` snapshot, the send API accepts `threadId` + `repliedToMessageId`, and the worker now rewrites prompt content with explicit reply context for models that only receive plain chat text.
    -   Added backward-compatible reply columns to `prefix_UserChatJob`, optimistic outbound reply metadata, and same-thread / already-existing reply validation so reply relationships survive reloads without allowing cross-thread or incomplete targets.
    -   Updated the shared chat UI and Agents Server panel to support faded replied-to previews in both reply bubbles and the composer, cancelable reply mode, explicit reply actions, and touch swipe-to-reply for durable chat messages.

-   Further refactored `src/types/string_url.ts` into smaller focused semantic type modules without changing external behavior:

    -   Extracted the remaining Promptbook-server, base-url, pipeline, agent, image, and href-family aliases into dedicated `src/types/string_*.ts` files so each module now owns one URL concern.
    -   Kept `src/types/string_url.ts` as the compatibility facade preserving the same import path and exported semantic type aliases.

-   Refactored `src/cli/cli-commands/coder/init.ts` into smaller focused private coder-init helpers without changing external behavior:

    -   Kept `init.ts` as the CLI-facing facade while extracting project-configuration orchestration and summary rendering into dedicated private modules.
    -   Moved env, gitignore, package.json, VS Code, markdown-file, directory, and JSON/text helper responsibilities into focused private files so the command is easier to follow and maintain.
    -   Reused one shared `formatDisplayPath` helper for coder-init output and `AGENT_CODING.md` generation to remove duplicated path-formatting logic.

-   Enhanced Agents Server chat progress points so active steps are visibly animated and completed ones always show completion:

    -   Reworked the shared chat progress-card renderer to emit explicit status markers instead of browser-native task-list checkboxes, so in-progress steps now show a spinner and completed steps show a stable checkmark.
    -   Kept the existing durable `agent_progress` data flow intact while preserving inline markdown/tool-chip rendering inside the chat bubble.
    -   Updated chat-message regression coverage for the new progress-marker rendering and nested checklist behavior.

-   Hid the redundant Agents Server **Preparing Agent** chat chip:

    -   Moved `assistant_preparation` onto the shared hidden-tool-chip list used by the chat render model, so the internal preparation marker no longer renders while browser, search, timeout, wallet, and other tool chips still do.
    -   Added regression coverage for both streaming and completed assistant messages so the preparation marker stays hidden without affecting normal tool chips.

-   Refactored `src/types/string_url.ts` into smaller focused semantic-type modules without changing external behavior:

    -   Split MIME type, base64/data URL, host/domain, href/URI, and email aliases into dedicated `src/types/string_*.ts` files so each file now covers one URL-related concern.
    -   Kept `src/types/string_url.ts` as the compatibility facade and home for the core URL variants, preserving existing imports and exported type semantics.

-   Fixed Agents Server chat-page browser titles so chat routes now lead with the current chat context instead of the selected agent name:

    -   Reworked shared chat title formatting to produce browser titles in the form **Chat or chat title | Agent | Server**, preserving inherited agent/server naming for standalone, ChatGPT-like, and headless chat routes.
    -   Updated server-rendered chat metadata so direct chat page loads start from the same chat-first title structure before client-side chat switching refines the active session title.
    -   Adjusted regression coverage for chat title transitions so browser-title changes now assert the chat context leads while the inherited agent/server suffix remains intact.

-   Fixed Agents Server durable-chat "New chat" navigation so browser-native **Open in new tab/window** now works from the chat page itself:

    -   Reused the existing `chat=new` route semantics for the shared chat action bar, rendering its **New chat** control as a real link instead of an in-place reset button when Agents Server provides a destination URL.
    -   Kept direct navigation to `/agents/[agent]/chat?chat=new` as the source of truth for durable new-chat creation, including the headless chat route variant.
    -   Added regression coverage for both direct `chat=new` navigation and the shared action-bar link rendering.

-   Added a Docker-specific README for the published `hejny/promptbook` image:

    -   Added a focused [`README.Docker.md`](../README.Docker.md) with build, run, configuration, and usage guidance for the production Agents Server image.
    -   Updated the generated DockerHub publish workflow so image releases now sync that Docker-specific README to the DockerHub package page.

-   Fixed the Agents Server profile-to-chat handoff so outbound user messages now appear immediately on the standalone chat page:

    -   When a user sends from the agent profile or follows a `?message=` quick action, the history chat client now seeds the same optimistic outbound-message path used by new-chat first turns while durable chat bootstrap continues in the background.
    -   History-mode navigation now selects an optimistic target chat immediately for fresh sends, preserves existing-chat targeting when provided, and keeps attachment/private-mode/history-disabled behavior aligned with the existing pending-outbound reconciliation and retry flow.
    -   Added regression coverage for profile quick-send, typed-send, and query-parameter message entry so the outgoing user bubble stays visible before server history or stream responses arrive.

-   Expanded `ptbk coder init` so newly initialized projects now also get an `AGENT_CODING.md` quick-reference file:

    -   The new generated guide explains the Promptbook Coder workflow, how to use and customize `AGENTS.md` plus `prompts/templates/*.md`, and how the created `npm run coder:*` scripts map to the underlying CLI commands.
    -   Kept initialization non-destructive by leaving existing `AGENT_CODING.md` files untouched while adding regression coverage for creation, preservation, and CLI summary output.

-   Added `AGENTS.md` bootstrap to `ptbk coder init`:

    -   `ptbk coder init` now creates a starter `AGENTS.md` file alongside the prompts/templates bootstrap, so the generated `coder:run` script points at an existing shared context file immediately.
    -   Kept initialization non-destructive by leaving existing `AGENTS.md` files untouched.
    -   Updated CLI summary output, README guidance, and regression coverage for the new initialized file.

-   Fixed `ptbk coder init` so external projects no longer get the Promptbook-repository-specific `agents-server.md` template by default:

    -   Split generic `coder init` template bootstrap from the full built-in template list, so project initialization now materializes only templates intended for any repository while the Promptbook-specific Agents Server template remains available separately.
    -   Updated CLI/docs expectations and regression coverage so external-project bootstrap no longer creates or reports `prompts/templates/agents-server.md`.

-   Added configurable scan levels to `ptbk coder find-refactor-candidates`:

    -   Added `--level <xlow|low|medium|high|xhigh|extreme>` so refactor-candidate scans can range from a very benevolent pass to a very aggressive sweep while `medium` remains the default.
    -   Kept the scan heuristics centralized in one shared level configuration and widened the threshold spread so `xlow` only surfaces the most obvious oversized files while `extreme` now proposes far more borderline candidates across line count, entity count, function count, and function complexity.
    -   Expanded regression coverage for CLI flag forwarding and level-sensitive refactor-candidate analysis, including the new outer levels.

-   Improved the Agents Server wallet credential dialog for manual GitHub token entry:

    -   Added a step-by-step manual `USE PROJECT` GitHub token guide directly into the shared wallet dialog, including links that open GitHub token settings and documentation in a new tab.
    -   Added a regression test covering the manual GitHub wallet flow so the new guidance stays visible when users switch from GitHub App connect to manual token entry.

-   Completed the remaining Agents Server chat-page translations for the System menu and Enter-key settings flow:

    -   Translated the remaining System dropdown category and item labels, including **Settings**, **Tool limits**, **Backups**, and **Error simulation**.
    -   Moved the System settings page heading and description onto shared translation keys, and localized the chat-keybinding save warning used by the Enter/Ctrl+Enter chooser flow.

-   Added the Agents Server chat Enter/Ctrl+Enter picker to the control panel:

    -   Added an explicit **Undecided** option that clears the saved keybinding so the chooser appears again the next time the user tries to send with plain Enter.
    -   Reused one shared Enter-key settings surface between **System > Settings** and the control panel, keeping the three keybinding choices and helper copy aligned.
    -   Updated chat keybinding persistence and textarea hints so resetting the preference no longer races the initial load and the undecided state is described accurately.

-   Fixed DockerHub publishing so the `hejny/promptbook` image now builds and starts the Agents Server instead of the legacy Pipelines server:

    -   Replaced the old CLI-only Dockerfile with an Agents Server production build and added a `.dockerignore` so local environment files and transient build artifacts are not copied into the image.
    -   Updated `docker-compose.yml` plus the generated DockerHub publish workflow so the default container runtime now matches the Agents Server port and startup flow.
    -   Stopped the version-update script from trying to rewrite the Dockerfile now that the published image is built from the repository sources instead of installing a pinned `ptbk` package.

-   Enhanced `ptbk coder init` so standalone external projects now get the missing local workflow bootstrap automatically:

    -   Added checked `✔` summary output for each initialized artifact, making standalone bootstrap results easier to scan.
    -   Extended `ptbk coder init` to ensure `.gitignore` covers the coder temp directory, `package.json` contains helper `coder:*` scripts for the main workflow commands, and `.vscode/settings.json` routes pasted prompt images into `prompts/screenshots/`.
    -   Added regression coverage for creating and merging those standalone project files, including JSON-with-comments VS Code settings plus CLI output assertions for the new checked summary.

-   Fixed `ptbk coder` boilerplate generation so the CLI now works standalone in external projects without depending on Promptbook-repository-only template paths:

    -   Extracted shared built-in boilerplate template definitions for `coder init` and `coder generate-boilerplates`, so the default templates are resolved inside the CLI and no longer read from `scripts/generate-prompt-boilerplate/templates` at runtime.
    -   Extended `ptbk coder init` to create project-owned `prompts/templates/common.md` and `prompts/templates/agents-server.md` files without overwriting existing customizations.
    -   Updated `ptbk coder generate-boilerplates` so omitted `--template` uses the built-in default, built-in aliases still work, custom `--template` values are resolved relative to the current project root, and the command now creates `prompts/` automatically when missing.
    -   Updated Promptbook's own local coder workflows and boilerplate template files to use `prompts/templates/*.md`, and added regression tests covering template initialization plus project-relative template resolution.

-   Fixed Agents Server chat-history navigation E2E coverage so the current browser routing and New chat control are asserted correctly again:

    -   Relaxed the durable-route checks to accept both the management API standalone chat link and the browser's current agent-name chat alias, keeping the regression focused on selected-chat behavior instead of one route alias.
    -   Updated the stale-refresh regression to use the visible `New chat` link rendered by the current chat sidebar instead of a brittle second-button selector.
    -   Removed a stale expectation for a visible `Completed` lifecycle badge after the shared chat UI intentionally stopped rendering completed-status badges.

-   Refactored `src/book-components/Chat/Chat/useChatInputAreaDictation.ts` into smaller focused private dictation modules without changing chat composer behavior:

    -   Extracted transcript refinement, dictation insertion, learned-dictionary updates, persistent dictation preferences, and browser/support metadata into dedicated private Chat helpers so the main dictation hook is easier to read and maintain.
    -   Kept `useChatInputAreaDictation.ts` as the orchestration facade preserving the existing dictation UI contract, speech-recognition flow, transcript correction behavior, and browser-settings fallback behavior used by `<ChatInputArea/>`.

-   Refactored Agents Server `createManagedServer.ts` into smaller focused private bootstrap modules without changing external behavior:

    -   Extracted create-server normalization, metadata seeding, transactional bootstrap orchestration, registry insertion, migration application, user/metadata seeding, SQL-dump generation, and failure-result handling into dedicated private `createManagedServer` modules so the public facade is easier to read and maintain.
    -   Kept `apps/agents-server/src/utils/serverManagement/createManagedServer.ts` as the public entrypoint preserving the same create-server API contract and bootstrap behavior.

-   Refactored Agents Server `createMiddlewareRequestContext.ts` into smaller focused private middleware modules without changing external behavior:

    -   Extracted middleware Supabase setup, request-IP parsing, registered-server loading, server routing/custom-domain resolution, metadata/settings resolution, and API-token validation into dedicated private `createMiddlewareRequestContext` helpers so the entrypoint is easier to read and maintain.
    -   Kept the public `createMiddlewareRequestContext` import path and middleware behavior intact for access restriction, custom-domain routing, embedding policy, and server visibility resolution.

-   Refactored Agents Server `<OfficeScene/>` into smaller focused private scene modules without changing office-scene behavior:

    -   Extracted the static SVG surface, shared geometry/projection helpers, corridor rendering, room rendering, desk rendering, and agent rendering into dedicated private Homepage modules so `OfficeScene.tsx` now reads as a thin orchestration facade.
    -   Reused the extracted geometry helpers from `AgentsOffice.tsx` for scene metrics and room-centering math so the isometric projection settings stay defined in one place while preserving the current office interactions and visuals.

-   Refactored Agents Server `useBookEditorWrapper` into smaller private editor modules without changing Book editor behavior:

    -   Extracted dedicated private `useBookEditorSaving`, `useBookEditorDiagnostics`, and `useBookEditorHistory` hooks plus focused Monaco-path and API-error helpers so the wrapper hook now reads as a small orchestration layer.
    -   Kept the existing `useBookEditorWrapper` hook API and editor flows intact, including autosave, unsaved-change guarding, unresolved-reference creation, history filtering, named versions, and version restore behavior.

-   Refactored `apps/agents-server/scripts/createVercelDomainSyncPlan.ts` into smaller focused Vercel sync modules without changing external behavior:

    -   Extracted Vercel sync contracts, API request helpers, project/domain loading, environment-binding resolution, and domain-diff planning into dedicated private script modules so the entry facade is easier to follow and maintain.
    -   Kept the existing `createVercelDomainSyncPlan.ts` import path and exported sync helpers intact for the sync CLI, Cloudflare sync helpers, report rendering, and tests.

-   Refactored `apps/agents-server/scripts/createCloudflareDnsRecordSyncPlan.ts` into smaller focused Cloudflare sync modules without changing external behavior:

    -   Extracted shared Cloudflare DNS sync contracts, automation-marker helpers, API request/list/create/update helpers, desired-record resolution, and record-diff planning into dedicated private script modules so the entry facade is easier to follow and maintain.
    -   Kept the existing `createCloudflareDnsRecordSyncPlan.ts` import path and exported sync helpers intact for the sync CLI, tests, and report rendering.

-   Refactored Agents Server `useAgentChatToolInteractions` into smaller focused private chat-interaction modules without changing external behavior:

    -   Extracted private `useHandleToolCallOnce`, `useAgentChatToolCallHandlers`, and `useAgentChatToolInteractionMessagesChange` helpers alongside the existing actionable tool-call analysis plus dedicated browser-location, private-mode confirmation, TEAM pseudo-user, wallet-request, and shared tool-result modules so the main hook is easier to read and maintain.
    -   Kept `apps/agents-server/src/app/agents/[agentName]/useAgentChatToolInteractions.ts` as the orchestration facade preserving the same hook API and runtime behavior for both chat wrappers.

-   Expanded the main `README.md` with a full `ptbk coder` section covering how the workflow works, how it differs from standalone coding agents, local Promptbook usage from source, installed-package usage in external projects, and examples for `init`, `generate-boilerplates`, `run`, `find-refactor-candidates`, and `verify`.
-   Fixed `ptbk coder run` so interactive waits are enabled by default again and `--no-wait` now correctly disables them for both local CLI usage and installed `ptbk` binaries.
-   Added configurable `--context` support to `ptbk coder run`, so extra coding instructions can now be passed inline or loaded from a project file such as `AGENTS.md`; Promptbook now stores its own coder context in [`AGENTS.md`](AGENTS.md) and the local VS Code coder workflows pass `--context AGENTS.md` instead of relying on hardcoded runner context.
-   Added optional `--thinking-level <low|medium|high|xhigh>` support to `ptbk coder run`, forwarding reasoning effort to OpenAI Codex and GitHub Copilot while keeping the command working without the flag; Promptbook's local VS Code coder workflows now pass `--thinking-level xhigh` explicitly.
-   Fixed `ptbk coder run` git staging/commit reliability when `.git/index.lock` blocks the auto-commit step:

    -   Added one shared Git command helper for the coding-agent workflow so `git add` and `git commit` use the same lock-aware execution path.
    -   The helper now retries transient `index.lock` conflicts, removes clearly stale lock files, and throws a clearer actionable conflict error when the repository is still locked.
    -   Added regression tests covering both temporary lock retries and stale-lock cleanup during coding-agent commits.

-   Normalized project comment style across the TypeScript and JavaScript codebase:

    -   Rewrote top-level JSDoc blocks into a consistent multiline format, added missing entity documentation, and ensured exported `src` entities carry explicit `@public` or `@private` annotations.
    -   Converted end-of-file note blocks to `// Note:` / `// TODO:` line comments so repository markers use one consistent trailing-comment style.

-   Clarified unpublishable-package marker comments across the codebase:

    -   Updated `[⚫]`, `[🟢]`, `[🔵]`, and `[🟡]` notes to one-line comments that identify the related file and briefly explain why the code must stay out of specific packages.

-   Refactored `src/types/string_url.ts` into smaller focused semantic type modules without changing external behavior:

    -   Extracted MIME, data-URL, host/network, generic URL, and email aliases into dedicated private `src/types/*_private.ts` modules so the public facade is easier to scan and maintain.
    -   Kept `src/types/string_url.ts` as the compatibility facade preserving the same exported type aliases and import path while the extracted internals carry explicit private JSDoc annotations.

-   Refactored `src/types/string_parameter_name.ts` into focused semantic type modules without changing external behavior:

    -   Extracted each semantic string alias and parameter-mapping type into dedicated `src/types/*.ts` files so each file has one clear responsibility and the dense mixed-purpose implementation is easier to follow.
    -   Kept `src/types/string_parameter_name.ts` as the compatibility facade preserving the same exported names and import path while the extracted modules keep their per-type JSDoc documentation.

-   Refactored `src/types/number_usd.ts` into smaller focused numeric-alias modules without changing external behavior:

    -   Extracted numeric primitives, identifier/count aliases, percentage aliases, duration aliases, storage-size aliases, and likeness aliases into dedicated `src/types/number_*.ts` modules so the implementation is easier to read and maintain.
    -   Kept `src/types/number_usd.ts` as the compatibility facade preserving the same exported numeric type aliases and import paths.

-   Refactored shared `<ChatInputArea/>` into smaller focused private modules without changing composer behavior:

    -   Extracted attachment upload state and drag/drop handling into `useChatInputAreaAttachments`, plus speech-recognition state/transcript refinement into `useChatInputAreaDictation`, so `ChatInputArea.tsx` now reads as a slimmer orchestration layer.
    -   Moved the large dictation details UI into a dedicated private `<ChatInputAreaDictationPanel/>` component while preserving the existing send, Enter-key, upload, and dictation flows.

-   Refactored Agents Server `userChatTimeoutStore.ts` into smaller focused private modules without changing timeout-store behavior:

    -   Extracted the timeout store facade, shared row/table helpers, query operations, state mutations, and raw-SQL worker persistence into dedicated `userChatTimeoutStore` modules so the main file is easier to read and maintain.
    -   Kept the existing timeout creation, listing, cancellation, retry, completion, counting, lease-recovery, and claiming flows intact while preserving the same public imports from `apps/agents-server/src/utils/userChatTimeout/userChatTimeoutStore.ts`.

-   Refactored Agents Server `serverManagement.ts` into smaller focused private modules without changing managed-server behavior:

    -   Extracted the public facade, shared input normalization, registry operations, migration/delete helpers, and global-admin/error utilities into dedicated `serverManagement` modules so the entry file is easier to scan.
    -   Kept the create-server bootstrap flow grouped in `createManagedServer.ts`, where its migration, seeding, SQL-dump, and failure-handling helpers now live beside the orchestration that uses them.

-   Refactored Agents Server `calendarConnections.ts` into smaller focused private modules without changing calendar connection behavior:

    -   Extracted the calendar connection/activity types, Supabase table providers, row mappers, normalization helpers, and per-operation persistence functions into dedicated calendar utility modules so the public facade is easier to read and maintain.
    -   Kept the existing calendar connection listing/upsert/disconnect flows plus calendar activity logging/listing behavior intact while preserving the same public imports from `apps/agents-server/src/utils/calendars.ts`.

-   Refactored Agents Server `agentPreparation.ts` into smaller focused private modules without changing preparation behavior:

    -   Extracted the shared preparation constants/types, Supabase persistence helpers, worker orchestration, and wait/scheduling entrypoints into dedicated `agentPreparation` utility modules so the public facade is easier to read and maintain.
    -   Kept the existing pre-index debounce, retry, worker wake-up, and chat-time wait behavior intact while preserving the same public imports from `apps/agents-server/src/utils/agentPreparation.ts`.

-   Refactored Agents Server `buildOfficeLayout` into smaller focused private modules without changing the rendered office behavior:

    -   Extracted the office layout types, shared agent/server helpers, room grouping, room geometry, and visual/state generation into dedicated Homepage modules so `buildOfficeLayout.ts` now acts as a thin orchestration entrypoint.
    -   Kept the existing office-room placement, activity-state assignment, desk/path generation, and local/federated route behavior intact while preserving private JSDoc annotations for the extracted internals.

-   Refactored Agents Server `<Header/>` into smaller focused private modules without changing header behavior:

    -   Extracted shared header types, recursive dropdown/mobile-menu rendering, desktop top navigation, mobile drawer rendering, and System-menu item building into dedicated `Header` modules so `Header.tsx` is easier to read and maintain.
    -   Kept the existing agent hierarchy, federated-server switcher, profile actions, and mobile/desktop navigation behavior intact while preserving private JSDoc annotations for the extracted internals.

-   Fixed Agents Server durable chat jobs so long-running turns no longer fail with a stale "Background worker lease expired before the chat turn finished." error while the worker is still active:

    -   Extracted the running-job lease renewal into a dedicated serialized heartbeat controller so heartbeats stay independent from slower assistant-message persistence under load.
    -   Started the durable chat heartbeat loop earlier in `runUserChatJob.ts` so long agent preparation phases also keep renewing the worker lease.
    -   Added regression tests covering serialized heartbeats, failure-threshold behavior, and ignoring late completions after the heartbeat loop stops.

-   Refactored Agents Server `BookEditorWrapper` into smaller private modules without changing editor behavior:

    -   Extracted the stateful autosave / diagnostics / history orchestration into a dedicated private `useBookEditorWrapper` hook so the wrapper component now reads as a thin composition layer.
    -   Moved the missing referenced-agent UI into a dedicated private `BookEditorMissingReferences` component and kept the existing desktop/mobile rendering behavior intact.

-   Refactored `apps/agents-server/scripts/sync-vercel-domains.ts` into smaller focused modules without changing its external behavior:

    -   Extracted Vercel domain planning/API logic, Cloudflare DNS planning/execution logic, reporting, logging, and shared domain normalization into dedicated script modules so the entrypoint is easier to follow and maintain.
    -   Kept the existing public sync helpers re-exported from `sync-vercel-domains.ts`, preserving the current test surface and CLI behavior.

-   Fixed Agents Server agent-page header menu navigation so the Profile / Chat view switcher links reliably change pages again:

    -   Hardened the shared `HeadlessLink` wrapper to perform imperative same-origin navigation for internal links after preserving the `?headless` flag, which keeps navigation working even when header dropdowns synchronously close and unmount on click.
    -   Added an Agents Server E2E regression covering the active-agent breadcrumb menu switching from Chat to Profile and back to Chat.

-   Updated Agents Server chat browser-tab titles to follow the current chat context instead of the selected agent name:

    -   Added chat-page metadata overrides plus a client-side chat-title sync so standalone, ChatGPT-like, and headless embedded chat routes now use `Chat` / `Chat: {session title}` wording without leaking the agent name into the browser tab.
    -   Added backwards-compatible persisted `UserChat.title` support and now let the `agent_progress.title` payload set the durable chat title used by chat summaries and tab titles.
    -   Added a jsdom regression test covering title updates across chat-context switches and asserting the agent name is removed from the computed document title.

-   Logged the full durable Agents Server chat prompt into raw message inspection payloads:

    -   Added a `prompt` snapshot to persisted chat messages so raw inspection now includes the turn title, chat content, resolved parameters, model requirements, thread, attachments, runtime prompt tools, full `availableTools`, and the related `toolCalls` / `completedToolCalls`.
    -   Stored provider-facing `rawPromptContent` and `rawRequest` in that same `prompt` payload when a durable chat turn completes, and kept prompt snapshots updated across running/completed/failed/cancelled terminal states.
    -   Cleared stale prompt snapshots when retrying failed durable chat jobs and taught the shared chat tool-call modal to fall back to `message.prompt.availableTools` for future compatibility.

-   Fixed Agents Server rapid consecutive message sends on freshly created chats so the second message no longer races a stale chat id and fails with `Chat not found.`:

    -   The durable chat client now treats optimistic placeholder chat ids as equivalent to their resolved server chat ids when applying canonical snapshots and send results.
    -   Rapid user sends are now serialized through the durable chat client so multiple quick thoughts keep their order, wait for optimistic chat creation to resolve, and submit against the correct chat id.
    -   Added an Agents Server E2E regression covering two quick sends while the first message-create request is still delayed.

-   Hid the redundant `agent_progress` chip under Agents Server chat messages while keeping all other chips and the inline streaming progress rendering intact:

    -   Updated the shared chat tool-chip builder to treat `agent_progress` as a hidden chip-only tool so progress continues rendering through the message body without adding a duplicate badge under the message.
    -   Kept the change DRY by reusing one visibility helper for both ongoing and completed tool-call chip lists.
    -   Added regression tests proving `agent_progress` stays hidden for in-progress and completed assistant messages while ordinary tool chips still render.

-   Logged richer durable diagnostics for failed Agents Server chat turns so admin task inspection no longer stops at the generic lease-expired summary:

    -   Added backwards-compatible `failureDetails` storage for `UserChatJob` rows and now persist structured JSON diagnostics containing the failure summary, serialized error payload (message/name/stack when available), provider, timing, and chat-turn identifiers.
    -   Reused the same diagnostics builder for runtime failures, unexpected worker-route failures, and expired-lease recovery paths to keep failure logging DRY and consistent.
    -   Extended the admin task manager to surface the stored diagnostics under failed chat-completion tasks via an expandable "Show details" panel in the Last error column.

-   Hid the finished chat lifecycle chip under messages so completed Agents Server replies no longer show redundant `Finished` / `Dokončeno` badges:

    -   Updated the shared `<ChatMessageItem/>` lifecycle-badge resolver to return no badge for `completed` messages while preserving queued, running, failed, and cancelled badges.
    -   Added a regression test proving completed lifecycle badges stay hidden while queued and running badges still render.

-   Fixed Agents Server chat `<details>` blocks so their expanded body renders as real markdown instead of plain text:

    -   Updated the shared `MarkdownContent` renderer to keep masking raw `<details>` blocks for structural safety, but now convert the block body through the normal markdown pipeline before restoring it.
    -   Preserved native `<summary>` / `<details>` behavior and existing open-state restoration across streaming rerenders.
    -   Added a regression test covering markdown lists, links, and fenced code blocks rendered inside a `<details>` block.

-   Improved mobile spacing for Agents Server `ARTICLE_MODE` chat so article text no longer feels flush against screen edges:

    -   Increased the mobile-only article-mode inline padding in the shared `<Chat/>` layout, which gives the transcript and composer more breathing room while keeping article messages full-width and left-aligned.
    -   Left `BUBBLE_MODE` rendering unchanged.

-   Completed Agents Server chat chip translations so localized tool labels are used under messages instead of falling back to hardcoded English:

    -   Updated the shared chat chip renderer to respect the `toolTitles` overrides already passed from Agents Server when building ongoing, completed, transitive, and TEAM tool-call chips.
    -   Added missing Agents Server translation keys (English + Czech) for the remaining tool-chip labels used in chat, including memory, wallet, time, timeout, agent spawning, and project actions.
    -   Extended the Agents Server chat-page `toolTitles` mappings in both durable chat and live agent chat so all supported chip labels resolve through `t(...)`.
    -   Added a regression test proving translated tool-title overrides are used for assistant-preparation chips.

-   Updated chat page browser tab title to show "Chat" instead of the agent name:

    -   Added `generateChatMetadata.ts` utility in the chat folder that exports `CHAT_PAGE_TITLE = 'Chat'` and `generateChatMetadata()` returning `{ title: 'Chat' }`.
    -   Exported `generateMetadata` from `/agents/[agentName]/chat/page.tsx` and `/agents/[agentName]/chat/chatgpt-like/page.tsx` so the page-level title overrides the agent-name title set by the `[agentName]` layout for all chat contexts (standalone, ChatGPT-like, headless/embedded).
    -   Added `generateChatMetadata.test.ts` with three unit tests verifying the title is "Chat", is non-empty, and is consistent across navigation calls.

-   Logged full raw Message tool context (called + available) in the message inspector:

    -   Added `availableTools?: ReadonlyArray<LlmToolDefinition>` field to the `ChatMessage` type so the complete list of tools available at each model turn is stored alongside called tools.
    -   In `runUserChatJob.ts`, computed `availableTools` by combining `preparedAgentModelRequirements.modelRequirements.tools` (agent-commitment tools: browser, calendar, team, etc.) with `runtimeTools` (attachment and progress tools) immediately after the runtime tools are created - capturing the exact tool set passed to the model.
    -   Stored `availableTools` in the initial assistant-message write and in all terminal-state persistence calls (COMPLETED, FAILED, CANCELLED) via `persistUserChatJobTerminalState`.
    -   Extended `renderAdvancedToolCallDetails` with an "Available tools" section (id `available-tools`) rendered between "Model payload" and "Full event" in the advanced view of `ChatToolCallModal`.
    -   Added `availableTools` prop to `ChatToolCallModal` and wired it from `Chat.tsx` via a `selectedMessageAvailableTools` memo that resolves the parent message of the selected tool call.
    -   Added two unit tests in `ChatToolCallModal.test.tsx` verifying that the "Available tools" section appears in advanced view both when tools are provided and when the prop is omitted (shows empty array).

-   Fixed USE TIME chip rendering bug and added i18n + locale-aware time formatting for timeout/time tool-call chips and modals:

    -   Fixed broken chip rendering (`  : PM`) caused by `toLocaleTimeString([], {...})` passing an empty array as locale in three locations (`getToolCallChipletInfo.ts`, `timeoutToolCallPresentation.ts`, `renderToolCallDetails.tsx`). The empty array caused browsers to omit the hour component.
    -   Introduced shared `formatToolCallLocalTime(date, locale?)` utility in `src/book-components/Chat/utils/formatToolCallLocalTime.ts` used by all three locations to ensure consistent, well-formed time strings.
    -   Added optional `locale?: string` parameter to `getToolCallChipletInfo`, `resolveTimeoutToolCallPresentation`, `renderToolCallClockPanel`, `renderToolCallDetails`, and `ChatToolCallModal` so locale threads through the full render chain.
    -   Added `locale` prop to `ChatToolCallModal` and wired `chatLocale` from `Chat.tsx` into it.
    -   Updated `buildOngoingToolCallChips` and `buildFinalToolCallChips` in `ChatMessageItem.tsx` to accept and forward `chatLocale`.
    -   Added 14 new `ChatUiTranslations` fields for timeout modal titles (`toolCallTimeoutTitle`, `toolCallTimeoutCancelledTitle`, `toolCallTimeoutUpdateTitle`), button labels (`toolCallTimeoutCancelButton`, `toolCallTimeoutSnoozeButton`, `toolCallTimeoutViewAdvancedButton`), messages, and labels, plus 3 time-check modal fields (`toolCallTimeTitle`, `toolCallTimeUnknown`, `toolCallTimeTimestampLabel`).
    -   Added corresponding keys to `ServerTranslationKeys.ts` and English/Czech YAML translation files.
    -   Wired all new translation keys in `AgentChatWrapper.tsx` and passed `language` as `chatLocale` to the `Chat` component.

-   Normalized teammate consulting tool representation so human-readable agent names are used in the UI instead of technical IDs, and added persona descriptions to tool definitions and system messages:

    -   Removed the URL-hash suffix from `createTeamToolName` so tool names are now `team_chat_{agentName}` instead of `team_chat_{id}_{hash}`.
    -   Changed `ServerAgentReferenceResolver` to build local agent URLs using `agent.agentName` (not `permanentId`) so the label derived from the URL path is always the readable name.
    -   Added `resolveTeammateProfile(url)` method to `ServerAgentReferenceResolver` (backed by `localUrlToProfile` map populated during `initialize()`) and exposed it as an optional method on the `AgentReferenceResolver` interface.
    -   Added `TeammateProfile` and `TeammateProfileResolver` types in `src/book-2.0/agent-source/`.
    -   In `createAgentModelRequirementsWithCommitments`, pre-resolve teammate profiles before applying each TEAM commitment and store results in `_metadata.preResolvedTeammateProfiles`.
    -   Updated `TEAM.ts` to use pre-resolved profiles for tool names and labels, include `personaDescription` in the tool `description` field, and format the system message section with descriptions inline (using `spaceTrim`).
    -   Delegated `resolveTeammateProfile` through `createBookScopedAgentReferenceResolver` to the fallback resolver.

-   Fixed chat sound and vibration notification to fire only once when the agent finishes responding, not on every streaming chunk or intermediate message update:

    -   Extracted `useChatCompleteNotification` hook that plays `message_receive` sound exactly once per completed assistant message (identified by stable message id), suppressing notifications during streaming and preventing double-firing on rerenders.
    -   Removed the per-chunk `vibrate('message_stream_chunk')` call and the `message_typing` sound that previously fired at streaming start.
    -   Added unit tests for `useChatCompleteNotification` covering: fires once on completion, never during streaming chunks, idempotent on rerenders, silent for user messages, and once per response across multiple sequential exchanges.

-   Completed Agents Server chat page translations for previously hardcoded English strings:

    -   Added `ChatUiTranslations` type to `ChatProps` with fields for input placeholder, save/new-chat button labels, lifecycle state badges (Sending/Queued/Running/Failed/Cancelled/Completed), and tool call modal controls (title, close, copy, save, advanced/simple toggle).
    -   Added `chatUiTranslations?: ChatUiTranslations` prop to `<Chat/>`, threaded it through `ChatActionsBar`, `ChatMessageList`, `ChatMessageItem`, and `ChatToolCallModal`.
    -   Replaced all hardcoded English strings in those components with `chatUiTranslations?.xxx || 'fallback'` expressions.
    -   Added 31 new translation keys under `chat.*` namespace to `ServerTranslationKeys.ts` with English and Czech values (including all tool-chip titles via existing `toolTitles` prop).
    -   Wired translations in both `CanonicalAgentChatPanel` and `AgentChatWrapper` via `chatUiTranslations={...}` and `toolTitles={...}` using `t()`.
    -   Fixed the input placeholder to pass through the translation fallback: server pages now pass `agentProfile.meta.inputPlaceholder` directly (`undefined` when unset) so `chatUiTranslations.inputPlaceholder` is used as the translated default.

-   Fixed `<details>` / `<summary>` elements inside chat message markdown so they expand and collapse when clicked:

    -   Updated the shared chat `MarkdownContent` renderer to rely on the browser's native `<summary>` toggle instead of force-toggling `<details>` in the click handler, while still stopping summary clicks from bubbling into surrounding chat-message handlers.
    -   Added a tiny non-browser fallback for environments without native `<summary>` toggling (such as JSDOM), so regression tests still cover click-to-toggle behavior and open-state preservation across markdown rerenders.
    -   Refined the shared markdown styling for `<details>` blocks with a clearer card-like container, richer spacing, hover/focus feedback, and a custom chevron indicator so expandable sections look obviously interactive in Agents Server chat messages.
    -   Added regression tests covering summary-click toggling inside both the standalone markdown renderer and the full chat-message item, plus preserving an open `<details>` block across markdown rerenders.

-   Completed Agents Server UI translations for all previously hardcoded English strings across chat dialogs and admin controls:

    -   Added ~96 new translation keys (English + Czech) covering `chat.feedback.*`, `chatTimeout.*`, `pseudoUserChat.*`, `metaDisclaimer.*`, `chatError.*`, `clearChatHistory.*`, `clearChatFeedback.*`, and `walletDialog.*` namespaces.
    -   Wired the feedback/report-issue modal in durable chat and profile chat to the translation system via the `feedbackTranslations` prop on `<Chat/>`.
    -   Translated the chat timeout badge/modal (`ChatTimeoutButton`), the frozen-chat banner and cancel-job button (`CanonicalAgentChatPanel`), and all timeout dialog copy.
    -   Translated the pseudo-user direct-reply dialog (`PseudoUserChatDialog`), the disclaimer acceptance modal (`MetaDisclaimerDialog`), and the chat error dialog (`ChatErrorDialog`).
    -   Translated the admin clear-history and clear-feedback buttons (`ClearAgentChatHistoryButton`, `ClearAgentChatFeedbackButton`), including their confirmation dialogs using `{agentName}` variable interpolation.
    -   Translated the full wallet credential dialog (`WalletRecordDialog`), including header, all form labels, action buttons, type options, scope checkboxes, and validation error messages.

-   Updated the Agents Server control panel to hide server-disabled options instead of rendering greyed-out controls:

    -   Added metadata-driven availability flags for each control-panel option/section and resolved them once in the app shell as the single source of truth for the active server.
    -   Filtered status badges, toggle tiles, and section containers so only options available on the current server render, while empty groups disappear entirely.
    -   Aligned browser-notification prompting with the same availability source so servers that hide notifications no longer surface notification-enable flows elsewhere in the UI.

-   Refined Agents Server `ARTICLE_MODE` chat layout on the main chat page for a more readable article-style transcript:

    -   Kept article-mode chats full-width on mobile while constraining the desktop reading column to a centered max width with balanced side padding.
    -   Aligned the composer to that same centered article column so the transcript and input feel like one cohesive surface.
    -   Left `BUBBLE_MODE` rendering unchanged.

-   Improved Czech Agents Server UI translations to read more naturally across the localized interface:

    -   Rewrote the built-in Czech language pack for menu items, control panel labels, authentication dialogs, agent-creation wizard copy, footer links, and user-management screens.
    -   Adjusted wording based on actual UI context (for example admin-role labels, browser-local language settings, privacy-mode confirmation, and email-contact fallback messages) so the Czech copy fits the rendered components more naturally.

-   Fixed Agents Server chat timestamps and response-duration labels to respect the active server language and locale:

    -   Wired shared `<Chat/>` timing UI to accept locale-aware timestamp formatting and translatable response-duration copy instead of hardcoded English output.
    -   Updated Agents Server durable chat, profile preview, and chat-list relative time formatting to use `moment` with the currently selected server language (including Czech 24-hour time).

-   Improved Agents Server Czech localization coverage across legacy admin and utility screens that still rendered hardcoded UI copy:

    -   Added a global legacy UI auto-translator in the Agents Server shell to localize known hardcoded literals after render without rewriting every older screen to the keyed translation API first.
    -   Expanded the Czech legacy phrase catalog with missing admin, diagnostics, backup, gallery, message, token, and utility-page labels so previously untranslated UI text now renders in Czech.

-   Added `github-copilot` as a supported `ptbk coder run` runner, including CLI validation, runner dispatch, documentation, and a ready-to-run VS Code terminal preset.

-   Improved Agents Server `ARTICLE_MODE` chat rendering so assistant replies feel like regular article content while keeping `BUBBLE_MODE` unchanged:

    -   Centered assistant article replies on desktop with a readable max width and preserved full-width behavior on mobile.
    -   Moved article-mode assistant actions (`read`, `copy`, `feedback` / `report issue`) into an always-visible bottom action row instead of hover-revealed overlays.
    -   Added a shared message-action layout abstraction in `ChatMessageItem` to keep article/bubble action rendering DRY and maintainable.

-   Added Agents Server chat visual mode controls with metadata-backed defaults and live rendering switch:

    -   Added new metadata key `CHAT_VISUAL_MODE` with supported values `BUBBLE_MODE` and `ARTICLE_MODE` (default `BUBBLE_MODE`).
    -   Added a new Control panel setting **Chat visual mode** that updates chat rendering immediately without page reload.
    -   Persisted user overrides per browser (local storage + cookie) while keeping metadata as the initial default.
    -   Extended shared `<Chat/>` API with `CHAT_VISUAL_MODE` and implemented `ARTICLE_MODE` rendering where user messages stay bubble-style and agent messages render as seamless borderless article blocks.

-   Fixed intermittent Agents Server durable-chat quick-button no-op behavior by removing a stale ref-sync race in chat selection state:

    -   Removed redundant `activeChatIdRef` synchronization from a standalone `useEffect` in `AgentChatHistoryClient`.
    -   Kept `activeChatIdRef` sourced only from the explicit selection synchronizer, preventing outdated effect executions from temporarily overwriting the current chat id used by quick-button sends.

-   Fixed Agents Server chat-history navigation E2E assertions to match durable-chat behavior reliably:

    -   Scoped the profile preview assertion to the actual message bubble, avoiding duplicate-text strict-mode failures when the same reply text appears in both the chat list and transcript.
    -   Updated the New chat stale-refresh regression to allow the expected optimistic-to-canonical chat-id handoff while still asserting that background refresh never switches back to an existing seeded chat.

-   Improved Agents Server route-transition UX with a global top-edge loading bar for chat/navigation handoffs:

    -   Added a fixed gradient progress bar that appears immediately on internal navigation and completes when the target route is ready.
    -   Wired navigation-start signals for both internal link clicks and programmatic `router.push(...)` transitions used by shared headless helpers and profile-to-chat handoff paths.
    -   Added a stall-safe timeout plus reduced-motion support so the indicator stays informative without lingering indefinitely.

-   Fixed Agents Server chat-history E2E reliability when local environment SQL settings leak into Playwright runs:

    -   Updated the Agents Server Playwright app environment to explicitly clear `POSTGRES_URL` / `DATABASE_URL`, so E2E runs stay isolated to the mocked Supabase backend.
    -   Added a graceful fallback in `listUserChatSummarySeeds` that uses standard Supabase chat reads when direct SQL summary optimization is unavailable (for example missing connection env or partially migrated `UserChat` relation/columns).
    -   Preserved the optimized SQL summary path for normal production/runtime configurations where direct PostgreSQL access is available.

-   Improved Agents Server navigation performance by removing redundant organization work on normal page loads:

    -   Anonymous organization loading now queries only `PUBLIC` agents before resolving sources, instead of resolving private/unlisted agents that are filtered out later.
    -   Added a short-lived active-organization snapshot cache so repeated page navigations reuse the already resolved agent/folder tree instead of rebuilding it on every request.
    -   Added short-lived negative caching plus in-flight deduplication for failed imported-agent fallbacks, preventing repeated retries against unavailable imported agents during the same browsing session.
    -   Added regression tests for imported-agent fallback caching and verified the Agents Server build and focused route timings after the change.

-   Fixed Agents Server profile-page chat handoff when client-side routing stalls, so profile actions now always reach the standalone chat route:

    -   Added a guarded hard-navigation fallback in `AgentProfileChat` that triggers only if `router.push(...)` does not change the URL within a short delay.
    -   Applied the fallback to all profile-to-chat entry paths (`My chats`, quick buttons, and composer send), keeping pending message handoff intact.

-   Fixed Agents Server durable-chat draft composer so unsent textarea content is no longer overwritten by background draft reapply while the user is interacting:

    -   Added a dedicated user-owned draft lock in `AgentChatHistoryClient` that is activated by composer `keydown` / `input` / `select` interactions.
    -   Updated canonical snapshot/detail application to preserve the current textarea draft whenever the active draft is marked user-owned, even when autosave clears the dirty-save flag.
    -   Reset the user-owned lock only on explicit draft ownership transitions (for example chat switch/clear or successful send), preventing back-and-forth draft flicker during editing.

-   Updated Agents Server durable chat UX to run key chat actions optimistically so interactions feel instant:

    -   New chat creation now opens an optimistic placeholder chat immediately (instant selection + URL update) while the server chat is created in the background.
    -   User messages now append to the chat immediately for all sends with lightweight lifecycle badges (`Sending` / `Failed`) instead of waiting for server roundtrips.
    -   Failed optimistic messages now stay visible with explicit failed state and can be resent without duplicate bubbles by reusing per-chat `clientMessageId` mapping.
    -   Added optimistic chat-id reconciliation so pending messages and failed-send metadata move from temporary chat ids to canonical server chat ids without cross-chat leakage.

-   Updated Agents Server chat progress rendering to use native markdown checklists in the normal message flow:

    -   Replaced the dedicated in-bubble progress card container with checklist markdown rendered as plain assistant message content.
    -   Mapped structured `progressCard` payload data (`title` / `now` / `items` / `next`) to native markdown task-list syntax (`- [ ]` / `- [x]`), including multiline and nested checklist content.
    -   Reused the same markdown rendering pipeline as standard assistant messages, so checklist items render with the same behavior/visuals as other markdown.
    -   Added chat message tests covering: no separate progress container, checklist rendering from structured progress payload, nested checklist rendering, unchanged non-progress formatting, and preserved tool-call chips.

-   Enhanced the Agents Server default chat route (`/agents/[agentName]/chat`) design to improve visual hierarchy and polish without changing chat behavior:

    -   Introduced a new default chat-shell visual system with layered gradients, subtle ambient motion, and responsive spacing tuned for the chat workspace.
    -   Refined default chat sidebar surfaces and controls (header, new-chat CTA, chat rows, filters, hover/active states) while preserving all existing actions and state logic.
    -   Upgraded default chat panel styling (message bubbles, composer, send/actions, read-only banner, loading/guest wrappers) to deliver a more cohesive premium chat appearance.

-   Fixed Agents Server local development startup hangs caused by middleware custom-domain scans on local/private hosts:

    -   Normalized bracketed IPv6 host headers (for example `[::1]:4440`) to a canonical form so loopback detection works reliably.
    -   Skipped expensive custom-domain resolution for private-network hosts during non-production runs (for example `172.16.x.x`, `192.168.x.x`, `10.x.x.x`, `fe80::/10`, and `.local`), preventing repeated federated import/lookup work while developing locally.

-   Updated Agents Server mocked-chat sharing so viewer links are public while editor/admin paths remain authenticated:

    -   Made `/system/utilities/mocked-chats/view?chat=...` resolve mocked chats by public id without requiring a logged-in session, so shared URLs open for anyone.
    -   Kept mocked-chat administration/editing behind existing authenticated paths (`/system/utilities/mocked-chats` and `/api/system/mocked-chats`).
    -   Added public mocked-chat index synchronization in persistence (`UserData` key prefix `mockedChats.public.v1.*`) and fallback lookup for older stored chats.
    -   Added an explicit public-visibility warning in the mocked-chat editor and a branded QR share block (`PromptbookQrCode`) for quick mobile sharing.

-   Redesigned the Agents Server header control panel into a more compact control-center layout:

    -   Replaced the previous expandable section cards with visual tile toggles, so each toggle now has its own dedicated box (sound, vibration, notifications, self-learning, and private mode).
    -   Preserved all existing behavior and constraints, including private-mode confirmation, self-learning auto-disable when private mode is active, and notifications permission-aware enable/disable logic.
    -   Kept the language selector available as a compact dedicated card (hidden when server-language enforcement is enabled), and tightened the dropdown spacing for denser usability.
    -   Added localized control-panel copy for the new sound/vibration tiles in both English and Czech.

-   Fixed Agents Server profile-to-chat routing from `/agents/[agentName]` so profile interactions no longer no-op:

    -   Simplified profile chat navigation to route immediately with `router.push(...)` instead of deferred transition scheduling.
    -   Wired profile **My chats** cards to use explicit chat-route navigation callbacks instead of relying on deferred default-link behavior.
    -   Ensured profile quick-message buttons and composer sends consistently open `/agents/[agentName]/chat` (including relevant query params).
    -   Added E2E coverage for profile **My chats** cards, profile quick buttons, profile composer sends, and durable-chat quick-button sends.

-   Improved Czech (`SERVER_LANGUAGE=cs`) localization coverage in Agents Server by translating legacy hardcoded UI phrases that still flowed through `formatText(...)` / `formatAgentNamingText(...)`:

    -   Added a centralized Czech legacy phrase catalog at `apps/agents-server/src/components/AgentNaming/legacyAgentTextTranslations.cs.yaml`.
    -   Updated `AgentNamingProvider` to apply legacy phrase translation before agent-naming replacement, so existing UI strings now render in Czech without rewriting each call site.
    -   Localized additional hardcoded labels in the agent context menu (for example copy feedback, QR action, standalone/chat links, history/analytics/feedback links, and failure dialog titles) by routing them through `formatText(...)`.
    -   Added regression tests that automatically scan Agents Server source literals used in `formatText(...)` and `formatAgentNamingText(...)` and fail when any new literal is missing from the Czech legacy phrase catalog.

-   Added server-language enforcement support in Agents Server metadata:

    -   Added new metadata key `IS_SERVER_LANGUAGE_ENFORCED` (`true`/`false`) with default `false`.
    -   When `IS_SERVER_LANGUAGE_ENFORCED=true`, the server now ignores per-browser language overrides and always uses `SERVER_LANGUAGE`.
    -   Hid the Control panel language section when language enforcement is enabled, so users cannot switch the UI language locally.
    -   Seeded `IS_SERVER_LANGUAGE_ENFORCED=false` during managed-server bootstrap for newly created servers.

-   Fixed Agents Server self-learning persistence for inherited agents so learning is now append-only on the child source and no longer snapshots/materializes parent-chain source into child books:

    -   Added shared append-only self-learning persistence utility (`resolveAppendOnlySelfLearningAgentSource`) that derives only the newly appended delta from resolved runtime source and applies it onto the unresolved stored child source.
    -   Wired the append-only persistence flow into all server-side learning save paths: `/agents/[agentName]/api/chat`, `/agents/[agentName]/api/voice`, OpenAI-compatible chat handler, and durable user-chat worker.
    -   Ensured idempotency guardrails by skipping persistence when no append-only delta exists, when a non-append-only rewrite is detected, or when the same appended section is already present in stored child source.
    -   Added regression coverage for both inheritance modes (implicit default Adam and explicit `FROM`) asserting that learned child storage is updated with child-only appended content and does not duplicate materialized parent-chain source.

-   Stabilized and optimized Agents Server database pressure under durable-chat load to mitigate Supabase pool exhaustion (`PGRST003`) and improve chat responsiveness:

    -   Hardened middleware hot path with longer metadata/server caching, per-host custom-domain resolution caching (including negative cache), per-host in-flight resolution deduplication, strict custom-domain resolution timeout, and matcher exclusions for `/api/internal/*` and `robots.txt` to avoid unnecessary DB work on worker/internal requests.
    -   Optimized custom-domain lookup to pre-filter DB candidates by host (`or(...)`) instead of scanning all agents per server, and reduced resolver bootstrap payload to lightweight identity rows.
    -   Fixed `$provideAgentCollectionForServer` caching so collections are reused per `tablePrefix` instead of being effectively recreated repeatedly.
    -   Reduced chat list payload cost by adding lightweight summary-seed loading (without full `messages` hydration) and fetching full transcript only for the active chat in `/agents/[agentName]/api/user-chats`.
    -   Reduced durable job write pressure by increasing heartbeat/persist intervals, tolerating transient heartbeat failures, deduplicating unchanged assistant snapshot writes, and extending chat-job lease duration.
    -   Added cron GET/auth support for `/api/internal/user-chat-jobs/run`, scheduled both durable job + timeout worker crons to 2-minute cadence, and added metadata default `USER_CHAT_BACKGROUND_CRON_INTERVAL_MINUTES=2`.
    -   Added migration `2026-04-0010-user-chat-performance-indexes.sql` with targeted `UserChat`, `UserChatJob`, and `UserChatTimeout` indexes for queue/list hot paths.

-   Fixed flaky Agents Server E2E authorization + chat-history tests by stabilizing startup and profile-to-chat assertions:

    -   Updated Playwright app startup command to `npm run prebuild && next build && npm run start`, preventing transient port-`4440` conflicts caused by homepage prerender startup during E2E server boot.
    -   Hardened E2E login helpers with retry-aware login dialog opening and deterministic admin-state verification.
    -   Reworked `api-authorization` E2E coverage to avoid page-navigation coupling for anonymous metadata checks and to use browser-context authenticated `fetch` for admin-only API assertions.
    -   Refactored delayed-request interception in chat-history tests into one shared helper, fixed route-release/unroute race handling, and stabilized the profile-origin first-message scenario by using the profile `?message=...` entry path with durable-chat assertions.

-   Enhanced Agents Server mobile header menu layout consistency and usability:

    -   Moved the mobile hamburger trigger into the normal header flow so it no longer overlaps the server logo area.
    -   Removed boxed hamburger styling and kept one shared toggle in the same top-left position for both open and close states.
    -   Preserved both mobile drawer dismissal paths: swipe-to-close and outside-click backdrop close.
    -   Refined the mobile drawer to a denser left-aligned layout and extracted shared mobile drawer style tokens to keep the implementation DRY.

-   Fixed Agents Server **My chats** navigation no-op clicks so links consistently route with Next.js client-side navigation:

    -   Added optional `href` support to hoisted mobile **My chats** items and kept optional click callbacks for side effects.
    -   Updated header leaf rendering to prioritize `href` navigation even when submenu items also define `onClick`.
    -   Switched agent-profile **My chats** cards to client-side links and added a safe fallback when view transitions reject overlapping route updates.

-   Refined Agents Server mobile header left drawer behavior and visual hierarchy:

    -   Switched mobile drawer + backdrop positioning to viewport-fixed layers so opening the drawer no longer gets cropped by header layout constraints.
    -   Locked page/root scrolling while the drawer is open, so scrolling is constrained to the drawer content on mobile.
    -   Flattened hoisted **My chats** rendering by removing the extra boxed wrapper, keeping it on the same visual level as other mobile menu sections.
    -   Polished the mobile hamburger trigger styling to improve contrast and tap usability.

-   Improved Agents Server mobile header menu usability on small screens:

    -   Moved the mobile hamburger trigger to the far left edge of the header so it is consistently reachable from the page corner.
    -   Fixed mobile menu panel cropping by switching to a full-height drawer surface (`100dvh`) with full-height backdrop coverage.
    -   Kept click + swipe menu interactions and prioritized hoisted route content by rendering **My chats** at the top of the mobile drawer and auto-expanding its first section on open.

-   Optimized Agents Server database query volume to fix Supabase overload, unhealthy status, and server crashes:
-   Unified Agents Server mobile navigation into one shared left-side drawer opened from the header hamburger:

    -   Moved the mobile hamburger trigger to the left side of the fixed header and kept desktop navigation behavior unchanged.
    -   Redesigned the mobile menu from a top sheet to a left drawer, including left-edge swipe-to-open and in-drawer swipe-to-close gestures.
    -   Added shared mobile menu hoisting for route-specific sections and wired agent chat + agent profile pages to hoist a nested **My chats** section into the same drawer.
    -   Removed the duplicate chat-page-only mobile sidebar trigger path so chat navigation now goes through the unified header menu system.

-   Fixed Agents Server durable chat-task startup reliability so queued agent replies no longer stay stuck indefinitely when immediate worker wake-ups are missed:

    -   Added active-chat worker wake-ups directly from the canonical chat stream route, so chats currently viewed by users re-trigger queued reply jobs quickly (`preferredJobId` + throttled retries).
    -   Added cron execution support for `/api/internal/user-chat-jobs/run` (including Vercel cron authorization), and wired a dedicated Vercel cron entry for background catch-up ticks.
    -   Added metadata-backed background wake interval configuration (`USER_CHAT_BACKGROUND_WORKER_INTERVAL_MS`, default `120000`) and applied it to cron job claiming so unattended queued jobs are picked only after the configured delay.

-   Deduplicated repeated Promptbook Engine `USE` commitment sections in generated system messages:

    -   Repeated `USE TIME`, `USE BROWSER`, and `USE SEARCH ENGINE` commitments now emit their hard-coded system-message guidance only once per type while preserving the first-occurrence position.
    -   Distinct free-text instructions from repeated `USE` commitments are now merged once in stable source order instead of being duplicated block-by-block.
    -   Added regression coverage for duplicate `USE` aggregation and multi-`PERSONA` ordering.

-   Fixed critical Agents Server Supabase overload/crash behavior and improved chat responsiveness by reducing repeated database work in the hottest paths:

    -   Middleware now reuses a singleton Supabase client and caches the `_Server` registry (10s TTL) and `Metadata` lookups (30s TTL) instead of creating a new client and querying the database on every HTTP request.
    -   Admin task-manager default polling interval increased from 3s to 10s, and recovery operations (`recoverExpiredRunningUserChatJobs`, `recoverExpiredRunningUserChatTimeouts`) are now throttled to at most once per 60s instead of running on every poll.
    -   Chat stream SSE active polling interval increased from 500ms to 1,500ms and idle polling from 5s to 10s to reduce per-chat database reads.
    -   Vercel cron schedule for timeout worker changed from every minute to every 5 minutes since local wake-up timers already handle short-duration timeouts.
    -   Chat job heartbeat interval increased from 5s to 15s and assistant message persist throttle from 500ms to 2,000ms to reduce streaming write load.
    -   Agent preparation wait polling interval increased from 250ms to 500ms.

-   Fixed Agents Server durable user-chat persistence when a chat disappears mid-save so missing chat rows no longer surface raw internal `mutate_chat` diagnostics to users:

    -   Durable worker finalization now treats `USER_CHAT_NOT_FOUND` as a delete/navigation race, finalizes the queued job cleanly, and skips rethrowing the internal persistence diagnostic.
    -   Assistant terminal-state persistence now still finalizes the durable job even when the backing chat row vanished before the final assistant-message update can be written.
    -   `PATCH /agents/[agentName]/api/user-chats/[chatId]` now maps missing-chat scope failures back to a deterministic `404 Chat not found.` response instead of returning the internal markdown diagnostic blob.

-   Fixed flaky Agents Server E2E startup on Windows by isolating Playwright's Next.js build output into `.next-e2e`, avoiding `.next/trace` file-lock collisions with other local Next.js processes that could leave the test server unavailable.

-   Fixed Jest TypeScript path resolution for `@promptbook-local/*` imports by correcting the `paths` pattern in `tsconfig.jest.json` from the invalid regex-style `$1.index` to the correct TypeScript glob syntax `*.index`, resolving `TS2307: Cannot find module '@promptbook-local/utils'` errors in test runs.

-   Fixed Jest test suite compilation for `*.yaml?raw` Vite-style imports used in Agents Server language packs:

    -   Added `apps/agents-server/src` to `tsconfig.jest.json` `include` so the existing `yaml-raw.d.ts` type declaration is picked up by ts-jest, resolving `TS2307: Cannot find module '*.yaml?raw'`.
    -   Added `moduleNameMapper` entry in `jest.config.js` to strip the `?raw` query suffix at runtime (`*.yaml?raw` → `*.yaml`).
    -   Added `jest.yamlRawTransformer.js` and registered it as a transform for `.yaml`/`.yml` files so Jest returns the raw file content as a string, matching Vite's `?raw` import semantics.

-   Fixed Agents Server Vercel homepage prerender builds so the post-build snapshot step no longer fail-blocks deployment when federated homepage resolution is too slow:

    -   Updated `apps/agents-server/scripts/prerender-homepage.js` to wait for the `next start` readiness log instead of probing HTTP routes that still execute Agents Server middleware.
    -   Kept the homepage snapshot attempt, but made it best-effort so builds continue when `/` cannot be captured within the bounded timeout because server-side federated agent resolution is hanging or too slow.

-   Unified the Agents Server mobile app menu with the chat-specific **My chats** navigation so mobile chat pages now use one shared header hamburger menu:

    -   Extended the shared menu-hoisting context so pages can contribute mobile-only menu sections in addition to hoisted icon actions.
    -   Wired the chat history page to hoist a **My chats** section into the shared mobile header menu, including new-chat, chat-pickup, delete, and filter controls.
    -   Removed the duplicate mobile chat-sidebar trigger/overlay path while leaving the existing desktop chat sidebar behavior unchanged.

-   Optimized Agents Server agent chat preparation so repeated chats stop paying the same setup cost on every message:

    -   Added shared process-local caching for resolved server-agent runtime state and prepared model requirements, and reused it across the web chat route, OpenAI-compatible chat path, durable user-chat jobs, agent-preparation worker, model-requirements endpoints, and durable-chat disclaimer checks.
    -   Upgraded `AgentKitCacheManager` to accept precomputed model requirements and to keep a short-lived in-memory cache of fully prepared AgentKit agents, so hot chats reuse prepared AgentKit state instead of recomputing requirements, vector-store checks, and preparation work.
    -   Cached the well-known Teacher remote agent connection instead of refetching its profile on each chat run.
    -   Parallelized several independent async lookups in the hot chat paths (server origin, collection/resolver loading, user lookup, wallet/token resolution), reducing avoidable wall-clock latency before responses start streaming.
    -   Documented the deeper root-cause analysis and the next durable cross-instance optimization step in [2026-03-1580-agents-server-optimize.notes.md](../prompts/2026-03-1580-agents-server-optimize.notes.md).

-   Fixed Agents Server federated agent-source resolution so missing remote imports no longer break inheritance/import processing:

    -   Added a shared retry path for federated agent imports with 3 total attempts and a configurable metadata-backed delay (`FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS`).
    -   After the retries are exhausted, the resolver now injects a valid fallback book source (`Not found agent` + explanatory `NOTE`) instead of failing or skipping the imported source entirely.
    -   Wired the retry/fallback behavior through inherited-agent resolution, direct `/api/book` resolution, custom-domain metadata resolution, and other server-side resolved-agent entry points.

-   Fixed Agents Server middleware crash (`Unknown environment, cannot determine how to get Supabase client`) caused by `$provideSupabase` not recognising the Next.js Edge Runtime:

    -   Added `$provideSupabaseForEdge` that creates a lightweight, session-less Supabase client suitable for Edge Runtime (uses service-role key when available, falls back to anon key).
    -   Updated `$provideSupabase` to detect the Edge Runtime via `globalThis.EdgeRuntime` and delegate to `$provideSupabaseForEdge`, resolving the timeout in the `api-authorization` E2E test for anonymous users.

-   Fixed Agents Server agent breadcrumb `More` submenu items so they now reuse and display the same icons as the shared agent profile/context menu entries.

-   Restored immediate hover navigation for Agents Server header dropdowns so hover-opened desktop menus remain pointer-interactive without an extra click:

    -   Hover-opened `System`, agent-view (`Profile` / `Chat` / ...), federated-server, agents, and profile menus now keep pointer events enabled while preserving the shared delayed open/close logic.
    -   Kept the existing click-committed state only for explicit toggle behavior, so the header interaction code stays DRY while hover navigation works again.

-   Enhanced the Agents Server new-agent wizard to cover more of the book-language agent design flow while keeping the UI DRY:

    -   Added `GOAL` input to page 1 alongside name, description, and visibility.
    -   Expanded page 2 persona setup with icon-based persona presets, explicit `OPEN` / `CLOSED` learning mode, and a capability catalogue covering all concrete `USE *` commitments, with advanced-editor-only handling for commitments that need extra configuration.
    -   Inserted a new writing-style page with icon-based presets, custom writing traits/rules, mocked-chat sample previews, and hidden source synthesis for `WRITING RULES` plus `WRITING SAMPLE`.
    -   Expanded rules presets with icons and additional guardrail options.
    -   Refactored wizard preset metadata into shared configuration used by both the UI and hidden source synthesis, and added tests that keep the wizard capability list aligned with the commitment registry.

-   Fixed flaky `promptbookFetch` test by removing the `https://s6.ptbk.io/` URL assertion that was returning `MIDDLEWARE_INVOCATION_TIMEOUT` errors.

-   Added configurable Agents Server chat feedback modes with a single `CHAT_FEEDBACK_MODE` setting (`off`, `stars`, `report_issue`) and wired it through all chat surfaces:

    -   Replaced boolean `isFeedbackEnabled` UI wiring with mode-based `feedbackMode` routing in standalone chat, ChatGPT-like chat, and book+chat views.
    -   Extended shared chat feedback UI to support a lightweight `report_issue` flow that replaces stars with a report action while reusing the same feedback save callback/payload path.
    -   Added metadata default `CHAT_FEEDBACK_MODE` and kept legacy `IS_FEEDBACK_ENABLED` fallback/compatibility behavior for older configurations and create-server bootstrap payloads.

-   Updated shared chat citation rendering (including Agents Server chat bubbles) to show clean numbered inline references with per-message footnotes:

    -   Added citation-footnote transformation that supports both OpenAI-style markers (`【id†document】`) and inline id tokens (`[0:0]`, `[8:13]`), maps ids to document sources, and assigns stable numbers by first appearance.
    -   Deduplicated repeated citations by document source so repeated mentions reuse the same inline number and emit a single footnote entry.
    -   Replaced message-level source chip rendering for direct message citations with a bottom footnote list formatted as `number -> 【document.ext】`, while keeping teammate/transitive source chips unchanged.
    -   Added unit coverage for `[0:0]` / `[8:13]` parsing+mapping, per-document deduplication, first-appearance numbering stability, and mixed-notation rendering.

-   Fixed Agents Server nested header submenu interaction so hover-opened submenu panels now keep pointer events enabled, preventing category subitems from closing before they can be clicked.

-   Updated the Agents Server `/agents/[agentName]/system-message` page so `promptSuffix` is extracted and shown in its own read-only field (like `systemMessage`), and the JSON model-requirements preview now replaces both extracted fields with `[look ☝ above]` placeholders.

-   Fixed Agents Server Book editor syntax highlighting around fenced markdown blocks so indented fence delimiters (for example lines like `   \`\`\`markdown`and` \`\`\``) now correctly open and close Monaco code-block tokenization, preventing subsequent commitments from staying incorrectly highlighted as code.

-   Increased the default `maxTurns` for agent runs from `10` to `200` in `OpenAiAgentKitExecutionTools` to prevent premature "Max turns exceeded" failures on complex agentic tasks.

-   Fixed Agents Server durable user-chat message enqueue error handling so concurrent chat deletion races no longer surface as generic internal save failures:

    -   Added explicit `UserChatScopeError` handling in `POST /agents/[agentName]/api/user-chats/[chatId]/messages`.
    -   `USER_CHAT_NOT_FOUND` now returns a deterministic `404 Chat not found.` response instead of leaking the internal `mutate_chat` diagnostic markdown as a generic `500`.
    -   Kept scope-diagnostics inconsistency failures mapped to `500`, while scope mismatch failures continue to map to `404`.

-   Added Promptbook coder project bootstrap command aliases `ptbk coder init` and `ptbk coder initialize` for external repositories:

    -   Added new `src/cli/cli-commands/coder/init.ts` subcommand that initializes coder prerequisites in current project.
    -   The new initializer now creates `prompts/` and `prompts/done/` if missing.
    -   The new initializer now ensures `.env` contains required coding-agent identity variables (`CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, `CODING_AGENT_GIT_SIGNING_KEY`) with default Promptbook bootstrap values.
    -   Wired the command into `src/cli/cli-commands/coder.ts` and updated coder subcommand help text.
    -   Extended `src/cli/test/ptbk.test.ts` with CLI coverage for both `coder init --help` and `coder initialize --help`.

-   Unified Promptbook CLI bootstrap for local and packaged execution so `ts-node src/cli/test/ptbk.ts ...` and `npx ptbk ...` now run through the same initializer:

    -   Added shared `src/cli/$runPromptbookCli.ts` bootstrap with single runtime-registration path.
    -   Updated `src/cli/main.ts` (`_CLI._initialize_promptbookCli`) to call the shared bootstrap.
    -   Updated `src/cli/test/ptbk.ts` to use the same shared bootstrap instead of a separate direct initialization path.

-   Added an optional Agents Server web-chat progress tool (`agent_progress`) for deep-research-style live progress panels during long responses:

    -   Added a new runtime tool definition + handler that supports `initialize`, `append_items`, `update`, and `finalize` actions with validated structured payloads (`title`, `now`, `next`, and bullet `items` with `pending` / `completed` status).
    -   Wired the tool into web chat runtimes (durable user-chat jobs and `/api/chat`) and extended hidden chat runtime context with `assistantMessageId` so progress updates target the correct in-flight assistant message.
    -   Persisted progress-card state on the assistant message and reused the existing canonical chat stream mechanism by extending snapshot signatures to include progress-card changes (no separate transport required).
    -   Added a new in-bubble `ProgressPanel` renderer in chat messages with spinner/completed bullet statuses, explicit **What I'm Doing Now** / **What I'll Do Next** sections, and markdown rendering support for tool-provided text.
    -   Preserved existing fallback thinking placeholders when the tool is never used, and ensured final answer persistence clears/hides progress panels.
    -   Invalid tool payloads now fail gracefully (structured `ignored` result + server logs) without crashing the chat run.

-   Fixed critical Agents Server Supabase overload/crash behavior under durable chat load by reducing database pressure in the hottest runtime paths:

    -   Added write backpressure in durable chat job execution so assistant-message progress is no longer persisted on every streamed token chunk; persistence is now throttled to a bounded cadence with final-state flushes preserved.
    -   Reduced canonical chat stream polling pressure for active and idle chats (`/agents/[agentName]/api/user-chats/[chatId]/stream`) to significantly lower repeated Supabase reads.
    -   Prevented timeout-worker bootstrap storms by ensuring the immediate catch-up kick runs only once per server process instead of on every scope-resolving request.

-   Enhanced the Agents Server `/agents/[agentName]/chat/chatgpt-like` alternative chat UI to better mirror ChatGPT while keeping the existing Promptbook header and fully reusing the same durable chat pipeline:

    -   Kept data/backend behavior shared with the canonical chat route and added missing route parity for `shareTarget` deep links (including auto-executed shared message attachments) so both views open/continue the same conversations.
    -   Refined ChatGPT-like-only layout/styling tokens for the left chat tray, centered conversation column, message rows, composer, and mobile drawer/top bar, without changing `/agents/[agentName]/chat` behavior.
    -   Added a direct `ChatGPT-like` entry to the header agent view switcher so users can navigate to this view alongside other agent pages.

-   Fixed Jest test suite picking up `.tmp/pixel-agents-repo/webview-ui/test/dev-assets.test.ts` - added `testPathIgnorePatterns` to [jest.config.js](../jest.config.js) to exclude the `.tmp/` directory from Jest's test discovery (the file is a Node.js native test runner test, not a Jest test)

-   Enhanced the shared `Chat` component design used in Agents Server to deliver a more premium, polished conversation UI without changing chat behavior:

    -   Refined visual hierarchy and spacing across message rows, avatars, bubbles, metadata, tool/source chips, quick buttons, and inline copy/play controls.
    -   Refreshed chat composer and top action buttons with a cleaner, more cohesive surface treatment and typography.
    -   Improved in-bubble markdown typography/styling for headings, lists, links, blockquotes, inline code, tables, and citation refs using message-aware CSS variables.
    -   Removed duplicated markdown primitive rules from `Chat.module.css` and centralized markdown primitives in `MarkdownContent.module.css` to keep chat styling DRY.

-   Added a new Agents Server **System -> Utilities** area with first utility **Mocked Chats**:

    -   Added a new Utilities section in the System menu for all authenticated users (non-admin included), plus a `/system/utilities` index page.
    -   Added per-user mocked-chat preset persistence via existing `UserData` (`mockedChats.v1`) with server-side normalization/validation and authenticated CRUD API at `/api/system/mocked-chats`.
    -   Added `/system/utilities/mocked-chats` editor UI with My Mocked Chats list + editor surface, including create, duplicate, rename, delete, Save, Save as New, participant/message/timing/background metadata editing, and clear `Open in new window` CTAs.
    -   Added `/system/utilities/mocked-chats/view` recording viewer route that renders Promptbook header with a minimal mocked-chat-only left list (no regular My Chats tray), uses `MockedChat` for scripted playback, supports quick preset switching, and keeps typed demo messages local-only.
    -   Extended shared `MockedChat` with deterministic `messageOffsetsMs` playback, optional local append-on-send mode, and `onSimulationComplete` callback to support looped replay scenarios.

-   Added a new Agents Server homepage view `/?view=pixel-office` that renders a dedicated Pixel Office visualization:

    -   Added shared homepage-view mode helpers so list/graph/office/pixel-office query handling stays consistent across server pages and the client view switcher.
    -   Added a new `Pixel` toggle beside `List` / `Graph` / `Office` and wired it to lazy-load the new homepage pixel visualization.
    -   Added a new pixel-office renderer that reuses the existing office layout model for DRY room/desk/agent mapping while drawing animated top-down pixel sprites.
    -   Integrated Pixel Agents assets via a small server-side asset proxy route backed by the `pixel-agents` package so character sprite sheets are reused directly.

-   Enhanced Agents Server timeout management so agents can inspect and control timers across all their chats with stronger bulk and individual controls:

    -   Extended `USE TIMEOUT` with richer management semantics: `cancel_timeout` now supports `allActive: true`, new `update_timeout` allows pause/resume and next-run/recurrence/payload edits, and `list_timeouts` now returns assistant-visible per-timeout rows (including ids) so agents can act directly on concrete timers.
    -   Added shared agent-scoped bulk timeout utilities (cancel all active, pause all active queued, resume all paused queued) and reused them from both the runtime tool adapter and HTTP APIs to keep timeout-management logic DRY.
    -   Added `POST /agents/[agentName]/api/timeouts/actions` for timeout manager bulk actions and upgraded `/agents/[agentName]/timeouts` UI with one-click `Cancel active`, `Pause active`, and `Resume paused` controls across chats.
    -   Extended timeout list-query options with explicit paused filtering and updated timeout-related tool/chip metadata/tests to cover the new management flows.

-   Fixed `@promptbook/components` build failure in consuming projects caused by unresolved `leaflet` imports - removed static CSS import, load Leaflet CSS dynamically via CDN `<link>`, added `leaflet` to Rollup externals, and updated package generation script to detect dynamic `import()` references so `leaflet` is correctly listed as a dependency

-   Fixed Rollup build hang for `@promptbook/pdf` (and other packages) by re-enabling the `external` dependency list in `rollup.config.js` - heavy dependencies like `markitdown-ts` were being inlined, causing Rollup to stall indefinitely

-   Updated README and documentation to focus on the **Agents Server** as the primary product, emphasizing persistent AI agents working on goals rather than pipelines and CLI tooling
-   Rewrote all Paul Smith Book examples to show **goal-oriented agents** with real capabilities: added `GOAL`, `USE EMAIL`, `USE BROWSER`, `USE SEARCH ENGINE` commitments; added new `Goal` and `Use` commitment showcase sections
-   Updated LLM model pricing and added new models across all providers (synced to 2026-03-22):

    -   **OpenAI**: Significant price reductions reflecting market changes:
        -   `gpt-4.1`: $3.00→$2.00 input, $12.00→$8.00 output per 1M tokens
        -   `gpt-4.1-mini`: $0.80→$0.40 input, $3.20→$1.60 output per 1M tokens
        -   `gpt-4.1-nano`: $0.20→$0.10 input, $0.80→$0.40 output per 1M tokens
        -   `o3`: 80% price cut - $15.00→$2.00 input, $60.00→$8.00 output per 1M tokens
        -   `o3-pro`: $30.00→$20.00 input, $120.00→$80.00 output per 1M tokens
        -   `o4-mini`: $4.00→$1.10 input, $16.00→$4.40 output per 1M tokens
        -   `o3-mini`: $3.00→$1.10 input, $12.00→$4.40 output per 1M tokens
        -   `gpt-4o` / `gpt-4o-2024-05-13`: $5.00→$2.50 input, $15.00→$10.00 output per 1M tokens
    -   **Google Gemini**: Updated Gemini 2.5 series pricing to match official API:
        -   `gemini-2.5-pro`: $7.00→$1.25 input, $21.00→$10.00 output per 1M tokens (reduction)
        -   `gemini-2.5-flash`: $0.35→$0.30 input, $1.05→$2.50 output per 1M tokens (output corrected upward; previous value was stale/incorrect)
        -   `gemini-2.5-flash-lite`: $0.20→$0.10 input, $0.60→$0.40 output per 1M tokens (reduction)
    -   **Anthropic Claude**: Added new Claude 4.6 generation models:
        -   Added `claude-opus-4-6` at $5.00/$25.00 per 1M tokens (down from $15/$75 for Claude 3 Opus)
        -   Added `claude-sonnet-4-6` at $3.00/$15.00 per 1M tokens
    -   **DeepSeek**: Updated `deepseek-chat` (DeepSeek V3) pricing: $0.14→$0.28 input, $0.28→$0.42 output per 1M tokens

-   Fixed `ptbk about` startup failures in external projects:

    -   Made `run_browser` tool resolution fully lazy in `resolveRunBrowserToolForNode`, so CLI startup no longer eagerly requires `playwright`.
    -   Removed import-time side effects from `find-fresh-emoji-tags` and `find-refactor-candidates` script modules by moving `.env` initialization and root-CWD checks into runtime initialization, preventing `CWD must be root of the project` during CLI bootstrap.
    -   Updated the draft shell installer to generate a Node-based `ptbk` launcher via `npx @promptbook/cli` instead of a hardcoded `ts-node` command.

-   Fixed Agents Server durable draft persistence to be race-tolerant when a chat is deleted or disappears during save:

    -   Treated `PATCH /agents/[agentName]/api/user-chats/[chatId]/draft` as best-effort for missing chats and now return a no-op success instead of surfacing a hard save error.
    -   Added dedicated scope-error response handling in the draft route so `USER_CHAT_NOT_FOUND` during `mutate_chat` no longer breaks user flow in concurrent delete/navigation timing windows.

-   Extended `USE TIMEOUT` cross-chat visibility/management in Agents Server runtime so one agent conversation can inspect and manage timeouts from other chats in the same user+agent scope:

    -   Added a new `list_timeouts` tool in the core `USE TIMEOUT` commitment (tool schema, parser, runtime adapter contract, system-message/docs, and tests) for scoped timeout discovery.
    -   Updated the Agents Server timeout runtime adapter to list agent-scoped timeouts via existing store APIs and to cancel by user+agent+`timeoutId` (without current-chat restriction), while keeping `set_timeout` scheduling thread-scoped.
    -   Added timeout chip title mapping for `list_timeouts` so chat tool-call UI remains human-readable.

-   Enhanced the Agents Server `/?view=office` visualization with a pixel-office inspired rendering style while preserving existing layout/state behavior:

    -   Reworked room rendering with textured floor tiles, stronger wall treatments, and richer corridor markings to better communicate office structure.
    -   Added deterministic decorative room props (bookshelves, plants, whiteboards, coffee/storage stations, and lounge furniture) for more expressive scene context.
    -   Updated desk and avatar rendering with richer furniture/character details and compact animated activity bubbles for `idle` / `working` / `meeting` / `moving` states.
    -   Refactored repeated isometric face rendering into reusable block/theme helpers to keep the office renderer DRY and easier to maintain.

-   Enhanced the Agents Server new-agent wizard to be lighter and faster, and aligned the flow with the new 4-step creation model:

    -   Simplified the wizard visual structure to reduce form-like clutter while keeping the same core data collection.
    -   Enabled direct step navigation so users can jump to any wizard step at any time without validation-based blocking.
    -   Prefilled Step 1 agent name from the existing boilerplate name generator path (`$generateAgentBoilerplateAction`), preserving metadata-driven name pool behavior.
    -   Reworked Step 2 custom traits into Enter-to-add removable chips and added human-friendly capability chips that map to hidden `USE BROWSER` / `USE SEARCH ENGINE` commitments in generated source.
    -   Reworked Step 3 custom rules into Enter-to-add removable chips.
    -   Reworked Step 4 knowledge URL entry into Enter-to-add behavior, made the entire wizard surface drag-and-drop active for file knowledge upload, and removed the `Open book editor after creation` option.
    -   Removed the Review step and moved final creation directly to Step 4.
    -   Updated wizard source synthesis and tests to support capability commitments and chip-array trait/rule inputs.

-   Fixed Agents Server header dropdown accidental-click UX by unifying desktop menu interaction behavior across breadcrumb menus and top navigation:

    -   Added a shared delayed hover-preview mode for desktop dropdowns so hover-opened menus are non-blocking (`pointer-events: none`) until the user explicitly commits with click.
    -   Kept click-to-open immediate and interactive, with the same shared state/timer logic reused for breadcrumb dropdowns (`Server`, `Agents`, `Profile/Chat/Book/More`) and top-level `Documentation`/`System`.
    -   Unified nested submenu handling (including `More`) under shared rendering/interaction code so hover/click behavior is consistent for menu items and subitems.

-   Added `USE CALENDAR` end-to-end support for Agents Server with Google Calendar integration:

    -   Added a new core commitment `USE CALENDAR` (alias `CALENDAR`) with parser/runtime wiring, capability chips, tool schemas/functions (`calendar_list_events`, `calendar_get_event`, `calendar_create_event`, `calendar_update_event`, `calendar_delete_event`, `calendar_invite_guests`), and metadata extraction for provider URL/scopes/calendar id.
    -   Added Google Calendar OAuth backend flows (`/api/calendar-oauth/connect`, `/api/calendar-oauth/callback`, `/api/calendar-oauth/status`, `/api/calendar-oauth/refresh`, `/api/calendar-oauth/revoke`) with signed state, wallet token persistence, refresh-token handling, and scoped redirect status reporting.
    -   Added calendar persistence and audit storage with migration `2026-03-0280-calendar-connections.sql` (`CalendarConnection`, `CalendarActivity`), plus Agents Server helpers and provider adapters for connection CRUD, activity reads/writes, and Google Calendar API access.
    -   Added agent-scoped calendar APIs for settings/operations: list connections/activity, disconnect one connection, list provider calendars, and execute event operations through provider-agnostic adapter contracts.
    -   Added chat/runtime integration so calendar tokens and configured calendar references flow into tool runtime context, with calendar tool-call activity logging persisted for agent/user audit visibility.
    -   Extended wallet-request popup UX to support calendar-first OAuth connect flow (calendar URL, requested scopes, example actions, one-click connect + manual token fallback), and updated chat wrappers to load Calendar OAuth status.
    -   Added an Agent Integration settings section that shows connected calendars, OAuth readiness, re-auth action, disconnect controls, and recent calendar activity timeline.
    -   Added Agents Server metadata defaults for Google Calendar OAuth configuration keys (`GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI`, `GOOGLE_CALENDAR_STATE_SECRET`).

-   Added Agents Server crawling/indexing visibility policy with server-level `SERVER_VISIBILITY` (`PRIVATE` by default, optional `SERVER_VISIBILITY` env override), dynamic `robots.txt`, visibility-gated/paginated `sitemap.xml`, visibility-aware agent metadata and `X-Robots-Tag` headers, plus admin metadata UI support for explicit private/public server visibility switching.

-   Added a metadata-controlled `NEW_AGENT_WIZZARD` A/B path for Agents Server new-agent creation, preserving the current boilerplate book-editor flow by default while enabling a guided multi-step wizard that collects high-level agent details, uploads knowledge through the same ingestion pipeline, synthesizes the hidden book source with a traceability `NOTE`, reuses the existing create-agent endpoint in the background, supports an advanced switch back to the raw editor, and emits client-side funnel analytics for assignment, wizard completion, creation, and post-create editor opens.

-   Fixed chat-map server startup crashes by lazily loading Leaflet inside the client-only GeoJSON map effect, so admin chat-feedback and other chat surfaces no longer evaluate browser-only map code while the Next.js server bundle is being loaded.

-   Fixed Agents Server homepage bootstrap instability by deferring agent-collection scheduling helpers until after the base collection cache is initialized, which breaks the remaining circular startup path that could still throw `Cannot access 'o' before initialization` on `/`.

-   Fixed durable chat testability and request routing by making the service worker skip same-origin API requests, so chat-history/user-chat fetches go straight to the network instead of being pass-through proxied by the worker and becoming invisible to Playwright request interception.

-   Fixed Agents Server durable chat history flows to stay usable on databases that have not yet applied the `UserChatTimeout` migration, by falling back to empty timeout state for chat reads/background polling instead of failing `New chat`, optimistic first-message navigation, or chat-selection refreshes with `relation "UserChatTimeout" does not exist`.

-   Fixed Agents Server mobile chat tray access on the standalone chat page so the `Open chats sidebar` button now sits in a dedicated mobile slot above the transcript instead of floating over messages or the composer, while still respecting lateral device safe-area insets.

-   Added Android share-sheet support for installed Agents Server PWAs, so each installed agent can appear as its own share target and open straight into a fresh 1:1 chat with the shared text or uploaded file attachments auto-sent as the first user message.

-   Added browser push notifications for Agents Server durable chats, including per-user opt-in settings, per-device subscriptions, focused-chat suppression, background service-worker delivery, notification click routing back to the correct chat thread, and automatic invalid-subscription cleanup.

-   Added dedicated writing-style commitments and deprecated the legacy writing-sample aliases without breaking runtime compatibility:

    -   Added new `WRITING SAMPLE` and `WRITING RULES` commitments to the core registry, parser, and model-requirements compiler.
    -   `WRITING SAMPLE` now carries explicit 1:1 voice exemplars, while `WRITING RULES` is limited to writing-only constraints such as tone, formatting, length, and emoji usage.
    -   Legacy `SAMPLE` / `EXAMPLE` commitments still compile with the same writing-sample behavior, but now expose reusable deprecation metadata so the Book editor shows warning markers and documentation pages show deprecated badges/messages without changing generated model requirements.
    -   Updated commitment documentation/catalog output and related examples to steer authors toward `WRITING SAMPLE` / `WRITING RULES`, and added focused unit coverage for writing-commitment compilation, grouped commitment metadata, and editor deprecation diagnostics.

-   Added an alternative ChatGPT-like Agents Server chat page at `/agents/[agentName]/chat/chatgpt-like` that keeps the existing Promptbook header and reuses the same durable chat threads, streaming/API behavior, message rendering pipeline, uploads, tool chips, sources, TTS, feedback, and permissions as the current standalone chat while presenting them in a left-tray + centered-conversation layout.

-   Fixed Agents Server custom-domain proxy builds by replacing broad Promptbook umbrella imports in the middleware resolution path with focused source imports and a lightweight `FROM` resolver, preventing Node/Edge-incompatible runtime helpers from being bundled into the Next.js proxy build while keeping inherited custom-domain metadata resolution working.

-   Fixed the package-generation bundler step to run Rollup through a direct Node subprocess instead of a shell wrapper, and added active-package PID/progress diagnostics plus fail-fast detection when Rollup prints the final `created ...` line but does not exit cleanly.

-   Fixed Agents Server agent inheritance resolution so unresolved book editor source and canonical resolved runtime source are now cleanly separated and reused consistently:

    -   Renamed the book-scoped route context to expose `unresolvedAgentSource`, added a shared resolved-agent context/state utility, and made runtime/profile/model-requirements/system-message/avatar/disclaimer/transpilation flows derive behavior and presentation from the materialized resolved source instead of the editable source.
    -   Hardened `FROM` / `IMPORT` resolution with canonical current-agent URLs, cycle detection, and `/api/book` ETag-based remote revalidation so local, core, and federated inheritance stays fresh when upstream agents change.
    -   Updated local/federated metadata/search/management datasets to derive resolved profiles and resolved searchable source from stored agent books instead of the stale persisted `agentProfile` column, so inherited color/font/title/description/capabilities show up consistently across agent cards, `/api/agents`, search, and management summaries.
    -   Added unit coverage for implicit Adam inheritance, local and federated parent resolution, metadata inheritance, child-over-parent overrides, inherited commitments/rules, and safe cycle failures.

-   Added optimistic first-user-message rendering for new durable Agents Server chats started before entering `/chat`:

    -   Starting a new chat from the agent profile page, textarea page, or any other prefilled `/chat?message=...` flow now renders the first user bubble immediately as `Sending` while the durable `/messages` request is still in flight, instead of leaving a confusing one-message gap after navigation.
    -   Added a small client-side pending outbound-message store scoped by `chatId`, merged it into the canonical chat transcript during rendering, and reconciled optimistic bubbles against canonical server messages primarily by explicit `clientMessageId` (with a bounded content/timestamp fallback).
    -   Failed first-message sends now keep the optimistic bubble visible and marked `Failed`, while successful reconciliation reuses the same client-side render key so the optimistic bubble transitions into the canonical transcript without duplication or visible flicker.
    -   Added focused unit coverage for optimistic merge/reconcile logic and a Playwright regression that delays the first durable send from the agent profile page to verify the `Sending` bubble appears before the server responds.

-   Fixed Agents Server agent-route loading skeleton selection so each major agent page now streams a layout-matching skeleton family instead of falling back to the profile or homepage placeholder:

    -   Added a shared `AgentPageLoadingSkeleton` variant entrypoint plus documented route-family audit for profile, chat, textarea, editor, split editor/chat, integration/docs, code viewer, timeline, and gallery pages.
    -   Added route-level `loading.tsx` selectors for agent `book`, `book+chat`, `integration`, `website-integration`, `system-message`, `export-as-transpiled-code`, `history`, and `images` pages while keeping the existing polished profile/chat/textarea skeletons unchanged.
    -   Replaced remaining blank/text-only initial placeholders on the split book+chat and export code pages with the same new layout-aware skeletons so slow client hydration no longer regresses perceived loading quality.

-   Added running vs scheduled chat-state indicators to the Agents Server `My chats` sidebar:

    -   Extended user-chat summaries with lightweight running activity so the left tray can distinguish live in-progress chats from chats that only have a future wake-up pending, with running taking priority when both states apply.
    -   Added reserved per-chat indicator slots in the sidebar using a subtle animated spinner for currently progressing chats and a subtle clock for scheduled wake-ups, plus richer hover/ARIA labels for the new states.
    -   Fixed sidebar activity queries for admin-visible external chats so API/team-member chats shown through `Show external chats` can surface the same running/scheduled indicators as internal web chats.

-   Fixed book agent-source title parsing so the first non-empty line is always treated as the plain-text agent name, even when it starts with a commitment keyword, and aligned downstream parsing/renaming paths with the same rule.

-   Fixed Agents Server durable chat completion status lag so assistant messages now flip from `RUNNING` to `COMPLETED` as soon as the model output stream actually ends, instead of waiting for slower post-stream provider cleanup.

-   Added absolute `/integration` reference comments to copyable Agents Server integration snippets, including website embed, iframe, Promptbook SDK, OpenAI-compatible API, and MCP examples shown on the integration-related pages.

-   Fixed Agents Server management API smoke paths during E2E runs:

-   There are 4 environments for Agents Server: `PRODUCTION`, `PREVIEW`, `LTS`, and `LIVE`

    -   Registered all server-side configured LLM provider constructors used by bring-your-own-keys execution tools, which stops generated default-avatar requests from crashing when Anthropic Claude, Deepseek, Azure OpenAI, Ollama, or OpenAI-compatible providers are configured.
    -   Hardened the Swagger management API Playwright assertion to target the visible explorer heading instead of a duplicate hidden text node rendered during page hydration.

-   Improved Agents Server chat tool chips so ongoing actions are inspectable before they finish:

    -   Made spinner-state tool chips clickable immediately and kept them wired to the same shared tool-call modal used for completed chips, instead of splitting ongoing vs finished detail UIs.
    -   Refactored shared tool-call detail rendering to accept explicit `PENDING` / `PARTIAL` / `COMPLETE` / `ERROR` states plus partial view-model data, so the simple modal can show meaningful placeholders and human-readable progress while results are still streaming.
    -   Extended advanced tool-call details and streaming tool-call transport to preserve incremental raw logs, request payloads, partial outputs, and mid-flight failures, which keeps advanced mode useful from tool start through completion.
    -   Added progressive browser/search hydration in chat by merging streamed tool-call snapshots instead of replacing them, including incremental `run_browser` action/session logs so the modal can live-update while the tool is still running.

-   Added Agents Server quick action buttons in chat:

    -   Extended chat quick-button parsing to support both `message` buttons (`?message=...`) and browser `action` buttons (`?action=...`) while keeping the existing message-button syntax backward compatible.
    -   Wired Agents Server chat surfaces to execute clicked action-button JavaScript through Promptbook's `JavascriptExecutionTools` in the browser instead of raw `eval`, with execution gated by explicit user clicks.
    -   Styled action buttons with a distinct dark gray treatment, added hover microcopy (`Runs an action in your browser`), and consumed successful action buttons without duplicating the existing quick-button rendering flow.

-   Improved Agents Server attached-file reading so agents can continue past the inline preview crop:

    -   Kept the existing bounded inline attachment preview as a lightweight bootstrap, but added deterministic runtime tools `read_attached_file` and `search_attached_file` so agents can read attached text files in byte-range chunks and regex-search within them when the first preview is truncated.
    -   Wired the current chat attachments into hidden tool runtime context for both live `/api/chat` turns and durable background `UserChatJob` execution, so the same attachment tools are available in normal and long-running Agents Server chats.
    -   Fixed agent-side runtime tool merging so prompt-scoped tools are combined with commitment-provided tools before AgentKit preparation, which makes dynamic attachment tools reach the model reliably instead of being dropped whenever the agent source already declared tools.
    -   Added focused coverage for attachment tool registration, byte-range reads, regex search results, and the new runtime-context transport of current chat attachments.

-   Fixed Agents Server chat action controls to use the same blue accent across `New chat`, `Save`, `Timeouts`, `Cancel`, and the chat sidebar/scroll arrow buttons.

-   Fixed Agents Server timeout wake-up chats resuming under the wrong server origin:

    -   Made the timeout worker hand off resumed durable chat jobs using the current request-scoped server origin when available instead of always falling back to the deployment-level internal origin.
    -   Aligned durable `runUserChatJob` agent-context resolution with the active worker request/server origin, so resumed chats use the same local agent URLs and profile resolution path as normal live chat requests.
    -   Added focused regression coverage for request-scoped vs background origin resolution to prevent `USE TIMEOUT` wake-ups from failing on agent/profile fetch loops after the injected timeout message.

-   Improved Agents Server modal consistency around chat keybindings and related overlays:

    -   Reworked the first-run chat keybindings onboarding from a bottom-attached popup into a true modal dialog centered on desktop with a darkened, blurred backdrop, while making it fullscreen on mobile without borders or border radius.
    -   Extended the shared Agents Server `<Dialog/>` shell with reusable backdrop styling, accessibility wiring, and optional non-dismissible behavior so popup/backdrop logic is no longer duplicated across separate dialog implementations.
    -   Moved the chat keybindings onboarding, chat error dialog, and blocking META DISCLAIMER overlay onto the shared dialog shell to keep popup UI and dismissal behavior aligned.

-   Fixed Agents Server `/agents/[agentName]/textarea` route loading to use a dedicated textarea-first skeleton that matches the centered avatar and composer layout, without changing the existing profile or standalone chat skeletons.

-   Added configurable chat Enter/Ctrl+Enter keybindings across Agents Server chat surfaces:

    -   Extended the shared `<Chat/>` composer with reusable `enterBehavior` / lazy `resolveEnterBehavior` support so plain `Enter` and `Ctrl+Enter` can be inverted without coupling the component to Agents Server persistence.
    -   Added first-run non-blocking keybinding onboarding in Agents Server that appears on the first plain `Enter` when no preference is stored, keeps textarea focus intact for continued typing, and can be dismissed with `Not now` for the rest of the browser session.
    -   Persisted chat keybinding preference in the existing `UserData` mechanism for both signed-in and anonymous browser-tied users, and added a dedicated `/system/settings` page with visual keycap selection cards under the main System menu.
    -   Wired the same behavior into canonical chat, profile chat, and textarea-based chat entry points so Enter handling stays consistent across current and future `<Chat/>` usages in Agents Server.

-   Added frozen external chats to Agents Server `My chats` with admin-only visibility and source labels:

    -   Added durable `UserChat.source` persistence plus migration `2026-03-0240-user-chat-source.sql` so web UI, OpenAI-compatible API, and team-member chats are stored with their origin.
    -   Persisted OpenAI-compatible and internal team-member chats into canonical `UserChat` / `ChatMessage` records instead of leaving them runtime-only, while keeping external chats hidden from regular users by default.
    -   Extended `My chats` with an admin-only `Show external chats` filter, source chips such as `API` / `TEAM`, and access rules that show admins external chats across the server while normal users still see only their own web chats.
    -   Made external chats open as frozen view-only transcripts in the web UI, with a source banner, disabled message sending/cancellation, and existing transcript export/copy flows kept intact.

-   Added safe default-agent cloning from the Core Agents Server into each federated Agents Server:

    -   Added a background sync that discovers Core boilerplate agents from the public `default` folder subtree and clones only missing local agents matched by normalized name.
    -   Made the sync idempotent and cross-node safe with a new per-server `DefaultFederatedAgent` sync table plus transactional locking, while intentionally never overwriting existing local agents or local edits.
    -   Triggered the sync both for newly created managed servers and during normal server operation, and made Core/network failures non-fatal so unreachable federation only logs an error instead of breaking requests.

-   Enhanced the global-admin Agents Server `/admin/servers` dashboard UX and removed session-based server switching:

    -   Reworked the registered servers view into a single-column, table-first layout with aligned columns, inline editing, Moment.js date formatting, and no separate server-details pane.
    -   Removed super-admin session overrides for same-instance server selection so the current server is resolved strictly from the request domain.
    -   Replaced the old `Open`/session-`Switch` split with one `Switch` action that navigates in the same tab to the selected server’s `/dashboard` page on that server’s own domain, and re-enabled the `/dashboard` route for that flow.
    -   Moved server creation into a modal opened by `Create new server`, while keeping the existing multi-step wizard and SQL-dump recovery flow.
    -   Added unsaved-changes protection to `/admin/servers` so dirty table edits or create-server form changes warn before refresh, link navigation, or browser history navigation.

-   Added thread-scoped `USE TIMEOUT` timers to Agents Server durable chats:

    -   Added a new `USE TIMEOUT` commitment with `set_timeout` / `cancel_timeout` tools so agents can schedule future wake-ups in the same chat thread and continue working later with full prior context.
    -   Added durable `UserChatTimeout` persistence, migration `2026-03-0220-user-chat-timeouts.sql`, a background timeout worker with DB claiming/locking, short best-effort in-process wake-ups, restart recovery, timeout lifecycle logging, and warning messages injected into chats when a timer cannot execute.
    -   Fixed timeout wake-up execution in chat by resolving the server’s internal origin correctly in local/dev and deployment environments, and added a dedicated `/api/internal/user-chat-timeouts/run` worker route plus Vercel cron scheduling so due timeouts can be processed reliably outside long-lived in-process timers.
    -   Extended canonical user-chat APIs, transcript streaming, and chat UI to expose active thread timers, show a compact action-bar timeout badge with human-friendly remaining-time countdowns, open a clean per-chat timeout list with cancellation controls, surface “living” timeout indicators in the My chats sidebar, and render timeout wake-up messages directly in the transcript.
    -   Added timeout rate-limit configuration (`TOOL_USAGE_LIMITS`) with a dedicated admin page `/admin/tool-limits`, default caps for active timers and daily firings, and runtime enforcement designed to stay extensible to future tool limits.
    -   Extended `/admin/task-manager` so scheduled timeouts appear alongside durable chat jobs and can be inspected, cancelled, and retried from the existing admin operational workflow.

-   Added a global-admin-only `System > Servers` area to Agents Server for same-instance server management:

    -   Added `/admin/servers` with inline `_Server` registry editing for server name, environment, domain, and table prefix, plus per-row details, open, switch, save, and migrate/update actions.
    -   Restricted the new area to the environment-backed `admin` authenticated via `ADMIN_PASSWORD`, keeping normal `User`-table admins unchanged for all other admin features.
    -   Added session-backed same-instance server switching so the global admin can temporarily work against another registered server prefix from the same deployment.
    -   Added a multi-step create-server wizard that creates a `_Server` row, runs the existing migration pipeline for the new prefix, seeds bootstrap users and metadata, and rolls everything back on failure.
    -   Added SQL-dump download support for failed server bootstrap transactions with recovery guidance pointing administrators to `support@ptbk.io`.
    -   Added current-server-only deletion from `_Server` with explicit confirmation while intentionally leaving prefixed tables untouched.

-   Fixed Agents Server chat viewport height so mobile browser chrome changes no longer leave white space below the composer:

    -   Replaced the standalone chat route's fixed `100dvh` shell with a shared visible-viewport height variable that falls back through `100dvh`, `100svh`, and `100vh`, then is refined from `window.visualViewport.height` (or `window.innerHeight` when needed).
    -   Tightened the Agents Server chat containers and shared chat layout so the transcript remains the only scrolling region, while the composer stays pinned to the bottom and respects `safe-area-inset-bottom`.
    -   Added a small unit check for visible-viewport height resolution and a manual QA checklist in `apps/agents-server/CHAT_VIEWPORT_HEIGHT_QA.md` covering iOS Safari, Android Chrome, and desktop resize behavior.

-   Added an admin task-manager dashboard for durable Agents Server chat jobs:

    -   Added new admin page `/admin/task-manager` and linked it from `System > Monitoring & Usage` so administrators can inspect server-wide queued/running/failed background chat work in one place without exposing chat transcript content.
    -   Added admin API endpoints for paginated task listing plus guarded cancel/retry actions, all protected by server-side admin authorization and requiring a non-empty human reason for destructive operations.
    -   Surfaced per-task operational metadata including task id, kind, status, timestamps, queue/runtime timing, attempt and retry counts, last failure summary, owning user, agent, chat reference, and queue identity.
    -   Added top-level operational counters (running, queued, failed last 24h, oldest queued age), active/running/queued/failed/all filters, fast identifier search, configurable polling, manual refresh, and stuck-task highlighting for long-running work.
    -   Added dedicated database indexes to keep the new running/failed/all-task admin queries performant against the durable `UserChatJob` table.

-   Fixed Agents Server chat history selection races so explicit user actions now win over stale background updates:

    -   Reworked `/agents/[agentName]/chat` history navigation to treat `New chat` and history clicks as last-write-wins explicit intents, rejecting stale refetch/stream completions instead of letting them re-open an older chat.
    -   Synchronized selected-chat refs before async completions apply, which removes the “stuck new chat” / blink-back state caused by delayed refreshes or older chat streams finishing after the user switched chats.
    -   Removed the native browser `confirm(...)` from Agents Server `New chat` actions by letting delegated resets bypass the shared chat toolbar confirmation.
    -   Added Playwright regression coverage for delayed stale refresh vs `New chat` and delayed earlier selection vs later selection.

-   Hardened Agents Server file reading for attached text files with unknown extensions or encodings:

    -   Added a shared byte-to-text decoding pipeline used by attachment inlining and `project_read_file`, with BOM detection, simple binary-vs-text heuristics, fallback single-byte encodings (`windows-1250`, `windows-1252`, `iso-8859-1`), bounded prefix decoding for oversized files, and explicit decode metadata (`encodingUsed`, confidence, warnings, `wasBinary`).
    -   Updated chat attachment content extraction so text-like uploads are decoded by bytes instead of brittle extension allowlists, which now lets agents read raw text from files like `.srt`, `.vtt`, `.ass`, or unknown extensions even when storage reports a generic MIME type.
    -   Binary attachments now stay blocked from inline prompt injection with clear warnings instead of garbage text, while subtitle/text attachments encoded as UTF-16 BOM or guessed legacy encodings are surfaced to the model together with decoding warnings.
    -   Extended `project_read_file` with shared decoding metadata and a `forceText` option so agent tool calls can explicitly inspect binary-looking files as best-effort text when needed.

-   Fixed Agents Server chat breadcrumb separators in the header to use the same icon color as the surrounding navigation icons, so the arrows no longer appear faded compared with the agent/view icons.

-   Improved Agents Server page-load performance and perceived responsiveness without changing behavior:

    -   Added request-scoped caching for repeated server reads used by the app shell and agent routes (`$provideServer`, metadata, session/current-user/admin checks, agent route/profile helpers), reducing duplicate database and server-registry work within one request.
    -   Parallelized home/profile/chat/root-layout data loading so independent awaits no longer serialize the initial server render.
    -   Time-boxed and revalidated federated-server logo lookups so slow remote metadata endpoints no longer hold back the page shell on every request.
    -   Deferred the homepage graph and interaction-only homepage overlays into separate client chunks, and lazy-loaded the profile-page chat preview behind a visual fallback to improve both actual and perceived loading.
    -   Measured production-build bundle impact:
        -   `/agents/[agentName]` first-load JS reduced from about `1.0 MB` to about `142 kB`
        -   `/` first-load JS reduced from about `1.13 MB` to about `1.07 MB`

-   Added OpenAPI-backed management endpoints to Agents Server for owner-scoped agent administration:

    -   Added a generated OpenAPI 3 management spec at `/openapi.json` and interactive Swagger UI at `/swagger`, both available on every Agents Server instance and secured with the existing API-key bearer auth.
    -   Added versioned management routes under `/api/v1` for agents (`GET/POST/PATCH/DELETE`), folders (`GET/POST/PATCH/DELETE` + move agent), authenticated user metadata (`/api/v1/me`), and instance metadata (`/api/v1/instance`).
    -   Reused the existing OpenAI-compatible API token mechanism for management authentication and exposed the active user API keys inside Swagger similarly to the integration page.
    -   Added owner/tenant scoping for `Agent`, `AgentFolder`, and `ApiTokens`, including migration `2026-03-0200-management-api-ownership.sql`, so API keys can manage only resources owned by their resolved user.
    -   Reused the existing Agents Server search matcher for `GET /api/v1/agents` list/search/sort behavior and returned stable profile/chat/integration links in management responses.
    -   Added configurable management API CORS origins metadata and kept the OpenAI-compatible chat/completions routes unchanged.
    -   Added Agents Server E2E coverage for OpenAPI docs, Swagger auth, and the first-release owner-scoped CRUD management flow.

-   Replaced Agents Server `SERVERS` environment-based server registry with a global `_Server` database table:

    -   Added migration `2026-03-0190-server-registry.sql` creating `_Server` with server name, environment group (`PRODUCTION` / `PREVIEW`), Vercel domain, table prefix, and timestamps.
    -   Refactored Agents Server request routing, custom-domain resolution, and admin diagnostics to resolve active servers from `_Server` instead of the removed `SERVERS` env variable.
    -   Reworked database migration selection so `--only` now supports `_Server` environment groups (`production`, `preview`), registered server names, and raw table prefixes while loading available prefixes from `_Server`.
    -   Updated the coding-script testing-server auto-migrator to select preview servers from `_Server` instead of a hard-coded prefix list.
    -   Added `apps/agents-server/scripts/sync-vercel-domains.ts`, a dry-run-capable Vercel domain sync script with structured JSON logs for CI, and registered it in `.vscode/terminals.json`.
    -   Reworked `apps/agents-server/scripts/sync-vercel-domains.ts` so `_Server` is the primary source of truth for Vercel domain routing across all four server environments, including branch/custom-environment mapping (`LIVE -> main / Development`, `PREVIEW -> preview / Preview`, `PRODUCTION -> production / Production`, `LTS -> lts / lts`) plus drift detection that removes and recreates domains when an existing Vercel binding points to the wrong branch or environment.
    -   Added a colorized human-readable summary to `apps/agents-server/scripts/sync-vercel-domains.ts` so interactive runs now show itemized added, reconfigured, verified, deleted/flagged, and ignored domains in addition to the existing structured JSON logs, including an explicit explanation that `Domains flagged for removal` means the domain still exists on Vercel but is no longer present in `_Server` and can be removed with `--delete-removed`.
    -   Extended `apps/agents-server/scripts/sync-vercel-domains.ts` to also sync managed Cloudflare DNS records from Vercel’s recommended DNS targets using `CLOUDFLARE_API_TOKEN`, while intentionally never deleting unrelated zone records, updating only managed hostnames from `_Server`, and marking created/updated records with a visible Cloudflare comment (and optional tag when explicitly enabled) so auto-managed records are identifiable later.

-   Added a branded Agents Server `500 / Internal Server Error` experience for App Router failures:

    -   Extracted the existing application-error boundary UI into a shared component so unexpected render failures reuse one consistent branded page.
    -   Updated the visible error-state copy to clearly present `500 / Internal Server Error` instead of a generic application-error label.
    -   Added `apps/agents-server/src/app/global-error.tsx` so root-layout and top-level render failures on Vercel no longer fall back to the default plain Next.js/Vercel error page.

-   Reworked Agents Server standalone chat into a server-owned durable conversation model:

    -   Added durable `UserChatJob` persistence with linked `chatId`, `messageId`, `assistantMessageId`, `clientMessageId`, job lease/heartbeat fields, cancellation timestamps, provider/failure metadata, and migration `2026-03-0180-user-chat-jobs.sql`.
    -   Added canonical chat-turn enqueueing API (`/agents/[agentName]/api/user-chats/[chatId]/messages`) with server-side idempotency via `clientMessageId`, immediate user-message + assistant-placeholder persistence, and background worker triggering detached from the browser request lifecycle.
    -   Added internal durable worker route (`/api/internal/user-chat-jobs/run`) that claims queued jobs, recovers expired leases, executes chat turns server-side, heartbeats running work, progressively persists assistant output into `UserChat.messages`, and records final `completed` / `failed` / `cancelled` states.
    -   Added active-job reporting and cancellation support to user-chat APIs so reconnecting devices can load canonical history plus queued/running jobs and request cancellation of in-flight turns.
    -   Rewrote `/agents/[agentName]/chat` history mode to poll canonical server state instead of browser-owned local chat snapshots, keeping the same `chatId` synchronized across devices and after refresh/reconnect.
    -   Extended shared chat messages with durable lifecycle metadata (`queued`, `running`, `completed`, `failed`, `cancelled`) and updated chat UI to render lifecycle badges/errors consistently.
    -   Updated shared chat input sending so async send handlers clear the composer only after a successful server acknowledgement, preserving input for retries when durable message submission fails.
    -   Restored live canonical streaming for durable chats by adding `/agents/[agentName]/api/user-chats/[chatId]/stream` and reconnecting the chat page to that stream, so all open viewers of the same `chatId` now receive progressive assistant updates while the background worker keeps running independently.
    -   Restored loading-state copy from `THINKING_MESSAGES` for empty queued/running assistant placeholders, so background turns no longer render as blank bubbles before the first persisted token arrives.
    -   Added server-side active-job reconciliation when reading canonical chat detail, so jobs whose assistant message is already terminal or whose worker lease expired no longer stay stuck in `RUNNING`/pending forever.
    -   Tightened canonical chat streaming for durable chats by polling only in visible focused chat tabs, lowering the active refresh cadence, and diffing snapshot signatures against message content/tool-call changes in addition to chat/job metadata.
    -   Restored browser-side canonical chat UX for focused viewers by reusing the old random `THINKING_MESSAGES` rotation and progressively revealing persisted assistant deltas, which brings back smoother token-like updates and chunk vibration without tying execution back to the browser.

-   Fixed Agents Server duplicated `INITIAL MESSAGE` entries in chat history when switching chats or refreshing:

    -   Added a stable seeded initial-message ID in `AgentChat` so user-chat append-only merge treats rehydrated initial messages as one logical message.
    -   Updated `/agents/[agentName]/chat` debounced message persistence to cancel stale pending saves once hydrated content matches the latest saved snapshot, preventing transient pre-hydration initial-message writes.

-   Added a new Supabase PostgreSQL backup CLI script at `scripts/backup-supabase/backup-supabase.ts`:

    -   Uses `commander` and existing project-style Postgres connection handling (`POSTGRES_URL` / `DATABASE_URL`) without using `pg_dump`.
    -   Exports selected schemas (default `public`, configurable via `--schemas`) and includes both schema + data for all discovered tables.
    -   Produces one compressed ZIP backup file with one SQL file per table (for example `public/Agent.sql`), including table DDL, COPY data, indexes, triggers, and serial-sequence state.
    -   Supports configurable output location and filename pattern via `--output-dir` and `--filename-pattern` with `%timestamp%`, `%date%`, `%time%`, and `%database%` tokens.
    -   Adds safe backup logs with masked server description (no password logging), target output path, table progress, and final file size.
    -   Registered a terminal-runner command in `.vscode/terminals.json` to run backups instantly with default output path `other/backup`.

-   Fixed noisy Agents Server chat-history save failures and improved missing-chat diagnostics:

    -   Added scoped user-chat diagnostics (`USER_CHAT_NOT_FOUND`, `USER_CHAT_SCOPE_USER_MISMATCH`, `USER_CHAT_SCOPE_AGENT_MISMATCH`, etc.) for `/agents/[agentName]/api/user-chats/[chatId]` message/draft updates.
    -   API PATCH endpoints now return structured error payloads (`error`, `code`, `details`) and use `404` for missing/scope-mismatch chats vs `500` for diagnostic/database failures.
    -   Improved client-side user-chat API error handling with rich metadata (`status`, `code`, `details`, `url`) to make notification debugging actionable.
    -   Stopped repeated failing save loops by remembering last failed message hash/draft value and skipping identical auto-retries until content changes or user presses retry.
    -   Added automatic chat-state resync when save fails due to missing scoped chat, so transient/stale scoped-chat errors no longer spam user-facing notifications.

-   Added shared floating notification system in Agents Server and migrated chat save failures to it:

    -   Added a global portal-based notification stack (`top-right`, newest first) with shared API helpers:
        -   `notifyError(message, { details, actionLabel, onAction })`
        -   `notifyWarning(message, { details, actionLabel, onAction })`
        -   `notifyInfo(message, { details, actionLabel, onAction })`
        -   `notifySuccess(message, { details, actionLabel, onAction })`
    -   Reused and extended the existing `SaveFailureNotice` UI (Book editor save-failure design) for all notification variants (`error`, `warning`, `info`, `success`) with:
        -   manual dismiss (`X`) and no auto-dismiss,
        -   optional action button,
        -   optional details preview.
    -   Added click-to-report debug behavior for notifications (verbose grouped console report with type/message/details/action metadata), while keeping dismiss button clicks separate from report logging.
    -   Mounted the notification provider once in `LayoutWrapper` so notifications can be triggered from anywhere in Agents Server UI without layout shift.
    -   Removed in-layout chat error/save-failure banners from `/agents/[agentName]/chat` and replaced them with floating notifications to avoid chat layout reflow/resizing.

-   Fixed Agents Server user-chat loading/saving scope drift for anonymous users:

    -   Updated anonymous identity cookie resolution to treat a valid `x-anonymous-username` header as authoritative for the current request and synchronize the cookie to the same value.
    -   This keeps `/agents/[agentName]/api/user-chats` read/write operations on the same `userId`, so existing chats load correctly by ID, `User chat "... was not found."` no longer blinks during normal usage, and repeated failed save retries are avoided.

-   Fixed Agents Server loading of existing chats when browser storage is unavailable or full:

    -   Hardened shared `ChatPersistence` with an in-memory fallback that mirrors serialized chat payloads whenever `localStorage` is blocked, unavailable, or over quota.
    -   Updated chat persistence availability semantics so chat hydration still works in browser sessions even when durable storage writes fail.
    -   Added unit coverage for fallback behavior to ensure previously saved server chats can still hydrate into `/agents/[agentName]/chat` instead of opening as an empty fresh chat.

-   Improved Agents Server profile-page `My chats` panel to show full chat history with scrolling:

    -   Updated `/agents/[agentName]` profile chat preview to render all available chats instead of truncating to three.
    -   Kept the panel height constrained to approximately three visible chat rows and enabled vertical scrolling to access older chats.

-   Hardened Agents Server E2E `System` submenu navigation against desktop floating-menu timing:

    -   Updated `authentication-and-navigation` helpers to open `My Account` via hover (desktop behavior) and click nested links from the `[data-header-dropdown-portal]` container.
    -   This removes flaky direct link lookups for `Profile` and `User Memory` when those links are rendered in the floating third-level panel.

-   Switched Agents Server generated agent default avatars to OpenAI DALL·E 3:

    -   Updated `/agents/[agentName]/images/default-avatar.png` generation route to request `modelName: 'dall-e-3'` instead of Gemini for agent avatar image creation.

-   Stabilized Agents Server E2E navigation through `System > My Account` nested submenu:

    -   Updated `authentication-and-navigation` Playwright test to open nested account links from the header dropdown portal container.
    -   Replaced brittle page-wide `Profile`/`User Memory` link lookups with deterministic scoped lookups to match the current floating submenu behavior.

-   Fixed Agents Server chat history durability when switching chats or refreshing:

    -   Hardened `UserChat` message saves with optimistic retry + append-only merge semantics in `updateUserChatMessages`, preventing late/stale saves from overwriting newer chat history.
    -   Updated chat persistence on `/agents/[agentName]/chat` to save only stable complete messages, reducing race conditions from in-progress streaming snapshots.
    -   Kept chat save-failure warning UX shared with Book editor via the existing reusable `SaveFailureNotice` component (DRY).
    -   Adjusted chat sidebar filtering so active/empty chats do not disappear from the list by default.

-   Fixed Agents Server skeleton loading visuals to always render in light mode:

    -   Removed dark-scheme overrides from the shared `.skeleton-block` shimmer styles in `apps/agents-server/src/app/globals.css`.
    -   Updated all reusable skeleton layout components under `apps/agents-server/src/components/Skeleton` to use light-only surfaces.
    -   Updated chat loading overlays/wrappers that host `ChatThreadLoadingSkeleton` so transitional loading states also remain light.

-   Enhanced Agents Server chat dictation UX with failover speech-to-text providers (Wispr Flow-inspired):

    -   Added a new speech-to-text provider abstraction in Agents Server with shared interface (`isSupported`, `start`, `stop`, `abort`, optional diagnostics) and provider-priority failover orchestration.
    -   Added OpenAI Whisper proxy provider + browser Web Speech provider fallback under the shared abstraction, and wired both through one DRY factory used by profile chat and full chat surfaces.
    -   Added automatic failover behaviors: init-error fallback to next provider, stall watchdog (no partials while audio is non-silent) with one restart attempt, then provider failover.
    -   Added dictation telemetry hooks (console + optional endpoint forwarding) capturing provider selection, init timing, first partial timing, final timing, and error codes (no audio payload stored).
    -   Upgraded chat input dictation UX:
        -   single mic control with clear states (`idle`, `listening`, `processing`, `error`, `disabled` permission),
        -   live interim transcript panel while listening,
        -   quick backtrack (undo last dictated chunk),
        -   replace-selection dictation behavior,
        -   editable transcript correction loop that learns local custom-word replacements in localStorage,
        -   configurable lightweight refinements (auto punctuation/capitalization, filler-word removal, list command formatting),
        -   whisper mode toggle.
    -   Improved permission-denied handling with actionable recovery UI (`Retry microphone`, browser settings deep-link when available) and stop-fallback safeguards against stuck listening state.

-   Deduplicated Agents Server credential chips per assistant message:

    -   Chat now shows at most one credential chip per credential type/scope within one assistant message instead of repeating one chip per tool call.
    -   Added stable credential-chip deduplication by credential identity (`service` + credential key), so repeated USE PROJECT calls in one message collapse into one GitHub credential chip.
    -   Updated credential chip copy to short, consistent labels (`GitHub credentials used`, `SMTP credentials used`).
    -   Extended credential-chip modal details to show one or multiple source actions (`Used by action` / `Used by actions`) without exposing secrets.

-   Added canonical standalone Book language documentation route in Agents Server:

    -   Added new canonical route `/api/docs/book-language.md` that returns one generated markdown document for Book 2.0 agent language.
    -   Refactored `/api/docs/book.md` to reuse the same shared markdown generator output (backward-compatible alias, no duplicated docs logic).
    -   Added shared source-of-truth Book language documentation generator under `apps/agents-server/src/utils/bookLanguageDocumentation`, combining:
        -   conceptual Book 2.0 guide sections,
        -   structured end-to-end examples (goal + full source + walkthrough),
        -   dynamically generated full commitment catalog from live commitment definitions (including parser regex schemas and commitment docs).
    -   Added explicit response headers for standalone markdown docs:
        -   `Content-Type: text/markdown; charset=utf-8`
        -   `Cache-Control: no-store, max-age=0` (always freshest)
    -   Updated Documentation toolbar download button to canonical `/api/docs/book-language.md`.

-   Improved Agents Server `System` dropdown submenu organization and scanability:

    -   Changed floating 3rd-level submenu panels to a single vertical stack (removed two-column child layout) to improve readability.
    -   Added category icons to both 2nd-level category entries and 3rd-level items under `System`.
    -   Refactored System-category construction to one shared icon-propagation path so all submenu branches reuse the same DRY logic.

-   Simplified Agents Server `System > Administration` user navigation:

    -   Removed per-user entries from the Administration menu to prevent unusable long dropdowns on larger user bases.
    -   Kept a single `Users` menu item that links to `/admin/users`, where the full user list and user management actions are handled.
    -   Removed duplicated user-management shortcuts from the header dropdown so user administration remains centralized in one place (DRY).

-   Added new `META INPUT PLACEHOLDER` commitment and wired it into Agents Server chat inputs:

    -   Added core commitment definition `META INPUT PLACEHOLDER` and parser support so agent metadata now resolves `meta.inputPlaceholder` from book source.
    -   Added shared Agents Server placeholder resolver utility with default fallback `Write a message...` to keep placeholder behavior DRY.
    -   Applied the same resolved placeholder to all required agent chat entry points:
        -   `/agents/[agentName]/` profile chat preview
        -   `/agents/[agentName]/chat` standalone chat
        -   `/agents/[agentName]/textarea` textarea-first chat page

-   Enhanced Agents Server `/agents/[agentName]/textarea` page design:

    -   Hid the global header for the textarea route to provide a focused writing surface.
    -   Added a centered agent identity block above the textarea with circular profile image and agent name.
    -   Reused the same agent background generator as the profile page (`/agents/[agentName]`) so textarea and profile share identical branded background styling.

-   Added named Book history milestones in Agents Server editor:

    -   Added optional `versionName` persistence for `AgentHistory` snapshots with migration `2026-03-0170-agent-history-version-name.sql`.
    -   Extended Book save API and collection history snapshots so saving can include a human-readable version name while preserving existing autosave behavior.
    -   Added `Save named version` action in `/agents/[agentName]/book` history panel (Google Docs-style milestone naming during save).
    -   Updated history list/detail UI to display custom version names (fallback to numeric `Version N` for unnamed snapshots).
    -   Added history-panel filters for `Named only` and case-insensitive search by version name.

-   Improved Agents Server Book history/save controls in the Book editor header menu:

    -   Removed the extra in-page secondary status/history bar from `/agents/[agentName]/book` and moved these controls into the normal top menu via existing menu-hoisting.
    -   Extended shared `BookEditor` actionbar hoisting with integration-provided extra menu items, so page-specific controls (save state + history toggle) compose with existing editor actions without duplicating hoisting logic.
    -   Updated Book history detail view to render selected snapshots using `<BookEditor isReadonly />` instead of raw `<pre>` source, reusing editor rendering/highlighting while disabling actionbar buttons for the read-only preview instance.

-   Improved Agents Server loading UX by replacing large text/spinner placeholders with shared skeleton layouts:

    -   Added reusable skeleton system under `apps/agents-server/src/components/Skeleton` (base shimmer block + chat thread/sidebar, profile, homepage card grid, and graph placeholders) to keep loading states DRY.
    -   Replaced root route loading (`apps/agents-server/src/app/loading.tsx`) with a full homepage/list-style skeleton.
    -   Added route-segment skeletons for agent profile and standalone chat (`/agents/[agentName]` and `/agents/[agentName]/chat`) via dedicated `loading.tsx` files.
    -   Updated chat history page loading:
        -   Initial bootstrap now shows a full chat layout skeleton instead of centered `Loading chats...` text.
        -   Chat switching now overlays thread bubble skeletons instead of `Loading chat...` text.
        -   Sidebar now shows row skeletons while chat list snapshots are loading/refetching.
    -   Updated chat wrapper to render a thread skeleton while remote agent connection is still resolving, removing blank/unstyled waiting states during chat transitions.
    -   Updated federated-agent sections on homepage to use card skeletons instead of spinner/text placeholders during initial and per-server loading.
    -   Added graph canvas placeholder overlay in `AgentsGraph` so graph view keeps a stable container while React Flow initializes.
    -   Added internal loading consistency guideline at `apps/agents-server/src/components/Skeleton/LOADING_GUIDELINE.md` (when to use skeleton vs spinner vs optimistic UI).

-   Fixed Agents Server E2E navigation flow for nested `System` menu:

    -   Updated `authentication-and-navigation` Playwright test to expand the `My Account` submenu before clicking `Profile` and `User Memory`.
    -   This aligns the test with the current categorized System dropdown structure and removes the timeout on the missing direct `Profile` link.

-   Fixed Agents Server chat history persistence reliability and save-failure visibility:

    -   Stabilized anonymous chat identity for all `/agents/[agentName]/api/user-chats` client calls by attaching a persistent `x-anonymous-username` header, preventing cross-request identity drift that could cause chats to appear unsaved after refresh.
    -   Added keepalive-enabled flush of pending debounced chat saves/draft saves on page unload (`pagehide` / `beforeunload`) to reduce refresh-time data loss.
    -   Added explicit in-chat save-failure warning with retry action when chat message or draft persistence fails.
    -   Added shared reusable `SaveFailureNotice` component and reused it in both chat save-failure and Book editor save-failure UI to keep warning style/behavior DRY and consistent.

-   Improved Agents Server Book editor save/history UX so history feels native and navigable:

    -   Replaced the floating fixed save chip with an in-layout save status bar, preventing overlap with page/header controls while keeping save state continuously visible.
    -   Reworked Book history into a dedicated responsive panel component (`BookEditorHistoryPanel`) that behaves like the existing chat sidebar pattern: docked panel on desktop and slide-over panel with backdrop on mobile.
    -   Split history UI into two clearly separated areas, `Versions` list and `Selected version` detail/preview, so version navigation and source inspection are no longer mixed.
    -   Kept restore/version-loading behavior connected to existing Book history APIs while reducing UI duplication by moving history rendering into one reusable panel component.

-   Prevented accidental data loss when dismissing text-input modals in Agents Server:

    -   Added a reusable `useDirtyModalGuard` hook that blocks modal close attempts when unsaved edits exist and asks for explicit discard confirmation.
    -   Applied the guard to clone-agent prompt (`showPrompt`) so typed clone names are protected against overlay-click and `Escape` dismissal.
    -   Audited and applied the same guard to other dialog-based text editors/inputs (`NewAgentDialog`, `FolderEditDialog`, `WalletRecordDialog`, `PseudoUserChatDialog`, `LoginDialog`, and `ChangePasswordDialog`).
    -   Added Playwright coverage for clone prompt flow: type draft name, attempt overlay dismiss and cancel discard (modal stays), then press `Escape` and confirm discard (modal closes).

-   Fixed Agents Server header search alignment in desktop top menu:

    -   Switched the desktop header shell to a dedicated three-slot layout (`left | centered search | right`) so the global search box is visually centered in the header.
    -   Moved desktop Documentation/System menu rendering into the right-side slot with control/user actions, preventing search-position shifts when right-side items (login/profile/control-panel actions) change.
    -   Kept existing search input sizing and mobile menu search behavior unchanged.

-   Improved Agents Server global application-error boundary report export:

    -   Added one-click `Copy` action that copies the full application error report as Markdown from the error screen.
    -   Added one-click `Save` action that downloads the same Markdown report as a `.md` file.
    -   Added shared report-generation utilities in `applicationErrorHandling` so Sentry forwarding and UI export use one canonical payload shape (DRY).

-   Fixed Agents Server `run_browser` visual replay artifact capture reliability:

    -   Switched browser artifact filesystem storage to a writable runtime directory (`RUN_BROWSER_ARTIFACT_STORAGE_DIRECTORY` or OS temp fallback) instead of relying on `process.cwd()`, which can be read-only in some deployments.
    -   Kept replay payload paths stable (`.playwright-cli/...`) so existing chat parsing and replay rendering continue to work without UI contract changes.
    -   Added screenshot capture fallback from `fullPage: true` to viewport capture (`fullPage: false`) when large pages cannot be captured as full-page screenshots.
    -   Updated `/api/browser-artifacts/[artifactName]` to resolve files via the shared artifact-storage utility used by `run_browser`.

-   Refactored chat attachment utilities for maintainability/readability without behavior changes:

    -   Split `src/utils/chat/chatAttachments.ts` into focused SRP modules under `src/utils/chat/chatAttachments/` (attachment normalization, metadata/context formatting, content resolving, and message-context appending).
    -   Kept `src/utils/chat/chatAttachments.ts` as a thin facade preserving the same external API (types and helper exports used by `@promptbook/core`).
    -   Added explicit private/public JSDoc annotations on extracted exported entities to align with package-generation checks and naming-discrepancy constraints.

-   Refactored `src/types/typeAliases.ts` into focused alias modules while preserving external behavior:

    -   Extracted semantic type aliases into SRP-oriented files (`string_parameter_name.ts`, `string_sha256.ts`, `string_markdown.ts`, `string_filename.ts`, `string_url.ts`, `string_knowledge_source_content.ts`, `string_person_fullname.ts`, `string_token.ts`, `number_usd.ts`).
    -   Kept `src/types/typeAliases.ts` as a thin re-export facade to preserve existing import paths and public type names.

-   Refactored `WALLET` commitment internals for maintainability/readability without behavior changes:

    -   Split `src/commitments/WALLET/WALLET.ts` into focused private modules for runtime adapter contracts/state, tool names, tool schemas, tool-title mapping, runtime-context resolution, argument parsing, disabled-runtime handling, tool-function implementations, system-message composition, and commitment documentation.
    -   Kept `src/commitments/WALLET/WALLET.ts` as a thin orchestration facade preserving the same external API (`WalletCommitmentDefinition`, `setWalletToolRuntimeAdapter`, and existing exported WALLET types).
    -   Added explicit private JSDoc annotations on extracted exported internals to align with package-generation checks.

-   Refactored `USE PROJECT` commitment internals for maintainability/readability without behavior changes:

    -   Split `src/commitments/USE_PROJECT/USE_PROJECT.ts` into focused private modules for tool names, tool schemas, tool-title mapping, configured-project normalization, runtime/wallet resolution, GitHub API transport, and tool-function implementations.
    -   Kept `src/commitments/USE_PROJECT/USE_PROJECT.ts` as a thin orchestration facade preserving the same external API (`UseProjectCommitmentDefinition`) and existing tool behavior.
    -   Added explicit private JSDoc annotations on extracted exported internals to align with package-generation checks.

-   Refactored `MEMORY` commitment internals for maintainability/readability without behavior changes:

    -   Split `src/commitments/MEMORY/MEMORY.ts` into focused private modules for runtime adapter wiring, runtime context resolution, disabled-result handling, tool-argument parsing, tool schema construction, system-message block creation, tool-title mapping, tool-function creation, and documentation text.
    -   Kept `src/commitments/MEMORY/MEMORY.ts` as a thin orchestration facade preserving the same external API (`MemoryCommitmentDefinition`, `setMemoryToolRuntimeAdapter`, and existing exported MEMORY types).
    -   Added explicit private JSDoc annotations on extracted exported internals to align with project conventions and package-generation checks.

-   Refactored Chat tool-call parsing utilities for maintainability/readability without behavior changes:

    -   Split `src/book-components/Chat/utils/toolCallParsing.ts` into focused SRP modules under `src/book-components/Chat/utils/toolCallParsing/` (generic tool arg/result parsing, TEAM payload parsing, date extraction, search result extraction, and `run_browser` payload parsing/URL resolution).
    -   Kept `src/book-components/Chat/utils/toolCallParsing.ts` as a thin facade that re-exports the same API to preserve existing imports and behavior.
    -   Added explicit private JSDoc annotations on extracted exported entities to align with package-generation checks.

-   Refactored `ChatToolCallModal` internals for maintainability/readability without behavior changes:

    -   Split `src/book-components/Chat/Chat/ChatToolCallModal.tsx` into focused private modules:
        -   `src/book-components/Chat/Chat/renderToolCallDetails.tsx` for simple-mode tool detail rendering and related helpers.
        -   `src/book-components/Chat/Chat/renderAdvancedToolCallDetails.tsx` for advanced payload rendering and markdown report export helpers.
        -   `src/book-components/Chat/Chat/TeamToolCallModalContent.tsx` for TEAM conversation/action/source rendering.
    -   Kept `ChatToolCallModal.tsx` as a thin orchestration layer for modal state, team-profile hydration, mode switching, and export action wiring.
    -   Added private JSDoc annotations on newly extracted exported entities to align with internal conventions.

-   Refactored OpenAI cleanup script for maintainability/readability without behavior changes:

    -   Split `scripts/delete-openai-resources/delete-openai-resources.ts` into focused private modules for orchestration, OpenAI client/bootstrap, resource listing/mapping, summary printing, confirmation prompting, sequential deletion, and deletion summary/error formatting.
    -   Kept `scripts/delete-openai-resources/delete-openai-resources.ts` as a thin entrypoint to preserve script behavior and CLI output.
    -   Added explicit private JSDoc annotations on extracted entities to match project conventions.

-   Refactored Agents Server wallet utility for maintainability/readability without behavior changes:

    -   Split `apps/agents-server/src/utils/userWallet.ts` into focused SRP modules under `apps/agents-server/src/utils/userWallet` (record types, payload normalization, table access, CRUD/listing operations, row mapping, and token-resolution helpers).
    -   Kept `apps/agents-server/src/utils/userWallet.ts` as a thin facade re-exporting the same public API used by routes/tools/components.
    -   Added explicit private JSDoc annotations on extracted internal entities to match project conventions.

-   Refactored Agents Server header component for maintainability/readability without behavior changes:

    -   Split `apps/agents-server/src/components/Header/Header.tsx` into focused private modules:
        -   `buildAgentMenuStructure.tsx` (agent hierarchy data builders + related header menu components/helpers)
        -   `buildDocumentationDropdownItems.tsx` (documentation dropdown item composition)
        -   `DropdownSubMenuPortal.tsx` (floating submenu portal rendering)
        -   `useHeaderTouchInput.ts` and `useHeaderDropdownPortalContainer.ts` (touch detection and portal container hooks)
        -   `SubMenuItem.ts` (shared submenu item type)
    -   Kept external header behavior unchanged while reducing `Header.tsx` responsibilities and line count.
    -   Added private JSDoc annotations on extracted entities to align with internal conventions.

-   Fixed intermittent Monaco syntax highlighting loss in Agents Server Book editor after client-side back/forward navigation:

    -   Book Monaco lifecycle now re-applies Book language + theme to the mounted editor model on mount/focus/navigation visibility events, while keeping language/token providers registered idempotently per Monaco runtime.
    -   `/agents/[agentName]/book` now uses a stable Monaco model path so cursor/scroll view state is restored after remounts (`saveViewState`) without keeping stale models alive.
    -   Added an opt-in development debug flag for Monaco lifecycle tracing (`localStorage['promptbook-debug-book-editor-monaco']='1'`).
    -   Added unit coverage for mounted-editor language re-application in `useBookEditorMonacoLanguage.test.ts`.
    -   Manual QA checklist:
        -   Open `/agents/<agentName>/book`, confirm Book commitments are syntax-highlighted.
        -   Navigate to another route and use browser Back/Forward repeatedly (for example 10x).
        -   Confirm syntax highlighting remains present, and cursor/scroll position is restored when returning to the editor.

-   Added an admin-only Agents Server backups page at `/admin/backup` with a new System-menu entry (`Backups`) for administrators:

    -   Added one backup action, **Download all books**, which exports a single `.zip` archive.
    -   Added streaming export endpoint `GET /api/admin/backups/books` that returns ZIP bytes as a stream (without buffering the full archive in server memory).
    -   The ZIP now includes all books from the Agents Server using canonical persisted book source (`Agent.agentSource`) and mirrors the folder hierarchy from `AgentFolder`.
    -   Added deterministic filesystem-safe folder/file path sanitization for ZIP entries, plus deterministic filename collision handling using `--book-{id}` suffixes when needed.
    -   Added a top-level archive directory (`promptbook-backup-YYYY-MM-DD/`) so extraction does not spill files into the current directory.

-   Added debounced background agent pre-indexing/preparation in Agents Server to reduce first-chat latency after edits:

    -   Added DB-backed preparation queue/state table (`2026-03-0160-agent-preparation.sql`) with per-agent fingerprint tracking, status lifecycle (`SCHEDULED`/`RUNNING`/`PREPARED`/`FAILED`), retry metadata, and timestamps.
    -   Added a background worker loop (`apps/agents-server/src/utils/agentPreparation.ts`) that coalesces rapid updates with a 30s debounce window, enforces single in-flight preparation per agent row, runs AgentKit pre-indexing, retries with backoff on transient failures, and logs scheduled/started/skipped/completed/failed events with counters.
    -   Wired scheduling centrally by decorating `AgentCollection` writes in `$provideAgentCollectionForServer`, so agent create/update/book-source writes automatically enqueue pre-indexing without blocking save requests.
    -   Updated chat handlers to briefly wait for matching running pre-index jobs before falling back to existing on-demand behavior, minimizing perceived delay when preparation is nearly complete.
    -   Fixed worker triggering reliability by adding immediate tick kicks, per-prefix wake-up timers at scheduled due times, and due-`SCHEDULED` polling in chat wait so queued pre-index jobs start consistently and produce observable run logs/counters.

-   Improved Agents Server profile-chat initial message handoff to avoid URL length limits while preserving deep links:

    -   Profile chat now stores pending initial message payload (message + attachments) in session storage and navigates to `/chat` without serializing the message into URL query params.
    -   Standalone chat now consumes this pending profile payload for one-time auto-execution, while existing shareable `?message=...` deep-link behavior remains supported.
    -   Added shared chat-message validation utility with a server-enforced max length (`20,000` characters) in `/agents/[agentName]/api/chat`, returning clear validation errors (including `413` for oversized messages).
    -   Updated remote chat error propagation so non-OK `/api/chat` responses are surfaced as explicit client errors, and validation errors now display their concrete server message in chat error UI.

-   Added automatic per-round LF normalization in `scripts/run-codex-prompts` (`ptbk coder run`):

    -   After each coding round, the script now detects only files changed in that round and normalizes CRLF line endings to LF.
    -   Added safe binary skipping (by known binary extension and NUL-byte detection) to avoid corrupting non-text files.
    -   Added `--no-normalize-line-endings` as a debugging escape hatch (default behavior remains enabled).

-   Added an alternative Agents Server textarea-first agent page at `/agents/[agentName]/textarea`:

    -   Added a minimal centered UI with one large textarea that focuses on load.
    -   Implemented keyboard behavior: `Enter` submits, `Shift+Enter` inserts newline.
    -   On submit, the textarea clears and forwards the message into the existing standalone chat route (`/chat?message=...&newChat=1`) to reuse the same backend message pipeline and streaming behavior.
    -   Added a subtle sending state with submit disabling while navigation to chat starts.
    -   Added a buried discoverability link (`Textarea Entry`) in the agent context menu under agent view actions.

-   Added new `USE SPAWN` commitment for persistent child-agent creation in Agents Server:

    -   Added `USE SPAWN` commitment with `spawn_agent` tool wiring in Promptbook runtime (browser + node runtime adapters).
    -   Added strict shared create-agent input contract (`source`, `folderId`, `sortOrder`, `visibility`) with unknown-field rejection and source-size limits.
    -   Added Agents Server `spawn_agent` tool + `/api/spawn-agent` route that reuse the same manual creation path (`createAgentWithDefaultVisibility`) and return structured results (`status`, `agentId`, `agent` or `error`).
    -   Added safe-by-default protections for spawn calls: auth check, spawn-depth limit, per-actor rate limiting, and audit logs.
    -   Added tests for successful spawn, unknown-field validation, permission failure, payload-too-large handling, and quota/rate-limit failures.
    -   Added example agent source at `agents/examples/spawn-agent.book`.

-   Improved Agents Server `run_browser` reliability for remote-browser outages and full-web-scraping fallback:

    -   Added remote browser connect classification (`REMOTE_BROWSER_UNAVAILABLE`) with structured tool error payloads (`code`, `message`, `isRetryable`, `suggestedNextSteps`, `debug`) instead of raw stack-trace-first failures.
    -   Added remote connect retries with exponential backoff + jitter (default 2 retries / 3 attempts total), connect timeout support, and abort-aware retry waits in a new shared helper (`apps/agents-server/src/utils/retryWithBackoff.ts`).
    -   Added best-effort fallback scraping in `run_browser`: when remote browser infrastructure is unavailable, the tool now falls back to server-side `fetch_url_content`, returns `modeUsed: "fallback"`, includes a dynamic-content warning, and returns extracted content.
    -   Added explicit navigation/action timeout handling in `run_browser` and structured observability logs/metrics tags (`tool=run_browser`, `mode`, `sessionId`) including connect/failure/fallback/error-code counters and timing fields.
    -   Updated chat tool-call parsing + modal rendering to show structured browser issues clearly, including warning banners and expandable “Show debug details” for `run_browser` failures/fallbacks.
    -   Added regression coverage for connect outage fallback flow, invalid action validation (no browser call), and navigation failure classification.

-   Added a hidden admin-only Agents Server error simulation page at `/admin/error-simulation` for internal testing:

    -   Added direct-link-only controls (not listed in the System menu) for intentionally triggering inline error UI, toast-style error UI, and both client/server error-boundary flows.
    -   Added admin-only API endpoint `/api/admin/error-simulation` with deterministic modes for handled HTTP 500, unhandled server throw, invalid JSON payload, and success sanity checks.
    -   This enables faster verification of client-side fetch failure handling, server-side error logging behavior, and staging/production monitoring pipelines.

-   Fixed Agents Server agent cloning placement so cloned agents now default to the same folder as the source agent instead of always being created in root.

-   Improved coding-agent Git automation and Vercel deploy triggering:

    -   Updated `scripts/run-codex-prompts/git/commitChanges.ts` so each successful coding-agent commit now automatically pushes to Git (uses existing upstream when present, and sets upstream on first push when missing).
    -   Added explicit upstream/remote resolution and idempotent no-op behavior when there is nothing to push.
    -   Hardened push failure reporting with actionable hints (auth/permissions, branch protection, diverged history, upstream, connectivity) while keeping the existing prompt fail-log flow.
    -   Updated `apps/agents-server/vercel.json` `ignoreCommand` to allow deployments for both `hejny` and the coding-agent identity (`Promptbook Coding Agent`) instead of only `hejny`.

-   Refactored Agents Server usage analytics API route for maintainability without behavior changes:

    -   Split `apps/agents-server/src/app/api/usage/route.ts` into focused usage-analytics server modules under `apps/agents-server/src/utils/usageAnalytics` (query parsing, data loading, call metric extraction, and aggregation/response shaping).
    -   Kept API behavior and payload semantics unchanged while reducing route-level density to a thin orchestration handler.
    -   Added private JSDoc annotations on extracted internal entities to align with internal conventions.

-   Refactored Agents Server `AgentChatWrapper` for maintainability without behavior changes:

    -   Split `apps/agents-server/src/app/agents/[agentName]/AgentChatWrapper.tsx` into focused private hooks: `useTeamAgentProfiles`, `useAgentChatMetaDisclaimer`, and `useAgentChatToolInteractions`.
    -   Kept existing chat behavior intact, including TEAM profile hydration, META DISCLAIMER gating, auto-execute consumption, and tool-driven location/privacy/pseudo-user/wallet interaction flows.
    -   Added private JSDoc annotations on extracted entities to align with project conventions and package-generation checks.

-   Refactored Agents Server admin usage analytics client for maintainability without behavior changes:

    -   Split `apps/agents-server/src/app/admin/usage/UsageClient.tsx` into focused SRP modules for filters, analytics panels, timeline chart rendering, formatting helpers, and query builders.
    -   Kept all existing UI behavior, filtering semantics, URL query synchronization, and analytics fetch behavior intact while reducing file density.
    -   Added explicit private JSDoc annotations on extracted internal modules to match project conventions.

-   Added simple book version history for Agents Server agent source editing:

    -   Connected the autosave status indicator in the Book editor with a Google Docs-inspired history drawer: clicking the indicator now opens a simple version list, full source preview for the selected snapshot, and one-click restore.
    -   Added Book history API endpoint `/agents/[agentName]/api/book/history` for loading source snapshots and restoring a selected snapshot directly from the editor.
    -   Hardened restore flow with agent/version consistency validation (`historyId` must belong to the current agent) before applying a restore.
    -   Fixed agent history persistence reliability by making history writes fail loudly instead of silently ignoring insert errors.
    -   Added database migration `2026-03-0150-agent-history-backfill.sql` to normalize legacy `AgentHistory.agentId` setups to `permanentId` and backfill missing history rows so every existing agent has at least one snapshot.

-   Added advanced tool-call report export actions in Agents Server chat chip popup:

    -   The advanced variant of the tool-call modal now includes two one-click actions: `Copy` (clipboard) and `Save` (download `.md` file).
    -   Exported content is generated from one shared DRY markdown-report builder reused by both actions, preventing duplicated formatting logic.
    -   The report includes the same advanced technical sections already shown in the modal (`Input payload`, `Output payload`, `Model payload`, and `Full event`) so full context can be shared for troubleshooting.
    -   The simple modal variant remains unchanged and does not expose these technical export actions.

-   Unified Agents Server agent-page metadata branding for all `/agents/[agentName]` routes:

    -   Refactored `apps/agents-server/src/app/agents/[agentName]/layout.tsx` to reuse one shared metadata generator (`generateAgentMetadata`) instead of a separate layout-specific implementation.
    -   Removed redundant page-level `generateMetadata = generateAgentMetadata` aliases from agent subpages (`book`, `book+chat`, `chat`, `integration`, `system-message`, `website-integration`, `iframe`, and profile page) so metadata branding is inherited from one DRY layout source.
    -   As a result, agent favicon and related metadata branding are now applied consistently across agent pages through the shared layout metadata pipeline.

-   Humanized AI-generated outbound email text in Agents Server `USE EMAIL` flow:

    -   Added a shared `humanizeOutboundEmail` utility for email payload cleanup using `humanizeAiText`.
    -   `send_email` now humanizes outbound email subject and body right before sending, without exposing this behavior to the agent.
    -   Added a focused unit test covering subject/content cleanup and metadata subject synchronization.

-   Improved BookEditor syntax highlighting for note-like commitments:

    -   `NOTE`/`NOTES`/`NONCE` now keep the whole commitment block in comment-style gray until the next commitment (not just the keyword).
    -   `TODO` now uses a dedicated high-visibility style (yellow highlight with black text) for the whole commitment block.
    -   Refactored Monaco tokenizer transitions into shared helpers so NOTE/TODO block handling stays DRY.

-   Updated BookEditor commitment syntax highlighting to visually separate non-executable note commitments:

    -   `NOTE`, `NOTES`, and `NONCE` now render with a dedicated gray note style instead of the regular commitment color.
    -   `TODO` now uses its own highlighted style through shared note-like Monaco tokenizer helpers and theme tokens.

-   Expanded self-learning sampling to capture full internal execution traces:

    -   Added a new `INTERNAL MESSAGE` commitment and registry support for parsing book-level internal trace records.
    -   Self-learning now stores structured internal trace blocks between `USER MESSAGE` and `AGENT MESSAGE`, including model request/response payloads and tool-call request+result data.
    -   Kept runtime prompt behavior unchanged by treating `INTERNAL MESSAGE` as trace-only metadata (not an additional system-message sample line).

-   Enhanced Agents Server `USE BROWSER` chip popup to show visual browser replay instead of technical-only output:

    -   `run_browser` now captures visual artifacts across the whole session (initial page, post-action snapshots, and final snapshot) and embeds a structured playback JSON payload in the tool result.
    -   Added a secure `GET /api/browser-artifacts/[artifactName]` endpoint that serves `run_browser` screenshot/video artifacts from server storage.
    -   Added shared DRY browser-result parsing helpers in chat utils and updated the tool-call modal to render a visual browser timeline (images/videos + action list) for `run_browser` chips.

-   Isolated Monaco editor instances in Agents Server into per-instance Shadow DOM via a shared reusable wrapper:

    -   Added `MonacoEditorWithShadowDom` as a single DRY Monaco wrapper that preserves the same external `@monaco-editor/react` editor API while forcing `useShadowDOM: true`.
    -   Switched `BookEditor` Monaco usage to the wrapper so Book-language editing runs in isolated editor DOM internals.
    -   Switched other Agents Server Monaco surfaces (custom CSS, custom JavaScript, transpiled code view, chat code blocks, and advanced tool-call payload viewers) to the same wrapper.

-   Improved Agents Server website chat integration widget UX/layout in embedded mode:

    -   Fixed open-state iframe/widget sizing and offset behavior so the visible chat surface and click bounds stay aligned across desktop/mobile.
    -   Improved close-on-outside-click behavior by removing hidden clickable dead zones around the opened widget.
    -   Added launcher connection-state indicator states (pending/connected/error) and ensured connected state is shown as green when chat is connected.
    -   Refined widget separation from website content with a cleaner border/shadow treatment.
    -   Enhanced loading-state visuals in the seamless widget and tightened chat-content layout so headless chat keeps the input anchored at the bottom.
    -   Updated minimal-shell headless chat container sizing to consistently provide full-height chat viewport in embedded/headless mode.

-   Fixed Agents Server remote browser execution on Vercel when `REMOTE_BROWSER_URL` is configured:

    -   `BrowserConnectionProvider` no longer falls back to launching a local browser when remote Playwright connection fails, so serverless deployments never attempt local Chromium startup in remote mode.
    -   Added a regression test for remote-mode behavior to ensure failed remote connections do not call `launchPersistentContext`.
    -   Removed the unused `@playwright/cli` dependency; browser tooling now relies on the Playwright library path only.

-   Fixed Agents Server header-bar overlap on intermediate viewport widths:

    -   The desktop middle navigation block (search + Documentation/System) now participates in normal flex layout instead of absolute centering, preventing collisions with breadcrumb and profile controls.
    -   The global search box now appears from wider desktop widths (`xl`) while Documentation/System remain available on `lg`, reducing crowding between desktop and mobile breakpoints.

-   Enhanced collapsed chat sidebar UX in Agents Server:

    -   Replaced one-letter collapsed chat chips with compact mini chat cards that show chat title, last preview, and a message-count badge.
    -   Kept timestamp visibility in both sidebar modes, now using relative time labels (for example `2 hours ago`) via `moment(...).fromNow()`.
    -   Reduced duplication by preparing one shared sidebar-item model reused by both collapsed and expanded chat list rendering.

-   Enhanced Agents Server advanced tool-call popup payload inspection:

    -   Advanced payload panels now render inside read-only Monaco editors with syntax highlighting instead of plain `<pre>` blocks.
    -   Raw payload formatting now pretty-prints JSON consistently, including payloads that arrive as minified JSON strings.
    -   Input payload now includes the tool name (`toolName`) together with arguments so request context is explicit.
    -   Tool-call modal now allows full modal scrolling for long advanced payload content while keeping section rendering DRY through one shared payload-section pipeline.

-   Added wallet credential usage chips in Agents Server chat so credential-backed actions visibly disclose safe credential metadata without leaking secrets:

    -   Reused the existing tool-call chip row below messages to append a dedicated `Credential used` chip whenever `USE EMAIL` or `USE PROJECT` successfully uses wallet credentials.
    -   Added a user-friendly credential details modal on chip click (credential name, purpose, service, reference key, and action source), intentionally excluding any secret/token values.
    -   Kept behavior DRY by centralizing credential-chip derivation in shared chat utils and reusing existing chip/modal pipelines.

-   Reworked Agents Server wallet scoping so credentials can be independently scoped by user and agent (with agent scope now default):

    -   Added `isUserScoped` to wallet records (migration `2026-03-0130-user-wallet-user-scope.sql`) while keeping existing agent-scope behavior (`isGlobal` / `agentPermanentId`), enabling all combinations:
        -   User + Agent scope
        -   User-only scope
        -   Agent-only scope (new default for agent-driven credential creation/requests)
        -   Server-global scope (no user scope and no agent scope)
    -   Updated wallet resolution for `USE PROJECT` and `USE EMAIL` to use scope priority `user+agent -> agent-only -> user-only -> server-global`, including fallback for unauthenticated chats to non-user-scoped credentials.
    -   Updated wallet APIs, chat wallet request flow, wallet dialogs, and System > User Wallet UI to expose and persist both scope dimensions.
    -   Updated GitHub App connect/callback state to carry wallet user-scope selection and persist tokens with the selected scope combination.

-   Removed the explicit `WALLET` / `WALLETS` commitment requirement for Agents Server wallet-backed flows:

    -   `WALLET` and `WALLETS` are no longer registered as commitments, so agents no longer need to declare them explicitly.
    -   `USE EMAIL` and `USE PROJECT` continue to read credentials from wallet records automatically, which is now the single supported path for wallet access in these flows.
    -   Removed legacy `WALLET` capability parsing and dropped now-unused Agents Server runtime wiring that only served `WALLET` commitment tool registration.
    -   Updated commitment guidance text in `USE EMAIL` and `USE PROJECT` to remove references to explicitly adding `WALLET`.

-   Enhanced Agents Server control panel UX for scalability and faster scanning:
    -   Reworked the panel into a progressive disclosure layout with collapsible sections (Feedback, Self-learning, Private mode, Language), reducing visual overload as settings grow.
    -   Kept existing behavior unchanged (including private-mode/self-learning dependency) while surfacing clearer section-level state chips and compact state/action rows.
    -   Refined dropdown affordances with stronger active button styling, an explicit close action in the panel header, and a cleaner visual hierarchy that remains scroll-friendly on smaller viewports.
-   Improved Agents Server `USE EMAIL` wallet flow and wallet UX for SMTP credentials:

    -   Added structured SMTP credential schema hints to missing-credential tool results (`send_email` now returns `jsonSchema` together with the wallet request message), so chat wallet prompts can show the expected JSON shape directly.
    -   Added optional `jsonSchema` persistence to `UserWallet` records (new migration `2026-03-0120-user-wallet-json-schema.sql`) and wired the field through wallet APIs, wallet utilities, and DB types.
    -   Updated shared wallet dialog and System > User Wallet UI to better support SMTP JSON secrets:
        -   Access-token secrets now support multiline entry with visibility toggle.
        -   Stored wallet record values now have visibility toggles (including multiline secrets/cookies).
        -   Wallet rows now display attached JSON schema (when present), and create/edit forms support schema input.
        -   Added a “Use SMTP template” shortcut in wallet creation to prefill SMTP service/key/schema and a multiline JSON example.

-   Fixed Agents Server `USE BROWSER` runtime on Vercel by refactoring `run_browser` to use the shared server browser provider (`$provideBrowserForServer`) instead of spawning `npx @playwright/cli`:
    -   `run_browser` now automatically respects `REMOTE_BROWSER_URL` through the existing local/remote browser connection resolver used by Agents Server.
    -   Removed the npm/npx runtime dependency path that caused `ENOENT` failures in Vercel server execution environments.
    -   Preserved the tool contract (same actions and markdown result format) while keeping screenshot snapshot artifacts.
-   Hardened the Agents Server `USE BROWSER` `run_browser` tool to launch reliably on both local and Vercel environments:
    -   Local launches now reuse a writable temporary user-data dir (with an optional `locateChrome` fallback when system Chrome is available) so Playwright can create its profile even when the repository tree is read-only.
    -   Error formatting now records the execution mode, Node/platform details, remote-browser configuration, and the original stack trace whenever browser startup fails, making troubleshooting much easier.
-   Streaming tool calls in the Agents Server chat now render as persistent tool-call chips (spinner-animated while ongoing, flipping to done or ⚠️ error states once resolved) while still honoring TEAM agent metadata and `onToolCallClick` behavior.

-   Prevented duplicate tool-call chips during streaming by stabilizing the idempotency key derivation:
    -   `resolveToolCallIdempotencyKey` now prefers the shared `callId` before falling back to other identifiers so both the initial function-call snapshot and the final output share the same key.
    -   As a result, ongoing chips seamlessly flip to their completed state without leaving stale placeholders, ensuring each tool call only renders one chip.
-   Added automatic Agents Server database migration execution on server runtime and unified migration logic:

    -   Refactored migration implementation into one shared runner (`apps/agents-server/src/database/runDatabaseMigrations.ts`) used by both `npm run migrate-database` and automatic server-side migration checks to keep behavior DRY.
    -   Server now automatically checks and applies pending migrations before normal database access (no manual migration command required during updates).
    -   Upgraded migration tracking table schema to include `appliedBy` (`AUTOMATIC` / `MANUAL`) and now records each newly applied migration with its application source.

-   Integrated GitHub App authentication into Agents Server `USE PROJECT` flow:

    -   Added server-side GitHub App connect/callback/status API routes (`/api/github-app/connect`, `/api/github-app/callback`, `/api/github-app/status`) backed by signed state, user-scoped installation linking, and installation-token refresh.
    -   `USE PROJECT` token resolution in Agents Server now prefers manual wallet token and then automatically resolves GitHub App installation token, mirroring auto-issued tokens into wallet records without manual copy/paste.
    -   Added a shared wallet credential popup component reused by both chat and wallet pages, including a one-click “Connect with GitHub App” action when `USE PROJECT` GitHub credentials are requested.
    -   Added “Connect with GitHub” entry on the wallet page with live GitHub App connection status while keeping manual wallet record create/edit/delete fully available.
    -   Added GitHub App environment variables into `apps/agents-server/.env` and new setup documentation in `apps/agents-server/GITHUB_APP.md`.
    -   Updated `USE PROJECT` commitment documentation text to reflect both manual wallet and host-managed integration token flows.

-   Fixed `USE BROWSER` runtime behavior in Agents Server:
    -   `run_browser` now executes real interactive browser automation through `playwright-cli` (headed mode for debugging), including navigation/action execution and snapshot reporting.
    -   Node commitment tool resolution now maps `run_browser` to the Agents Server implementation via a lazy runtime resolver (with safe fallback outside server runtime).
    -   `USE BROWSER` descriptions/system guidance were updated to treat `run_browser` as an interactive tool (distinct from scraper-based one-shot fetching).
    -   Fixed `fetch_url_content` website scraping error `Can not scrape websites without filesystem tools` by providing filesystem tools to `WebsiteScraper` in Node runtime.
-   Fixed the agent profile chat preview overflow so the embedded chat input now honors the card width (box-sizing is border-box and capped to 100%), keeping the send/microphone buttons from spilling past the rounded border.
-   Chat markdown now lifts every fenced code block out of the raw text via `splitMessageContentIntoSegments` so each snippet mounts a Monaco-backed `<CodeBlock/>`, giving JavaScript/TypeScript, HTML/CSS, Python, Shell, JSON, and SQL fences proper syntax highlighting while geojson fences stay mapped and invalid blocks remain text.
-   Upgraded shared markdown code-fence rendering (used across Agents Server chat/docs/profile/admin markdown surfaces) to Monaco-backed snippets with language-aware highlighting for JavaScript/TypeScript, HTML/CSS, Python, Shell, JSON, and SQL; added fence-alias normalization (`ts`/`typescript`, `js`/`javascript`, `sh`/`bash`, etc.), enforced plaintext fallback for unsupported languages, and isolated each snippet into its own Monaco model path so multiple mixed-language blocks do not interfere while staying responsive inside chat bubbles.
-   Fixed META DOMAIN routing so hosts like `search.ptbk.io` that are configured as an agent’s custom domain but point to the same server (for example `https://pavol-hejny.ptbk.io`) no longer hit the “server not configured” error: middleware now resolves the underlying server via META DOMAIN/ META LINK, reuses the proper Supabase table prefix, and rewrites straight to the agent profile while honoring the DRY alias lookup helper.
-   Fixed Agents Server touch submenu UX in the header: coarse-pointer/touch interactions now ignore hover-delay auto-close timers (which could dismiss parent dropdowns before nested item taps were processed), stale close timers are cleared when input mode changes, and desktop header dropdowns now close on outside tap in touch mode for predictable navigation.
-   Unified Agents Server chat/navigation arrow visuals to one reusable triangle `ArrowIcon` (`▶`): the left chat sidebar toggle, chat scroll-to-latest button, and header breadcrumb separators now share the same component with only direction/size changes (`up`/`down`/`left`/`right`).
-   Enhanced `PromptbookAgentIntegration` seamless widget UX/design: upgraded the floating launcher and chat window with a cleaner modern visual hierarchy, smoother open/hover/loading transitions, improved connection-state feedback, stronger mobile polish, and better accessibility semantics (button behavior, focus-visible, Escape-to-close, and descriptive labels) while keeping the integration API unchanged.
-   Fixed Agents Server embedding/chat unification: `chat?headless` is now the single embed surface (the legacy `/iframe` route redirects to it), headless chat no longer renders the chat-selection sidebar while still persisting/recording chats, the headless route now keeps required chat providers in the layout (fixing `useSelfLearningPreferences` provider crashes), and `IS_EMBEDDING_ALLOWED` middleware/integration snippets now target `/agents/:agentName/chat?headless`.
-   Improved Agents Server Czech localization quality and coverage: polished existing Czech strings with context-aware wording/diacritics, translated footer labels/content, and localized admin user-management surfaces (`/admin/users`, user detail, delete-confirm dialog, and forbidden page) by extending shared server-language translation keys and both English/Czech catalogs.
-   Improved Agents Server chat speech UX and lifecycle handling: OpenAI dictation now detects end-of-speech faster with adaptive silence thresholds, emits an explicit transcribing phase, and always releases microphone/audio resources after recording so mobile/system audio is no longer left degraded by a lingering mic lock; chat input now also shows a floating speech-status bubble (starting/listening/transcribing/error) and shared DRY voice-state UI mapping for clearer real-time feedback.
-   Fixed Agents Server header touch navigation for nested menu branches: desktop-width touch/coarse-pointer devices no longer auto-close top-level dropdowns on blur/mouse-leave while expanding submenu folders, so nested entries (for example Documentation -> All -> PERSONA) can be tapped reliably; added an e2e regression test for this flow.
-   Refined the Agents Server header control panel UX with a cleaner sectioned layout, shared DRY section/toggle/status primitives, clearer at-a-glance state chips (privacy, learning, language), and a viewport-aware scrollable dropdown body so growing settings remain usable on smaller screens.
-   Unified arrow visuals in the Agents Server UI by introducing one shared `ArrowIcon` component (`apps/agents-server/src/components/_utils/ArrowIcon.tsx`) and replacing the previous mix of Lucide chevrons, ad-hoc text arrows, and the custom sidebar arrow implementation across header navigation, chat sidebar controls, admin galleries, story/export selectors, and back/parent-folder navigation affordances.
-   Added a new `WALLET` commitment and Agents Server wallet infrastructure: agents can now persist credential records (`ACCESS_TOKEN`, `USERNAME_PASSWORD`, `SESSION_COOKIE`) through wallet tools (`retrieve/store/update/delete/request`), `USE PROJECT` now expects GitHub credentials from wallet scope (agent-first, then global) instead of browser-local token storage, missing project credentials emit a structured wallet request that opens an in-chat credential popup, and a new System page (`/system/user-wallet`) plus API routes (`/api/user-wallet`) were added with a dedicated `UserWallet` database migration/table.
-   Added built-in Google Analytics (gtag.js) and Smartsapp workspace integrations: new metadata keys drive measurement/workspace configuration, `/admin/custom-js` now exposes an analytics section with toggles for default tracking behavior, and the root layout injects the generated snippets alongside any stored custom JavaScript so admins can enable instrumentation without hand-coding scripts.
-   Reworked Agents Server visibility controls so agent cards, context menus, and folder context menus open a dedicated “Update visibility” modal that lists PRIVATE / UNLISTED / PUBLIC, replacing the old “Make public”/”Make private” toggles and always letting admins pick any of the three states before hitting the API.
-   Added the `IS_EMBEDDING_ALLOWED` metadata toggle (defaulting to `true`), the `/agents/:agentName/iframe` embedding page, and middleware headers that honor the toggle so the iframe route is protected when embedding is disabled; the Website Integration card now shows a copyable iframe snippet and live preview whenever the flag permits embedding.
-   Enabled file uploads from the agent profile page whenever chat attachments are allowed by the server (metadata flag driven), reusing the shared upload handler so the profile preview matches the chat experience.
-   Fixed intermittent Agents Server Book editor syntax highlighting loss after rerender/remount on the same loaded page: Book Monaco language setup is now initialized before editor mount and registered idempotently per Monaco instance (without per-editor teardown), preventing the tokenizer/provider race that could leave subsequent renders unhighlighted.
-   Refined TEAM commitment rendering and pseudo-user naming across core + Agents Server: system message sections now keep markdown H2 headings (`## Language`, `## Teammates`) instead of flattening them away, TEAM tool schemas no longer expose teammate URLs or redundant “Use when …” text, teammate tool names are now human-readable (`team_chat_<normalized_name>_<hash>`), `{User}` teammates are now deterministically pseudonymized to English full names seeded from TEAM instructions, and pseudo-agent canonical URLs were moved from `pseudo-agent.invalid` to `pseudo-agent.promptbook` while keeping resolver compatibility.

-   Reworked Agents Server TOOL CALL chips and the TEAM conversation modal to reuse cached teammate profiles (via the new `/api/team-agent-profile` proxy), replacing random IDs with the teammate’s name, avatar, and readable conversation label so tool call chips/conversations no longer expose raw identifiers.
-   Added Agents Server UI localization with pluggable language packs: introduced metadata `SERVER_LANGUAGE` (default `en`) as the server default, added built-in English/Czech packs, wired a shared language provider with cookie/local override support, localized shared header/search/control-panel/login/dialog strings, and added a new Language switcher into the Control panel next to existing global preferences.
-   Enhanced Agents Server usage analytics with a selectable primary metric (`Cost`, `Agent duration`, `Estimated human time`): `/api/usage` now aggregates `humanDuration` using the existing core `usageToWorktime` estimator from chat-history usage payloads, and `/admin/usage` now lets admins switch the dashboard (summary cards, timeline, breakdown bars, and tables) between all three metrics without duplicating estimation logic.
-   Added a metadata flag `IS_CORE_SERVER_HIDDEN` (defaults to `false`) so administrators can hide the core federated server from the homepage federated lists, header/server-selector dropdown, search provider results, and footer links while keeping the server live for direct references and agent routing.
-   Fixed Agents Server Book editor agent-reference highlighting so all equivalent notations now share one reference-token pipeline in `FROM`/`IMPORT`/`IMPORTS`/`TEAM` blocks: `{a}`, `{a a}`, `@b`, `https://example.com/c`, and `{https://example.com/d}` are now highlighted consistently and resolved as links, while non-reference commitments keep regular parameter highlighting.
-   Improved Agents Server SEO for agent profiles: `/sitemap.xml` now includes only non-deleted `PUBLIC` agent profile URLs with `lastmod`, visibility filtering for sitemap/federated `/api/agents` is now shared through one DRY utility, `robots.txt` now disallows non-index routes (admin/API/system and non-profile agent subpages), agent metadata now sets visibility-aware indexing (`noindex,nofollow` for `PRIVATE`/`UNLISTED`) with canonical/OG/Twitter URL-image fields, and public agent profile pages now emit JSON-LD structured data (`ProfilePage` + `SoftwareApplication`).
-   Added three-state Agents Server visibility (`PRIVATE` / `UNLISTED` / `PUBLIC`) with a DB migration: agent visibility validation and schema types now support `UNLISTED`, agent context menus can switch to all three states, folder context menus can batch-apply visibility across entire folder subtrees, and new-agent creation now uses metadata-driven `DEFAULT_VISIBILITY` (default `UNLISTED`, with legacy `DEFAULT_AGENT_VISIBILITY` migration fallback).
-   Added global custom CSS support for Agents Server: introduced `CustomStylesheet` database table + migration, wired root layout to inject saved CSS on every page, added reusable chat styling hooks (`.agent-response`, `.user-message`, and related classes) sourced from one shared class-name registry, and created a new admin editor at `/admin/custom-css` with a prefilled template and selector reference.
-   Expanded the custom CSS admin flow with Monaco editing, unsaved-change guarding, per-file download, and multi-file CRUD so admins can organize CSS rules across several stitched stylesheets; `/api/custom-css` now lists/saves/deletes named `CustomStylesheet` rows, and the root layout concatenates every saved stylesheet when injecting the CSS bundle.
-   Added global custom JavaScript support for Agents Server: introduced the `CustomJavascript` table with a migration, created `/api/custom-js` plus the `/admin/custom-js` editor with a helpful template and character-limit enforcement, linked the new page from the System menu, and injects the stored script into every page through the root layout so administrators can add integrations or helpers without editing the build.
-   Rebuilt the Custom JavaScript admin experience with Monaco for syntax-aware editing, unlimited named scripts stored via `/api/custom-js`, an unsaved-change guard before navigation/close, download + delete controls, and per-file save/reset/reload flows so admins can organize and export scripts without affecting each other.
-   Implemented a new `USE PROJECT` commitment for GitHub repositories in Agents Server and core parser/runtime flow: `USE PROJECT <repo>` now registers project tools (`project_list_files`, `project_read_file`, `project_upsert_file`, `project_delete_file`, `project_create_branch`, `project_create_pull_request`), exposes a new `project` capability chip, supports manual per-agent GitHub token entry in chat UI (stored locally in browser), passes token + allowed repositories through hidden tool runtime context, and isolates TEAM teammate calls from inherited project secrets.
-   Recorded Agents Server usage per user by storing `ChatHistory.userId` (for logged-in and anonymous cookie-based users), added a migration with index/foreign-key support, and extended `/api/usage` plus the admin Usage dashboard with per-user analytics.
-   Implemented `USE POPUP` commitment: agents can now request to open a popup window with a specific website (e.g. for social media sharing), including a specialized `open_popup` tool, parser support, and a dedicated modal view in Agents Server chat that allows users to manually open the requested URL when the agent is running server-side.
-   Implemented file security checks for uploaded files in Agents Server: added an abstract `FileSecurityChecker` interface with VirusTotal as the first provider, integrated it into the file upload completion webhook, and added a `securityResult` field to the `File` table to track scan results (status, confidence, malicious/suspicious counts, and full report links).
-   Allowed duplicate agent names in Agents Server: agents can now share the same name (derived from the first line of the source), with name-collision diagnostics (red underlining) warning when a name is already used; name-based resolution now always picks the oldest agent so subsequent ones remain referencable by their permanent ID, and internal foreign keys (`ChatHistory`, `ChatFeedback`) were migrated from `agentName` to `permanentId` to support non-unique names.
-   Updated `scripts/run-codex-prompts` Gemini runner so `--agent gemini` now requires explicit `--model <name>` (with `--model default` support), matching OpenAI Codex model-selection behavior and wiring the selected model through execution metadata.
-   Ensured `scripts/run-codex-prompts` commits always run as the configurable coding agent identity (configured via `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, and `CODING_AGENT_GIT_SIGNING_KEY`) so commits are authored and GPG-signed by the agent instead of the primary user.
-   Updated `ptbk coder run` / `scripts/run-codex-prompts` Git identity fallback so missing coding-agent identity variables no longer fail the run: when `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, and signing-key environment variables are not fully configured, commits now fall back to the default Git config and the CLI prints a cyan post-run tip recommending `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, and either `CODING_AGENT_GIT_SIGNING_KEY` or `CODING_AGENT_GPG_KEY_ID` for cleaner commit history.
-   Improved self-learning JSON-mode context so when OpenAI-compatible `response_format` uses `json_schema`, the latest agent answer is now preserved as a formatted `json` code block (including pretty-print when valid JSON), helping teacher-based learning keep structured-output interactions clear.
-   Auto-generate `INITIAL MESSAGE` during self-learning if it's missing: when an open agent has no initial message defined, the teacher agent is now instructed to generate a welcoming and informative one based on the agent's capabilities and source, including quick-start options to help users begin the conversation.
-   Enhanced self-learning samples to include JSON schema information when `response_format` of type `json_schema` is requested through the OpenAI Compatible API, so the agent learns about structured output requirements.
-   Fixed Agents Server OpenAI-compatible structured responses so shorthand `response_format` JSON schemas (as shown in the integration samples) are normalized for AgentKit, ensuring schema constraints are enforced.
-   Added a “More” entry to the Agents Server agent view breadcrumb so all agent context-menu actions are accessible from the navigation hierarchy, and removed redundant back arrows from agent subpages.
-   Unified the Agents Server OpenAI Compatible integration samples into response-format tabs with fully copyable SDK snippets, keeping simple text and JSON schema options in one place and refreshing the JSON schema example.
-   Expanded the Agents Server folder icon picker with a More icons option in the edit dialog so folders can choose from a much larger icon set.
-   Added a JSON-schema `response_format` sample to the Agents Server OpenAI Compatible integration card so the docs show how to request structured replies and explain that Promptbook validates those responses before accepting them.
-   Fixed the Agents Server agent context menu Usage Analytics link so it now filters by the derived agent name and adds a `timeframe=30d` query, matching how `/admin/usage` interprets scope filters.
-   Fixed the Agents Server header search layout so the desktop search input now lives inside the centered navigation row, keeping it responsive and preventing it from overlapping the menu on narrower large-screen widths.
-   Added pseudo-agent support for Agents Server compact references: `{Void}` now works as explicit no-parent inheritance (`FROM {Void}`) while keeping legacy void aliases compatible, `{User}`/`@User` now resolve as TEAM-only pseudo teammates (case-insensitive), TEAM runtime now returns dedicated pseudo-agent tool results for `{User}`/`{Void}`, unresolved-reference diagnostics skip valid pseudo references, and Agent chat now auto-opens a one-message modal reply flow when a TEAM tool talks to `{User}`.
-   Added dedicated pseudo-agent profile pages at `/agents/user` and `/agents/void`, routing case-insensitive pseudo names to canonical documentation, surfacing each pseudo agent's summary, aliases, and usage guidance so visitors can understand how to reference {User}/{Void} without needing a stored agent.
-   Added `{Null}` as an alias of `{Void}` so book authors can use `FROM {Null}` (or `{Null}` anywhere a pseudo-agent is accepted) while keeping the same DRY runtime handling as `{Void}`.
-   Added new `USE PRIVACY` commitment with `turn_privacy_on` tool support: agents can now explicitly request privacy mode during chat, Agents Server shows a confirmation modal before enabling it, and confirmed activation reuses the existing private-mode behavior (no chat/memory/self-learning persistence) while keeping future encryption work out of current claims.
-   Added admin usage analytics in Agents Server: new `/admin/usage` now visualizes call volume with timeline graphs and breakdowns, supports granular filters by agent/folder/server scope, timeframe, call type, and actor type, surfaces API key + user-agent detail tables, and is linked from both the System admin menu and each agent context menu; usage data stays DRY by reusing `ChatHistory` records from the shared recorder (extended with `actorType`) plus a new migration for analytics-oriented chat-history indexes.
-   Added support for multiple agents in one Agents Server book: sources can now define embedded teammate agents in `---`-separated sections, compact references like `{Copywriter}`/`@Copywriter` resolve to book-scoped local agent routes, and chat/profile/book/model-requirements/system-message/OpenAI-compatible flows now resolve those embedded agents while keeping persistence and self-learning bound to the parent agent record.
-   Fixed Agents Server chat file attachments so the agent now receives inline file content context (not just filename/type/URL metadata): attachment handling now reuses a shared DRY resolver that keeps URL metadata, safely inlines text-like file contents with size/timeout limits, blocks private-network URLs, and falls back gracefully when content cannot be inlined.
-   Added a dedicated `META DOMAIN` commitment (with `DOMAIN` alias), wired parser support (`agentProfile.meta.domain` normalization), and updated Agents Server custom-host middleware routing so incoming hosts now resolve agents by `META DOMAIN` first while keeping `META LINK` matching as backward-compatible fallback.
-   Added `--dry-run` support to `scripts/run-codex-prompts/run-codex-prompts.ts` so it prints unwritten prompts (filtered by `--priority`) without executing any prompt runner or creating commits.
-   Refactored `scripts/generate-prompt-boilerplate/generate-prompt-boilerplate.ts` to use `commander` and switched its positional count argument to an explicit `--count <number>` option for clearer CLI usage.
-   Fixed intermittent missing ruled lines in Agents Server Book editor: `BookEditorMonaco` now uses a hydration-stable instance class (from `useId`) instead of a mutable render counter, so Monaco line-background styles always attach to the correct editor instance after SSR/client hydration.
-   Improved `<BookEditor/>` paste handling so plain text still pastes normally, while rich clipboard payloads (images/files and rich document formats like HTML/RTF) now switch to the same file-upload flow used by drag-and-drop/upload buttons, keeping upload behavior DRY and consistent in Agents Server.
-   Fixed intermittent forced auto-scroll in Agents Server chat: removed visibility-based auto-scroll re-enabling that could fight manual scrolling, and hardened shared chat auto-scroll logic so user scroll-up state immediately wins while auto-scroll only triggers when new content arrives and the user was already at the bottom.
-   Enabled true manual stop for Agents Server chat streaming: clicking Stop now propagates `AbortSignal` end-to-end (UI -> `/agents/[agentName]/api/chat` -> Agent -> AgentKit run), stream writes now shut down safely on client disconnect, and cancelled runs no longer continue emitting tokens after the user stops.
-   Fixed unit-test stability for unresolved agent references and chat component imports: Jest now mocks stylesheet modules globally (so `<LlmChat/>` tests no longer attempt to parse `.module.css` as code), and the unresolved-reference diagnostics test now correctly expects missing references from `FROM`, `TEAM`, and `IMPORT` compact tokens.
-   Improved Agents Server Book editor save-failure UX: autosave now tracks the last server-confirmed revision, keeps failed saves visible with a retry action, and blocks leaving the Book page (reload/close/in-app navigation/back) until the current source is confirmed saved on the server.
-   Added customizable folder appearance in Agents Server: folders now store `icon` + `color` metadata (with a new `AgentFolder` migration), the folder create/edit flow uses one shared dialog for name/icon/color, and folder visuals are now rendered consistently in homepage folder cards (including recycle bin) and the header folder hierarchy.
-   Expanded the folder icon picker so agents can choose calendar, chart line, crown, heart, palette, rocket, star, and sun glyphs in addition to the existing set, giving folders more visual distinction in the navigation and cards.
-   Fixed Agents Server header menu usability across mouse and touch: hierarchy/docs/system/profile dropdowns now use shared delayed-close behavior to prevent premature hover closes, nested desktop submenu panels now keep the parent menu alive while crossing into flyouts, touch/coarse-pointer devices can expand nested submenu branches via tap (including agent folder hierarchies), and menu panel/item styling was polished for clearer depth and hit targets.
-   Extended `KNOWLEDGE` URL handling in Agents Server/OpenAI vector-store ingestion so webpage sources (`text/html`, `application/xhtml+xml`) are now shallowly scraped to markdown before upload, enabling `KNOWLEDGE https://...` website references (not only documents/files), while still keeping document-like URLs (`.pdf`, `.txt`, `.md`, etc.) on the existing direct-ingestion path.
-   Added expandable agent profile descriptions in the Agents Server by trimming long bios with the new shared `shortenText` helper, toggling extra text with a Show more/Show less control, and extending the `line-clamp` utilities so the hero view stays visually balanced.
-   Prevented the Agents Server chat from jumping to the bottom whenever the user scrolls up: the shared `useChatAutoScroll` hook now tracks manual scrolling so auto-scroll stays disabled until the user scrolls back or hits the scroll-to-bottom indicator, letting visitors read earlier messages without being hijacked.
-   Fixed Agents Server agent-profile inheritance so `FROM` now correctly propagates all `META` fields and `INITIAL MESSAGE` (with child overrides preserved): profile loading was refactored to a shared inherited-profile resolver reused by server-rendered profile consumers and `/api/profile`, removing the previous partial/manual inheritance path that missed remote parents.
-   Hid the Documentation and System dropdowns from the Agents Server header for anonymous visitors so guests only see the agent navigation, control panel, and login prompt.
-   Added a dedicated folder context menu in Agents Server list view (right-click on folder cards) with only folder-relevant actions (`Open Folder`, `Rename Folder`, `Delete Folder`), and refactored shared menu panel/positioning utilities so folder and agent context menus reuse the same DRY infrastructure.
-   Fixed agent and folder creation so duplicate-name conflicts now surface friendly errors: Supabase constraint violations are translated via a shared helper (returning `ConflictError`), the `/api/agent-folders` POST/PATCH endpoints return 409 responses, and the header/add-agent workflows show alerts instead of hanging when a duplicate name is detected.
-   Fixed Agents Server streaming chat so the user can keep scrolling while tokens arrive instead of having the viewport locked to the bottom; the shared `<Chat/>` component now toggles the auto-scroll hook around streaming assistant content.
-   Allowed optional guidance to follow the `OPEN` commitment, taught the teacher agent to read that guidance, and now include it in the self-learning prompt so authors can tell the teacher how to teach the agent alongside the existing openness metadata.
-   Added a metadata flag `IS_EXPERIMENTAL_PWA_APP_ENABLED` (defaults to `true`) so administrators can toggle whether the "Install Agent as App" action appears inside agent context menus, hiding the prompt when the experiment is disabled.
-   Updated Agents Server chat tool-call streaming so tool-call chips now appear while the assistant message is still streaming (not only after completion), with a shared DRY tool-call stream emitter for both ongoing and final snapshots plus unified chip-label logic used by ongoing and completed chips.
-   Added a new `MESSAGE SUFFIX` commitment with multiline support, wired it into commitment registry/parsing (`parseAgentSource.meta.messageSuffix`), and implemented DRY Agents Server runtime handling that appends the suffix to every assistant reply in native chat plus OpenAI/OpenRouter compatibility modes, including emulated streaming of the suffix chunks so it appears progressively in streamed responses.
-   Added a new `META DISCLAIMER` commitment with multiline Markdown support, wired parser/registry support in core, and implemented Agents Server disclaimer enforcement end-to-end: users must acknowledge the disclaimer before chat/voice requests proceed, agreement is persisted per user+agent in `UserData`, and chat surfaces now show a blocking pre-chat disclaimer modal with an explicit `I Agree` action.
-   Implemented global server search in Agents Server with a pluggable provider architecture (agents profile+book, federated-agent profiles, folders, conversations, documentation, metadata, users, messages/files/images, and navigation links), added the new `/api/search` aggregated endpoint, and integrated a debounced header search UX (desktop + mobile) with grouped icon-based results, contextual snippets, and direct entity links.
-   Enhanced the search experience by wiring `/search` to a paged, filterable view, polishing the header dropdown spinner/keyboard behavior, surfacing an explicit “view all results” entry, and returning total/offset metadata from `/api/search` so pagination knows the full count.
-   Fixed Agents Server header submenu usability across hierarchy and menu dropdowns: the desktop hierarchy now opens by hover (including agent-view crumbs), mobile parent items now toggle nested subitems with clear indentation, and both hierarchy/menu mobile rendering now reuse one shared DRY recursive submenu renderer.
-   Kept the Documentation and System dropdown panels open while hovering by wiring shared hover/blur timers in `apps/agents-server/src/components/Header/Header.tsx`, letting users move the cursor from the trigger into the panel without an immediate close.
-   Improved Agents Server chat switching UX by removing route-refresh navigation during in-page chat changes (URL now updates via history state), adding DRY chat activation/caching flow for instant revisits, delaying switch overlays to avoid flicker, and wiring the in-chat `New chat` action to create a fresh chat entry instead of resetting/mutating the current conversation.
-   Fixed Agents Server chat-history recording for canonicalized agent routes by resolving `agentName` from either route `agentName` or `permanentId` before inserts, so `ChatHistory` writes no longer fail with `ChatHistory_agentName_fkey` violations; also reused the same resolver in feedback handling to keep agent-identifier resolution DRY across endpoints.
-   Fixed RemoteAgent streaming tool-call parsing for large/split `{"toolCalls":...}` frames: chunk-fragmented tool payload lines are now buffered and parsed once complete, preventing raw JSON blobs from leaking into assistant message text and preserving tool-call chips in Agents Server chat.
-   Scoped Agents Server client-version enforcement to frontend browser traffic only, so OpenAI/OpenRouter compatibility routes (and other API-key/API requests) no longer require the latest Promptbook client while the frontend refresh-mismatch protection remains in place.
-   Fixed the Agents Server anonymous profile/chat pages in private windows by stopping render-time anonymous cookie writes (`ensureChatHistoryIdentity` now only checks availability); anonymous identity cookie creation remains in Route Handlers where Next.js allows cookie mutation.
-   Fixed Agents Server menu stacking order: agent context menus now render above agent cards in the homepage folder/list view, while the mobile hamburger menu remains above agent-related overlays (including the profile context-menu trigger layer).
-   Refined the Agents Server desktop collapsed My chats sidebar to prevent overflow by switching to compact avatar-first chat cards, keeping timestamps readable in the narrow rail, and reusing one shared chat-item content resolver for both collapsed and expanded sidebar layouts.
-   Fixed Agents Server chat-history persistence by introducing a shared DRY recorder for chat, voice, and OpenAI-compatible endpoints that now consistently captures message hashes/telemetry, logs insert failures instead of silently swallowing them, and falls back when optional `ChatHistory` columns are missing; also added an idempotent migration to ensure `ChatHistory.source` and `ChatHistory.apiKey` exist with the expected `source` constraint.
-   Added a new `USE USER LOCATION` commitment with a `get_user_location` tool, wired hidden runtime-context support for browser geolocation, and integrated Agents Server on-demand location prompting so the browser requests location only after the agent explicitly asks for it.
-   Added dual Agents Server application-error variants (`simple` and `advanced`) with shared DRY rendering helpers, and wired the Next.js app error boundary to report every captured failure to Sentry through the new `/api/error-reports/application` forwarding endpoint.
-   Fixed Agents Server TypeScript compatibility regressions across header submenu timers, homepage graph/list layout typing, anonymous user cookie/header helpers (Next async runtime APIs), user-memory identity fallback typing, metadata default lookup typing, and `<LlmChat/>` prompt parameter typing so `npx tsc --noEmit` no longer fails on these strict type errors.
-   Enabled the Agents Server desktop chat area to stay interactive while the sidebar remains open by keeping the backdrop overlay visual-only (pointer-events disabled), eliminating the auto-close-on-click behavior that previously closed the panel, while leaving the mobile overlay dismiss flow unchanged.
-   Added a private mode toggle to the control panel so chats, memories, and self-learning stay local when it’s enabled, the My chats preview displays a dedicated private indicator, and the server chat/voice/OpenAI-compatible APIs plus the user-chat/user-memory endpoints skip writing any data while the private-mode cookie is present.
-   Added a Control Panel self-learning toggle so administrators can pause the book-editing flow for their agents while continuing to save chats and memories, and wired `selfLearningEnabled` prompt parameters through RemoteAgent so the server skips the automatic self-learning hook whenever the switch is off.
-   Added user profile avatars to the Agents Server: users can now set a `profileImageUrl` via the new System → Profile page (backed by `/api/profile`), the header displays that image instead of the placeholder initial, and the System menu exposes the Profile link next to the existing User Memory entry.
-   Added anonymous chat persistence in the Agents Server: guests now get `anonymous-<base58>` usernames stored in cookies, the user-chat/memory services reuse the shared identity resolver, and the My chats sidebar surfaces the same list for anonymous users as it does for signed-in accounts.
-   Added a shared `textToPreviewText` helper so chat previews (history cards, quick-access shortcuts, etc.) reuse the same Markdown sanitization pipeline as voice previews while keeping the JSON storage layer DRY.
-   Fixed the Agents Server header breadcrumb so folders show the folder icon instead of a single-letter placeholder when no agent avatar is available.
-   Reduced Agents Server homepage cold-start latency by introducing a `getMetadataMap` helper so the layout, federated-server lookup, and chat-preference helpers now read their metadata in a single Supabase round-trip instead of multiple sequential queries.
-   Added a shared `SidebarToggleArrow` component for the Agents Server and anchored it to the middle of the desktop chat sidebar so the open/close affordance always reuses a single arrow implementation.
-   Centered the desktop chat sidebar toggle over the chat’s left panel so the open/closing arrow now lives inline with the main chat surface while keeping the shared arrow component intact.
-   Fixed the Agents Server header Documentation and System dropdown subitems so nested panels float outside the scrollable dropdown instead of getting clipped behind the first-level container.
-   Centered the Agents Server desktop header navigation so the middle menu items stay locked in the visual center of the panel regardless of how wide the surrounding sections become.
-   Added a build-time prerender step for the Agents Server homepage (`/`) so `npm run build`/`npm run test-build` spin up the production server, capture the rendered HTML, and save it under `.next/prerendered/home.html`.
-   Improved the Agents Server desktop collapsed chat strip so each chat now shows a short title/preview/timestamp badge (and the strip slightly widens) while the mobile sidebar return path stays unchanged.
-   Fixed the Agents Server mobile chat history edge handle so tapping the floating arrow reuses the same sidebar list as desktop, always renders the readable title/preview/timestamp layout, and keeps the vertical strip hidden until the mobile overlay is opened.
-   Removed the redundant desktop chat history/book headers in Agents Server so the desktop view no longer shows the extra panel below the main menu while mobile layouts remain unchanged.
-   Removed the redundant `USE IMAGE GENERATION`, `USE IMAGE`, and `IMAGE GENERATOR` commitment aliases so only the working `USE IMAGE GENERATOR` commitment remains, reducing confusion for users and contributors.
-   Added CDN-friendly caching headers on the Agents Server homepage (`/`) so Vercel can pre-render that route with `s-maxage`/`stale-while-revalidate` and the first visitor no longer hits a cold SSR run.
-   Snapped the Agents Server footer to the bottom of the viewport so the layout no longer leaves the footer floating mid-page when the content is short.
-   Added a global version-mismatch experience that surfaces a friendly refresh notice, prevents the old chat-only message, and automatically reloads the page whenever the server requires a newer client release.
-   Simplified the Agents Server new-version modal so it now highlights the update, shows a focus-aware 7-second countdown, and exposes refresh/stop controls so the page reloads automatically unless the user opts out.
-   Added a custom Agents Server application error page with a branded layout, digest tracking, and proactive troubleshooting guidance for failed navigations.
-   Ensured Agents Server chat uploads now hand the generated CDN URL back to the client instead of the experimental short-link alias so attached files are accessible to agents outside the browser.
-   Improved the Agents Server chat history drawer: the left panel now slides with smoother animation, auto-closes when you tap outside, sits atop the header instead of being cropped, and exposes a mobile edge handle plus a minimal desktop strip so chats stay accessible without the extra top bar.
-   Added in-chat map rendering for GeoJSON features so agent replies that include \`\`\`geojson\`\`\` blocks now render a Leaflet map inside the bubble that zooms to the provided feature/collection.
-   Fixed the chat GeoJSON renderer so Leaflet overlays draw their features as soon as they're ready instead of showing a bare map for several seconds by invalidating the map size once the layer is initialized.
-   Expanded the chat GeoJSON map bubble so it stretches wider on desktop and mobile and added a control that opens the same Leaflet rendering in a responsive modal for a closer look.
-   Polished chat GeoJSON feature rendering so generated points of interest show glowing markers with tooltip initials, lines and polygons gain richer strokes/fills, and hover highlights keep each feature visually focused.
-   Hid streaming-only rich-feature markup (maps, inline image prompts, math/code fences, etc.) so the chat keeps streaming the human-readable text while the feature materializes instead of dumping raw GeoJSON or image prompt source, and the completed rendering appears once the assistant finishes.
-   Added placeholder widgets for streaming rich features (maps, images, inline LaTeX, etc.) so the chat now shows a friendly loading surface while the agent is still generating each rendered element instead of leaving the bubble blank until the feature is ready.
-   Stopped `STREAM_KEEP_ALIVE` heartbeats from ever reaching `<Chat/>` by filtering them inside `RemoteAgent` so keep-alive pings stay hidden while preserving the underlying connection health signals.
-   Ensured the Agents Server chat reset option now just opens a new chat instead of re-inserting the failed message, so the “Reset” button clears the conversation without duplicating the input.
-   Updated Agents Server `/admin/api-tokens` token rows to use the shared `<SecretInput/>` control, so API tokens are masked by default and can be toggled visible/hidden with the eye icon while keeping copy-to-clipboard inline.
-   Added `--priority <minimum-priority>` to `scripts/run-codex-prompts` so coding tasks can be filtered by priority threshold (default `0` keeps current behavior), and updated runner stats to show skipped runnable tasks as `Priority <N` while preserving `--agent`/`--model` behavior.
-   Fixed `USE IMAGE GENERATOR` to follow notation-only behavior: agents are now instructed to output `![alt](?image-prompt=...)` placeholders (instead of calling a generation tool), while the UI keeps generating images from that notation.
-   Refactored Agents Server image generation cache/lock flow into a shared `ensureGeneratedImage` utility and reused it in both `/api/images/[filename]` and default-agent-avatar generation, so lock waiting, stale-lock cleanup, and cache-first behavior are DRY and consistent.
-   Fixed Agents Server chat action button fading so `New chat` / `Save` are no longer stuck dimmed: overlap detection now checks the real message content block instead of the full-width message row, keeping fade only when buttons truly cover message content.
-   Redesigned the Agents Server header navigation into a hierarchy-first flow (`Server > Agent > Profile/Chat/Book`), moved server branding to the left edge, moved Users under `System`, renamed menu entries to `Landing page` and `Version info`, and removed the duplicated in-page `Chat/Source` switcher buttons from chat/book views.
-   Fixed Agents Server header folder flyout navigation so nested submenu columns are no longer clipped behind the first-level dropdown container, while keeping standard non-flyout dropdowns scrollable.
-   Fixed Agents Server profile-chat handoff with history enabled by introducing a profile-origin `newChat=1` flow: both typed messages and quick `?message=...` starts now always bootstrap a fresh chat and auto-send the message instead of occasionally landing in an existing chat without execution.
-   Fixed Book editor instant teammate creation for unresolved `TEAM` references in Agents Server: creating `Create {name}` now refreshes reference diagnostics immediately (no stale resolver cache), ignores soft-deleted duplicates when checking existing agents, updates the missing-teammate panel reliably right after creation, and encodes agent identifiers during folder lookups so newly created teammates stay in the same folder even when the current agent uses a non-canonical name.
-   Extended the Book editor missing-reference panel so every unresolved compact agent token (`@Agent`, `{Agent}`, etc., regardless of FROM, IMPORT(S), or TEAM) now appears under “Missing referenced agents” and can be resolved through the shared `/api/book/missing-agent` quick-create flow, keeping diagnostics and resolver caches refreshed once the referenced agent is created.
-   Ensured the desktop Book editor grants space for that “Missing referenced agents” panel by letting the editor column shrink (`min-w-0`) so the quick-create cards remain visible even inside the resizable book/chat split.
-   Fixed the coding-agent runner progress header so it stays pinned in a dedicated top terminal line (white background) while agent CLI output continues streaming in real time below it, and refactored the progress line calculations into a shared DRY helper.
-   Added a shared secret input component to the Agents Server so login, change-password, admin auth, user creation, and token copy panels can reuse the same visibility toggle for passwords and API keys.
-   Fixed backgrounding on small devices by adding keep-alive pings to the Agents Server chat stream and teaching RemoteAgent to ignore the heartbeat token (`STREAM_KEEP_ALIVE`), so long-running replies stay connected even if the user switches away and returns later.
-   Added visibility-aware recovery in `<LlmChat/>` so backgrounded streaming responses no longer surface a “connection error” dialog; the interrupted prompt is retried automatically when the tab becomes visible again and the previous assistant message continues streaming.
-   Fixed the remaining Samsung Internet chat overflow root cause by tightening shared `<Chat/>` width constraints (removing `100vw` sizing, applying `min-width: 0` on flex/grid boundaries, and capping bubble width by `avatar + gap` math) and stabilized emoji font loading by switching OpenMoji `@font-face` in `Chat.module.css` to local-first sources with CDN fallback.
    -### 📚 Book

-   Implemented persistent `MEMORY` commitment support in Agents Server end-to-end: `MEMORY` now registers hidden retrieve/store memory tools (with optional per-commitment instructions), stores data in the new `UserMemory` table (per user + per agent, with global-memory option), disables memory automatically for unauthenticated users and TEAM conversations, shows memory tool chips with stored/retrieved content, adds `System -> User Memory` CRUD UI for logged-in users, and wires admin (`ADMIN_PASSWORD`) memory identity with automatic DB-user linking.
-   Expanded the Agents Server memory experience by soft-deleting records (`deletedAt` column + migration), preferring agent-scoped entries by default, and teaching the MEMORY commitment to use new `update_user_memory` / `delete_user_memory` tools so each agent can edit or retire its own memories (global entries stay optional and shared).
-   Added per-user, per-agent chat history in Agents Server with a new `UserChat` table and migration: standalone chat now supports creating/resuming/deleting chats, stores full chat message arrays as JSON, keeps `?chat=<id>` URL routing (including fallback to most-recent chat when missing/invalid), orders chats by latest activity, creates a fresh chat when starting from the profile page, and keeps history disabled for unauthenticated users while preserving existing global `ChatHistory` logging.
-   Polished the Agents Server chat HTML export so the downloaded file mirrors the live chat experience with a hero banner, stat grid, bubble cards, avatars, attachments/citations, and embedded illustrations, making exports shareable instead of the previous bare layout.
-   Fixed Agents Server chat PDF downloads so the Save menu now produces a valid file (powered by a reusable jsPDF exporter that reuses the text/plain renderer) instead of the previous placeholder string, delivering real downloads in every chat.
-   Enhanced the Agents Server chat PDF export so the saved file preserves the agent background, colored message bubbles, avatars, and a branded print header, letting the exported chat mirror the live conversation instead of looking like plain text.
-   Added a System → About entry that opens the new `/admin/about` page so admins can view shared Promptbook, system, and deployment version cards without hunting through the menu.
-   Moved the Models navigation link into System → Models in the Agents Server header so admins keep a single System dropdown while maintaining quick access to model management.
-   When admins set up or update passwords in Agents Server (setup flow plus the admin users/change-password screens), weak passwords now surface the validation message (e.g., minimum length/format) instead of a generic “Internal server error”, so it’s clear what to fix before retrying.
-   Added a `BookEditable` helper to keep `KNOWLEDGE` insertions (from uploads) positioned just before the `CLOSED` commitment instead of at the very end of the book.
-   Enabled clickable agent references in the Book editor: `@agent`, `{agent name}`, `{agentId}`, `https://.../agents/...`, and `{https://.../agents/...}` now share one highlight style and open the referenced agent via Ctrl/Cmd+Click.
-   Fixed Samsung Internet rendering issues in the Agents Server by replacing `w-screen` route shells with a shared viewport-width-safe class, switching affected full-height routes to `100dvh`-based sizing, and improving font fallbacks/loading (`font-display: swap`, emoji fallback stack, and text autosize normalization) to prevent horizontal overflow and inconsistent font rendering on mobile Samsung browsers.
-   Added unresolved-reference diagnostics to the Agents Server Book editor: missing compact agent references in `FROM`, `TEAM`, and `IMPORT` commitments are now underlined red (Monaco error markers) while keeping links clickable, powered by a new shared DRY resolver-based diagnostics utility and API endpoint.
-   Added a Book editor right panel for unresolved TEAM references so admins immediately see “Team member {name} is not found. Do you want to create it?” prompts and can hit `Create {name}` to spin up a folder-aware boilerplate agent, refresh diagnostics, and resolve the teammate without leaving the editor.
-   Ensured the instant teammate creation panel always reflects the exact token (e.g., `{Lawyer}`/`@lawyer`) and re-runs diagnostics with a cache-busting refresh so the card disappears as soon as the resolver detects the freshly created agent.
-   Fixed global agent route canonicalization in Agents Server: opening `/agents/:agentId` now resolves compact references through the shared local/federated resolver, redirects names and normalized-name variants to canonical `/agents/<permanentId>`, redirects federated hits to the correct remote server URL, and returns 404 when unresolved.
-   Hardened missing referenced-agent handling across `FROM`, `IMPORT`, and `TEAM` in Agents Server: compact references that cannot be resolved are now tracked through a shared DRY resolver-issue abstraction, inheritance/import processing no longer crashes and emits visible `NOTE` warnings instead, unresolved TEAM references are shown as `(not found)` capability chips without teammate URLs, and model-requirements flows now safely degrade instead of breaking the whole agent.
-   Allowed Agents Server TEAM references to still resolve private teammates hosted on the same server by falling back to a local agent lookup when compact references report issues, so local teammates stay reachable even when their visibility is private while federated servers continue to require public agents.
-   Strengthened source citation behavior in Agents Server chat: AgentKit instructions now append a shared citation policy whenever knowledge/web tools are active, and chat post-processing now preserves parsed citations before humanization so source chips remain visible instead of being dropped.
-   Simplified Agents Server knowledge chips by trimming CDN filenames to the first 20 characters (after dropping the extension), removing any trailing `isHumanOrID`-detected IDs, and keeping the original name for the tooltip via the new `simplifyKnowledgeLabel` helper.
-   Fixed knowledge chip simplification where it previously affected only agent capability chips: chat source chips now use the same shared `simplifyKnowledgeLabel`/`isHumanOrID` utility (moved to `src/utils/knowledge`) so CDN document citations finally hide random ID suffixes and show clean 20-character labels.
-   Expanded Agents Server chat citation parsing to support simplified source markers like `【document123.doc】` in addition to full OpenAI markers like `【7:15†document123.doc】`; both now reuse a shared DRY normalization utility, resolve to the same source-chip pipeline, and keep citation links working against agent knowledge documents.
-   Fixed duplicated tool call chips (including empty first chips) in Agents Server chat by streaming only finalized tool call payloads to the client, so each invocation now renders a single correct chip while still showing distinct chips for distinct calls.
-   Fixed Agents Server chat feedback saving by resolving agent identifiers to canonical names (fixing foreign key violations) and correctly extracting the user's IP from the `x-forwarded-for` header, ensuring successful database insertion.
-   Improved the Agents Server chat feedback toast to report the actual server response (green on 201, red with the returned message on errors), and fixed its positioning to sit above the sticky header and menus with an increased z-index.
-   Enforced a client-version handshake across Agents Server chat, voice, and OpenAI-compatible endpoints: every request must now send `x-promptbook-client-version`, outdated clients get an inline update message inside the chat, and our Vercel deployment always serves the `PROMPTBOOK_ENGINE_VERSION` release.
-   Refined the Agents Server Documentation dropdown so only PERSONA, KNOWLEDGE, GOAL, TEAM, CLOSED, INITIAL MESSAGE, and USE SEARCH ENGINE stay at the top level while the remaining commitments live inside a hoverable “All” submenu, keeping the menu compact on desktop and mobile.
-   Refined the experimental Story app in Agents Server: moved it to `/experiments/story` (with legacy `/story` redirect), changed story naming to use the editor’s first line instead of a separate title field, replaced the old `actors` model with selected existing server agents, switched Story export UI to a chat-save-style Save dropdown, and nested navigation under `System -> Experiments -> Story` using the existing hover submenu pattern.

-   Added a scroll-to-bottom indicator to the Agents Server chat so the floating arrow now announces unseen replies, surfaces a new-messages badge, and keeps the action accessible even when the user scrolls away from the newest content.
-   Refined the Agents Server chat scroll-to-bottom control with a cleaner directional arrow icon and richer frosted styling (hover/focus ring, subtle motion, and badge polish) while keeping sizing and color tokens DRY through shared CSS variables.
-   Improved Agents Server chat scroll indicator UX by showing the scroll-down control only while the latest message is actually out of view (not just based on autoscroll state), and redesigned the "X new messages" badge into a centered floating pill above the arrow for clearer placement and readability.
-   Removed `backdrop-filter` from the Agents Server chat scroll-down button and its new-messages badge so transformed overlay layers no longer create ghost blur patches above the message input.

-   Removed the Agents Server desktop hamburger menu so the toggle only appears in mobile layouts where it is used.
-   Improved the Agents Server transition from agent profile chat to full chat by removing the blocking overlay, fixing promise-safe message handoff from the profile composer/quick buttons, and using a shared view-transition surface so opening `/chat` feels immediate and seamless.
-   Fixed profile chat handoff so `?message=…` now always lands in a newly created chat and immediately runs the written or quick message even when the history loader has to bootstrap another chat ID, preventing the first conversation from opening blank after the chat history rewrite.
-   Added quick-access buttons to the profile chat preview so authenticated users can continue a recent conversation while the default action still starts a new chat.
-   Added a shared `SoundSystemProvider` and moved the chat sound/vibration toggles into the new header Control Panel (desktop dropdown + mobile card), keeping the global controls near the profile menu instead of buried under the chat save menu.
-   Added the shared useUnsavedChangesGuard hook so modal closing (starting with the Agents Server create-agent dialog) confirms before discarding agent book edits and blocks tab closes until the user confirms.
-   Removed the clone button from the Agents Server directory listing cards so cloning stays available only via the agent context menu, preventing duplicate actions in both views.
-   Modernized the Agents Server default agent visuals: the default avatar prompt now asks for a cinematic, digital portrait, the icon and screenshot generators share a DRY helper for gradient-forward layouts, and the image gallery page renders in a polished card-based design that keeps the new assets front and center.
-   Refined the Agents Server default avatar prompt to generate warmer, mentor-like animated agent portraits with stronger per-agent visual distinction, business-friendly tone, color-aware styling, and explicit no-text/no-photorealism constraints.
-   Added inline metadata editing to the Agents Server admin screen so values and notes can be updated directly from each row without scrolling to the add form.
-   Fixed Agents Server metadata row editing so clicking `Edit` opens only the selected row (including default keys) by tracking edit state per metadata key instead of shared default IDs, keeping edits in place without unexpectedly expanding all default entries.
-   Fixed Agents Server inline metadata typing focus loss by moving the shared metadata value editor to a stable module-level component (instead of recreating it during each render), so the cursor now stays focused while editing values in place.
-   Ensured the agent model requirements that are sent to third-party LLMs (and the Agents Server `/api/model-requirements` response) only include low-level properties by stripping `metadata`, `notes`, `parentAgentUrl`, and `promptSuffix`, keeping internal commitments data inside Promptbook.
-   Ensured the OpenAI compatibility chat endpoints in the Agents Server forward any `response_format` payload to the underlying OpenAI/API provider by mapping it to AgentKit output types before each run so JSON schema responses are honored.
-   OpenAI compatibility mode of the agent server now respects the `response_format` parameter by correctly passing it to the AgentKit execution tools.
-   Ensured `response_format` overrides still honor JSON schema output when cached AgentKit assistants are reused by mapping the format inside `AgentLlmExecutionTools` before running the prepared agent.
-   Supported the OpenAI `tools` and `tool_choice` parameters in the Agents Server compatibility proxy so requests that rely on function/tool calling are simply forwarded to OpenAI without needing Promptbook to implement the tooling itself.
-   Fixed the Agents Server clone flow so it now prompts with a prefilled "Copy of {agent name}" name, reuses a shared dialog helper, and redirects into the freshly cloned agent instead of a missing route.
-   Fixed the Agents Server home list so the client cache re-syncs with the server-provided agent and folder data immediately after signing in, eliminating the need for a manual refresh.
-   Added explicit drag handles to the Agents Server homepage cards so touchscreens can scroll freely while drag-and-drop remains pinned to a clearly marked handle that also works for folders.
-   The error dialog when the chat fails ("Connection Issue") now has an option to reset the chat with the same message sent to a fresh chat.
-   Added the `CHAT_FAIL_MESSAGE` metadata so the Agents Server can replace the technical fallback string with a friendly failure copy, and wired the chat routes and AgentChat wrapper to read this value before passing it into `LlmChat`.
-   Ensured country flag emoji render with the OpenMoji color font across the Agents Server UI (including the chat) so flags no longer fall back to regional-indicator letters and now appear as recognizable country icons.
-   Voice dictation now honors the user's locale (Accept-Language -> speech recognition language) so Whisper stays in the speaker's language instead of forcing English, with the new language hint threaded through Agent chat, profile chat, and the voice test client.
-   Added a new metadata flag `IS_EXPERIMENTAL_VOICE_TTS_STT_ENABLED` (default `true`) so admins can disable the shared text-to-speech / speech-to-text stack separately from `IS_EXPERIMENTAL_VOICE_CALLING_ENABLED`; the profile API now returns both flags, RemoteAgent surfaces the speech availability, the Agents Server chat hides the microphone and playback controls when speech is off, and every speech endpoint (`/api/voice`, `/api/elevenlabs/tts`, `/api/openai/v1/audio/transcriptions`) returns `403` whenever TTS/STT has been frozen out.
-   Fixed Agents Server chat attachments so the uploaded file metadata is forwarded to the agent prompt, keeping uploads accessible to the agent after hitting the server.
-   Fixed Agents Server chat uploads so attached files now use the shared CDN uploader and are stored on the server before the agent logs a message, preventing dropped attachments.
-   Hardened Agents Server chat attachment delivery end-to-end: chat now normalizes attachment payloads, appends a model-visible attachment URL section to the user prompt, uses short upload links for chat attachments, and makes `/api/upload` payload parsing/MIME handling resilient so valid files are no longer rejected by brittle client metadata.
-   Enabled Agents Server chat attachments to be ingested as temporary knowledge sources so each uploaded file is downloaded, indexed, and readable by the AgentKit agent (attachment-only runs skip the cached knowledge base to keep the vector store fresh while non-attachment flows still benefit from caching).
-   Added the `IS_FILE_ATTACHEMENTS_ENABLED` metadata flag (default `true`) so admins can toggle chat attachments off; when disabled, the Agents Server chat stops wiring the upload handler and hides the drag-and-drop/file button controls.
-   Show error message when the agent returns an empty message.
-   Enabled `\\(...\\)` and `\\[...\\]` LaTeX delimiters in chat markdown so inline and block formulas render with the existing KaTeX pipeline, matching `$...$`/`$$...$$` behavior and keeping the shared renderer reusable across chat/agent components.
-   Stopped KaTeX from running inside inline/fenced code in Agents Server chat so LaTeX notation remains raw when it is intentionally shown as code while still rendering normally in prose or blockquote contexts.
-   Preserved file attachments when cloning prompts for OpenAI chat so playground uploads keep their `arrayBuffer` after the OpenAI 6.18.0 upgrade.
-   Re-styled Markdown headings inside chat bubbles as card-like sections that lean on the same shared heading tokens but now add gradient glass texture, a thicker accent border, high-fidelity glow lines, and deeper drop shadows so the headings mirror the richer Agents Server card language.
-   Tuned the new heading tokens so every Markdown heading grabs its border, shadow, and text colors from the chat bubble palette, letting the card-like headers glow softly and stay in sync with the shared Agents Server design language.
-   Underlined inline links inside Agents Server chat bubbles so URLs stay recognizable now that the heading tiles use card-style backgrounds.
-   Fixed Agents Server chat avatar/bubble spacing while the agent is still thinking or streaming by making the avatar image size follow the responsive avatar container; incomplete and completed message rows now keep the same visual gap on mobile.

-   Added `scripts/verify-prompts/verify-prompts.ts`, an interactive helper that lists top-level prompts, walks through every `[ ]` section, archives resolved files under `prompts/done`, and automatically appends the requested fix prompts when work is still pending; registered the helper as a new task in `.vscode/terminals.json`.

-   Added quick chat/source pills to the Agents Server so the chat header and agent source (book) editor stay in sync; admins can now jump directly between the conversation and knowledge editor without returning to the profile page.
-   Added ElevenLabs speech playback to the chat so every bubble can be read aloud via the new `/api/elevenlabs/tts` route (guarded by the client-version handshake), complete with play/pause controls, cached audio blobs, and env-configurable voice/model defaults plus the shared `ELEVEN_LABS_API_KEY`, `ELEVEN_LABS_VOICE_ID`, and `ELEVEN_LABS_MODEL_ID` settings.
-   Added the `textToSpeechText` helper so the Agents Server voice chat sanitizes Markdown, URLs, citations, and formatting before calling both the OpenAI TTS route and the ElevenLabs `/tts` endpoint, keeping spoken replies clean while reusing one DRY implementation.
-   Added a `META VOICE` commitment so agent sources can pin their ElevenLabs voice ID, threaded the metadata into RemoteAgent/Agents Server profiles, and taught `/api/elevenlabs/tts` plus the chat playback helper to use the agent-specific ID when requesting speech audio.

### 📚 Book

-   Added flexible agent referencing for FROM, IMPORT, and TEAM so you can write {Activation code agent}, @Superagent, agentId, or even {https://foo} instead of raw URLs; the agents server now resolves these tokens by searching local and federated agents through a shared resolver.

-   Added the shared `AgentReferenceResolver` option to the core engine (and the new `CreateAgentModelRequirementsOptions` type) so Sender, IMPORT, and TEAM references are rewritten before applying commitments, and wired the resolver through the Agents Server APIs and cache managers to keep assistant creation and metadata in sync while a regression test protects the hook.
-   Reworked inline `KNOWLEDGE` so inline text pieces are converted into temporary CDN files before being added to `AgentModelRequirements.knowledgeSources`, introduced the uploader hook behind `CreateAgentModelRequirementsOptions`, and passed the shared uploader through all Agents Server cache/handler paths so inline knowledge behaves exactly like referenced files in vector stores and execution while still falling back to data URLs when the uploader is not supplied.
-   Updated `KNOWLEDGE` commitment parsing so free-form text can embed any number of URLs: all referenced URLs are now extracted into `knowledgeSources` for scraping/vector-store ingestion, while meaningful surrounding prose is still preserved as inline knowledge; also unified URL extraction through a shared helper reused by both commitment application and `parseAgentSource` (Agents Server profile/citation metadata).
-   Fixed Agents Server teammate chat chips for compact TEAM references (`{Agent}` / `@Agent`) by resolving TEAM capabilities through the shared agent reference resolver in the profile API, so teammate communication chips and modal conversations render again after the agent-referencing upgrade.

-   Leveraged Vibrations API in the chat to provide haptic feedback in sync with the sound system.
-   Added metadata keys `DEFAULT_IS_SOUNDS_ON` and `DEFAULT_IS_VIBRATION_ON` so admins can configure the default chat feedback state, and surfaced independent sound/haptic toggles in the save menu (`ChatSoundToggle` + `ChatVibrationToggle`) that respect those defaults while persisting the user's choice.
-   Reworked the save menu controls into the new `ChatSoundAndVibrationPanel`, keeping the two switches inside a single polished card with lucide icons and dense status badges so the sound and haptic toggles stay intuitive yet inconspicuous.
-   Allow to make agent public / private agent from its context menu on the Agent profile page / right click of the agent.
-   Organized the Agents dropdown menu in the Agents Server header by folders: folders now link to their scoped homepage view, agents are indented under their folder hierarchy, and ordering follows the saved folder/agent sort order.
-   Made the Agents dropdown menu render folder branches in hover-expanding columns so large folder/agent trees stay manageable without overwhelming a single list.

-   Migrated Promptbook Agents to OpenAI AgentKit: added AgentKit execution tools with shared vector store handling, updated Agents Server caching to store AgentKit vector stores in `preparedExternals`, and refreshed playground samples.
-   Cached OpenAI vector stores in a new `AgentExternals` table keyed by knowledge source content hashes, removing `Agent.preparedExternals` from the Agents Server schema.
-   Added `note` metadata to Agents Server `AgentExternals` entries so cached vector stores record the creating agent and stored files.
-   Fixed OpenAI AgentKit knowledge ingestion by using the stable vector stores API and updated file batch calls for the current OpenAI SDK.
-   Removed invalid Keep-Alive request headers for OpenAI-compatible clients to fix AgentKit chat failures in Agents Server.
-   Replaced OpenAI assistant knowledge ingestion timing magic numbers with named constants to satisfy lint rules.
-   Reported word-based usage for OpenAI/OpenRouter compatibility chat completions in Agents Server, including native Promptbook usage details.
-   Fixed the Agents Server OpenAI compatibility handler so `usage.details` now includes real word/character/line/paragraph/page counts for both input and output by merging native usage with computed text statistics.
-   Wired Agents Server chat to reuse cached OpenAI Assistants (external preparation), building assistants from full model requirements and bumping the cache key version to avoid stale knowledge bases.
-   Added a script to batch delete OpenAI assistants with pagination and a confirmation prompt.
-   Fixed the OpenAI assistants cleanup script to auto-paginate through all pages before deletion.
-   Added a script to batch delete OpenAI assistants, vector stores, and files with a single confirmation prompt.

-   Added root nonce test files `nonce-foo-1.txt` and `nonce-bar-1.txt` for coding agent verification.
-   Regenerated the Agents Server Supabase subset schema for `Agent` and `AgentHistory` to stay aligned with the canonical database schema.
-   Regenerated the Agents Server Supabase schema types from migrations, aligning ChatHistory and File table fields.
-   Added Agents Server folder organization with nested folders, drag-and-drop ordering, URL folder paths, and recycle bin support for folders.
-   Fixed Agents Server folder creation at the root level by querying `parentId` with null-aware filters to avoid bigint "null" errors.
-   Replaced blocking browser `alert`, `prompt`, and `confirm` calls in Agents Server with queued async dialogs rendered via a global provider.
-   Added a queued `showLoginDialog` helper and wired the header login controls into the same async dialog queue so the login pop-up now uses the shared non-blocking modal shell and respects cancelation/ordering rules.
-   Refined the agent avatar hover tooltip in Agents Server chat with a cleaner card, profile link, and resilient image fallback.
-   Fixed agent avatar resolution to prefer META IMAGE across chat popups and UI cards, with consistent placeholder fallbacks for local and federated agents.
-   Added a global route loading indicator in Agents Server to show feedback during link navigation.
-   Enhanced refactor-candidate prompt generation with richer guidance, clearer file linking, and reason-aware context.
-   Added shared prompt emoji tag selection so generated refactor and boilerplate prompts use fresh unique `[✨...]` tags across the repo.
-   Added a refactor-candidate scanner script that flags oversized or entity-heavy source files and generates per-file refactor prompts in `prompts`.
-   Scoped the refactor-candidate scanner to `.ts/.tsx/.js/.jsx` files while skipping hidden directories, `node_modules`, and `packages/`.
-   Leveraged `spaceTrim` across the repository for better readability and maintainability of multiline strings and string joins.
-   Simplified the Agents Server home page to focus on agents, moved the previous dashboard to `/dashboard`, and linked it from the System menu.
-   Made Agents Server home list cards more compact and file-like, including smaller capability chips.
-   Enhanced Agents Server home agent cards with dynamic, color-based backgrounds and subtle noise effects for a more professional look.
-   Improved Agents Server list drag-and-drop with live reordering, drag overlays, and clearer drop targets for agents and folders.
-   Reduced accidental drag activations on touchscreens in the Agents Server home list by adding touch-specific activation delays.
-   Added a parent folder card in Agents Server list view to quickly navigate up and drag agents or folders to the parent.
-   Created new agents inside the active folder when adding from a subfolder view in the Agents Server home list.
-   Added a configurable Markdown message (via metadata) shown above the agents list on the Agents Server homepage.
-   Added `AGENT_NAMING` metadata to customize agent terminology (singular/plural) across the Agents Server UI with casing-aware replacements.
-   Added `THINKING_MESSAGES` metadata so admins can set slash-delimited placeholder variants (default `Thinking... / Searching for information... / Sorting information...`) that rotate while an agent is composing a reply.
-   Agents Server chat now samples a random `THINKING_MESSAGES` variant each time an agent starts thinking and then switches to another random variant every 1-5 seconds until the agent finish streaming its reply, giving the thinking placeholder a lively, ever-changing feel.
-   Scoped the Agents Server homepage message and federated agents to the root view, and updated folder headings to show the folder name with per-folder agent counts.
-   Added a shared Agents Server context menu with right-click support on agent cards, plus rename actions reused on agent profile pages.
-   Added an "Open Folder" action to the Agents Server agent context menu (profile menu and right click) to jump to the agent's folder for management.
-   Added a chat preparation chip in Agents Server to signal when GPT assistants are being created before the first response.
-   Added `[🤰]`-tagged assistant preparation logging (cache lookup, model requirement timing, assistant create/update, vector store progress) and surfaced preparation phases on the "Preparing agent" chip.
-   Added per-knowledge-source download timeouts plus richer logging during OpenAI assistant knowledge ingestion to pinpoint stalls.
-   Added detailed OpenAI vector store upload progress logs (file uploads, batch polling, timeouts) to prevent assistant preparation from hanging silently.
-   Added vector store batch diagnostics (file type summary, per-file status samples, vector store status) and guarded invalid batch IDs during assistant knowledge ingestion.
-   Fixed OpenAI vector store batch polling to log expected vs. returned batch IDs and cancel using the created batch ID when mismatches occur.
-   Fixed vector store file batch polling to use real batch IDs (vsfb\_\*) and improved diagnostics to map uploaded file IDs to vector store file IDs.
-   Scoped the "Preparing agent: Creating assistant" chip in Agents Server to cache misses by emitting it only when a new assistant is created from cache lookup.
-   Enhanced OpenAI vector store upload robustness and logging:
    -   Added explicit file extension logging during knowledge ingestion to identify potential bottlenecks.
    -   Implemented early "stalled" diagnostics if vector store batches remain in progress for more than 30 seconds without change.
    -   Added specific warnings for PDF files which are known to cause ingestion delays.
    -   Synced comprehensive polling and diagnostic logic between Assistants and Responses APIs.
-   Added `shouldContinueOnVectorStoreStall` option to OpenAI assistant tools (default `true`) to prevent stuck PDF ingestion from blocking agent preparation.
-   Fixed Vector Store ID vs. File Batch ID mismatch handling in OpenAI polling logic.
-   Fixed Agents Server chat to always return a fallback message when the model produces an empty response, including streaming and OpenAI-compatible endpoints.
-   Fixed Agents Server Book editor multi-file uploads by debouncing editor updates, tracking placeholders safely, and adding a floating upload panel with pause/resume controls and upload stats.
-   Fixed federated agent item design on home page to match local agents.
-   Fix federated agent images by correctly resolving placeholder URLs from the originating server.
-   Fixed Agents Server chat markdown rendering for sublists by normalizing unordered list indentation under ordered items.
-   Deduplicated Agents Server chat source chips so repeated document sources show only once per message.
-   Deduplicated tool call chips in Agents Server chat by stabilizing tool call identities across partial updates.
-   Fixed duplicated tool call chips (blank/filled pair) by deduplicating repeated tool call entries and rendering only the final, result-rich chip for each tool invocation.
-   Ensured a single chip per tool invocation by dropping errored snapshots once a counterpart with the same idempotency key succeeds, preventing blank/error duplicates in Agents Server chat.
-   Grouped identical ongoing tool call chips in Agents Server chat so concurrent tool runs collapse into a single chip with a count.
-   Fixed grouped ongoing teammate chips so tool calls from different teammates no longer collapse into one chip, while repeated calls from the same teammate still aggregate with a count.
-   Added tactile feedback for Agents Server chat tool call chips and streaming responses by routing the chat sound system into chip rendering and vibrating on every streaming chunk, so tool usage and in-progress replies feel more immersive.
-   Redesigned the Agents Server memory tool call modal so memory chips now show a friendly hero header, status badge, and scoped memory cards (query, match count, global/personal scope) instead of raw JSON blobs, making saved/loaded memories easier to understand.
-   Fixed drag-and-drop uploads in the Agents Server create-agent dialog by reusing the shared BookEditor upload handler.
-   Fixed document source citation in Agents Server chat:
    -   Resolved issue where clicking on KNOWLEDGE source chips showed "Document preview unavailable" instead of the actual document
    -   Fixed `/api/profile` endpoint to explicitly include `knowledgeSources` array in the response
    -   Added inheritance support for `knowledgeSources` so child agents inherit knowledge from parent agents
    -   Citations from KNOWLEDGE commitments now correctly resolve to their source URLs for preview and download
    -   Follows DRY principle - parsing logic is centralized in `parseAgentSource()`, data flows through API to `RemoteAgent`
-   Allowed Agents Server chat source chips to cite non-document sources: simple URLs now render inside the citation modal iframe (with the friendly label derived from the URL) and inline text snippets show their first 30 characters in the chip while the modal renders the full Markdown excerpt, all without disrupting the existing knowledge-document preview flow.
-   Fixed Agents Server image generation and uploads to safely shorten CDN paths for long filenames, preventing Vercel Blob path length errors.
-   Added support for inline `![alt](?image-prompt=...)` markers coming from agents that use `USE IMAGE GENERATOR`: the chat now parses the notation, reuses the shared `constructImageFilename` helper, queues `/api/images` with the same lock/queue logic, displays a spinner-based placeholder, and swaps in the CDN-hosted image once it finishes rendering.
-   Normalized file names before uploads in Agents Server (chat attachments, knowledge uploads, admin file uploads) to keep CDN URLs clean and consistent.
-   Added actions to image gallery in Agent's Server:
    -   Copy image prompts to clipboard
    -   Display technical parameters (model, size, quality, style) extracted from filenames
-   Allow to add image in the image prompt in `ImageGeneratorTestClient`
-   Ensured the Agents Server chat menu stays above chat action buttons (New chat, Save, etc.).
-   Added top spacing in Agents Server chat so action buttons no longer overlap the first messages.
-   Faded Agents Server chat action buttons while scrolling when they overlap the first visible message.
-   Kept Agents Server chat action buttons softly faded when they still overlap messages after scrolling, while restoring clickability once scrolling stops.
-   Updated the Agents Server self-learning chip to use the brain icon without brackets.
-   Enhanced the Agents Server self-learning modal with a friendly summary and server-provided learning details.
-   Updated the Agents Server self-learning modal to show agent + teacher avatars and render learned commitments in a read-only BookEditor.
-   Added per-message timestamps in Agents Server chat with agent generation durations, and included timestamps in exported chat files.
-   Fixed Agents Server chat avatar spacing while responses stream so in-progress bubbles align with completed messages.
-   Added Promptbook SDK integration snippets in Agents Server, including RemoteAgent Node.js and React examples on the integration page.
-   Added API key field to the OpenRouter integration section in Agents Server to match OpenAI compatible setup.
-   Added a Create API Key action on the agent integration page so admins can generate tokens without leaving the integrations screen.
-   Fixed Rollup publishing config to inline dynamic imports so package builds no longer fail on multi-chunk outputs in CI.
-   Redesigned the Agents Server home graph with Beautiful Mermaid diagrams while keeping server clustering, filtering, federated links, and avatar labels.
-   Refined the Agents Server home agents graph to a social-style relationship map with softer nodes, avatar rings, and curved, color-coded links.
-   Improved Agents Server graph filtering so focused agents include directly connected neighbors across local and federated servers.
-   Enhanced the Agents Server agents graph with category-based node shapes, status colors, and roomier layout spacing for cleaner clusters.
-   Updated Agents Server home graph nodes to render agent-brand chips with avatars, brand-based fills, and readable text.
-   Added Agents Server home graph download buttons for PNG, SVG, and ASCII exports powered by Beautiful Mermaid.
-   Redesigned the Agents Server home graph with React Flow, adding draggable layout edits, server/folder grouping, and responsive graph interactions.

-   Enhanced prompt template literal handling to return `PromptString`, inline safe parameters, and append structured parameter/context blocks for unsafe or multiline data with escaping.
-   Added prompt notation documentation, examples, and a live evaluator to the Utils app.
-   Enhanced prompt notation example actions in the Utils app with an overwrite warning, clipboard copy, and download shortcuts.
-   Replaced prompt notation example action emojis with Lucide icons in the Utils app.
-   Added install instructions and import header to prompt notation example downloads in the Utils app.
-   Generated prompt notation example outputs dynamically on render in the Utils app to keep outputs in sync with the prompt notation implementation.
-   Updated prompt notation output to use numeric parameter placeholders and a numbered parameters list.
-   Switched prompt notation parameter placeholders to alternate labels when bracketed numbers appear in user input to avoid collisions.
-   Render structured JSON parameters without double-escaping in prompt notation outputs.
-   Enhanced `humanizeAiText` to normalize more dash, quote, ellipsis, and whitespace variants in AI text.
-   Removed bracketed source citation artifacts (e.g. `\u30105:1\u2020source\u3011`) from `humanizeAiText` output.

-   Improved error reporting in package generation script to show the actual line where markers ([🟢], [⚪], [⚫], [🟡], [🔵]) are found when they shouldn't be published in packages. This helps developers quickly identify and fix issues by displaying the line number and content instead of just the filename.
-   Enhanced all comparison documents in `/documents/comparison/*.md` for better balance and clarity:
    -   Balanced pros/cons tables: Added legitimate advantages to alternative platforms (Agno, ChatGPT, Claude, etc.) and acknowledged Promptbook's limitations for fair comparison
    -   Expanded "Best for" sections: Both Promptbook and alternative platforms now have detailed use case descriptions
    -   Improved objectivity: Each platform's strengths are now accurately represented, maintaining overall balanced perspective while highlighting Promptbook's unique advantages in federated architecture, commitment system, and cross-platform portability
-   Implemented `TEMPLATE` commitment to enforce specific message structure or response templates for agent responses.
-   Added nonce test files at the repository root for coding agent verification.
-   Added a script to run prompt files through OpenAI Codex with prompt status tracking and git commits.
-   Added support for Gemini CLI to the coding agent script with the `--agent gemini` flag, allowing non-interactive prompt execution and automated git commits.
-   Added interactive waits between codex prompt tasks with a `--no-wait` override flag.
-   Added `--ignore-git-changes` flag to the coding agent runner to skip the clean working tree check.
-   Added per-prompt start summaries with a confirmation wait before each prompt runs (unless `--no-wait`).
-   Estimated OpenAI Codex runner prices from Codex CLI token counts instead of reporting $0.00.
-   Improved Codex pricing for the coding agent by parsing the CLI token breakdown, calculating prompt/completion costs per model (including `gpt-5.1-codex-mini`), and marking fallback estimates as uncertain so the reported ~$0.30 matches real usage.
-   Added coding runner and model signatures to coding agent prompt status lines.
-   Implemented `USE IMAGE GENERATOR` commitment to allow agents to generate images using an image generation model.
-   [✨⛪️] Allow to close dialogs by clicking outside of the dialog.
-   Created a series of comprehensive comparison documents between Promptbook and other projects (ChatGPT, Claude, ChatGPT-Assistance, LangChain, N8N, NotebookLM, Wordware, Agno, Letta, Eliza, and Digital Twin platforms like Personal.ai/Delphi) in `/documents/comparison/*.md`. These comparisons highlight Promptbook's unique "Book" language, commitment system (Persona, Knowledge, Rule, Team), and its federated, open-source architecture.
-   Implemented `IMPORT` commitment that allows to import generic text files (both local and URL) into the agent source with plugin-based architecture.
-   Created file named `nonce-foo-4.txt` with content `foo`
-   Created file named `nonce-bar-4.txt` with content `bar`
-   Created file named `nonce-foo-3.txt` with content of of output of `date +%s`
-   Created file named `nonce-bar-3.txt` with content of output of `ls -la`
-   Created nonce test files `nonce-foo-1.txt`, `nonce-bar-1.txt`, `nonce-foo-2.txt`, and `nonce-bar-2.txt` at the root of the project to verify coding agent functionality.
-   Implemented GitHub import script that fetches issues and discussions from a Promptbook repository and structures them into Markdown files.
-   Code blocks in the book are assigned to the commitment where they are placed.
-   Allow to attach files to the chat messages in Agents Server [2025-12-0900-agents-server-chat-attachements.md](https://github.com/webgptorg/promptbook/blob/main/prompts/2025-12-0900-agents-server-chat-attachements.md)
-   Implement Ctrl+S shortcut in `<BookEditor/>` component
-   Implement Ctrl+V shortcut in `<BookEditor/>` component for pasting images and files
-   Implement Ctrl+S shortcut in `<Chat/>` component for opening export menu
-   Refactored the `<Chat/>` component into smaller, single-responsibility modules to improve readability and maintainability.
-   Implement tool calling loop into the `LlmExecutionTools`. Currently only for `OpenAiCompatibleExecutionTools`
-   Show floating hint when creating new agent in Agents Server [2025-12-0920-agents-server-hints.md](https://github.com/webgptorg/promptbook/blob/main/prompts/2025-12-0920-agents-server-hints.md)
-   Agents Server can generate boilerplate rules and personas in the same language as the agent name [2025-12-0950-agents-server-boilerplate-rules-and-personas-in-language-of-server.md](https://github.com/webgptorg/promptbook/blob/main/prompts/2025-12-0950-agents-server-boilerplate-rules-and-personas-in-language-of-server.md)
-   Record all tool calls and aggregate usage in `promptResult` when the tool calling loop is used.
-   Improved the design of the agent server name in the header to prevent wrapping on long names
-   Samples of communication (USER MESSAGE and AGENT MESSAGE) are now transferred into the system message.
-   The initial message is now also included in the example interaction within the system message and is passed into the samples with `question` set to `null`.
-   Horizontal lines (`---`) are now filtered out from the system message.
-   Use Teacher Agent for self-learning of the agents.
-   Self-learning is now a two-step process: first appending conversation samples, then asynchronously calling the Teacher Agent.
-   Added `TEACHER` well-known agent to the core server configuration.
-   Fixed syntax highlighting for `LANGUAGES` and `RULES` in the book editor to ensure the whole word is highlighted, preferring long forms over short forms
-   Implemented `USE TIME` commitment to add the ability for agents to determine the current date and time.
-   Added timezone awareness to `USE TIME` commitment.
-   Added extra instructions to the system message for `USE TIME`, `USE SEARCH ENGINE`, and `USE BROWSER` commitments to provide explicit guidance for the agent on when and how to use these tools.
-   Allow optional instructions after `USE SEARCH ENGINE` and `USE TIME` to be included in the system message.
-   Implemented `USE SEARCH` (and `USE SEARCH ENGINE`) commitment that adds the ability for agents to perform web search using `SerpSearchEngine`.
-   Implemented `SerpSearchEngine` that uses the SerpApi to fetch Google search results.
-   Implemented `GoogleSearchEngine` that uses Google Custom Search JSON API to fetch results.
-   Defined tools in OpenAI Assistant when creating or updating it through `AgentLlmExecutionTools`.
-   Books can contain Markdown code blocks, which are treated as raw text and not parsed for commitments
-   Code blocks in the `<BookEditor />` are distinctly highlighted
-   Do the full proxy of the given LLM tools in `countUsage` and `cacheLlmTools`
-   Show linked Agents on Agent profile via the capability chips
-   Implemented `TEAM` commitment with teammate tool calling, chiplets/modals, and team connections in agent profiles and the agents graph
-   Fixed TEAM commitment tool execution to resolve teammate tool functions dynamically and use `RemoteAgent` for teammate calls.
-   Implement Ctrl+V shortcut in `<Chat/>` component for pasting images and files
-   Agents social graph on home page
    -   Handle agent profile image loading failures gracefully by showing initials fallback
    -   Limit image loading retries to 3 attempts with exponential backoff
    -   Show agents as nodes in an interactive graph view
    -   Visualize connections via inheritance (`FROM`) and `IMPORT`
    -   Support for zooming, panning, and dragging nodes
    -   Filter connection types and focus on specific agents
    -   Persist view and filters in URL query parameters
    -   Show agents from federated servers in the graph
    -   Each federated server is represented as a color-coded cluster
    -   Visualize cross-server links between agents
    -   Advanced filtering by server and specific agents within servers
    -   Federated agents are loaded independently and shown in clusters in the graph view.
    -   Added loading and error indicators for federated servers in the graph and filter dropdown.
    -   Show tool call indicator (spinner + tool name) during LLM execution in `<Chat/>` component
    -   Make the Agents Graph visually more appealing [1]
        -   The arrow should be at the end of the edge showing the direction of the link
        -   The chip with the agent should be visually more appealing, Use image and color of the agent in a nice looking circle.
            -   In the agent graph, each agent should have its own profile picture in the circle.
            -   The color should be preserved but only as a background, not the full picture.
            -   In The tooltip shows the agent description. Do not replicate the agent name.
        -   The Group around federated agent server should be circle, not square.
        -   Also, the group around federated servers should not overlap. It should be separate, distinct clusters. Connection between the agents can go across the federated server group boundary.
        -   Fixed and improved agent graph relations:
            -   Show directional graph arrows and moving particles to indicate connection direction
            -   Corrected URL normalization for inheritance (`FROM`) and `IMPORT` links to ensure agents are correctly connected (e.g., matching Sophia Green and Sophia Supergreen)
            -   Ensure connections correctly respect user preferences in checkboxes
-   Added `linguisticHash` utility function to `@promptbook/utils` that creates human-readable hashes.
-   Added `Linguistic Hash` tool to the Utils app.
-   Enhanced `linguisticHash` to return a short story-like sentence for more memorable hashes, updating the Utils app text and unit tests to match.
-   Added configurable word counts (1-20, default 7) to `linguisticHash`, including Utils app controls, warnings for short hashes, and updated tests.
-   Added multilingual support to `linguisticHash` with Czech word lists and a language selector in the Utils app.
-   Refactored `linguisticHash` internals to split word selection and word count helpers into focused modules for easier maintenance.
-   Prevent caching when tool is used, but still write the messages into the cache or `USER MESSAGE` + `AGENT MESSAGE` pair
-   Implemented modular voice speech input in `<Chat/>` with two providers: `BrowserSpeechRecognition` (Web Speech API) and `OpenAiSpeechRecognition` (Whisper API).
-   Added voice input test page at `/admin/voice-input-test` in Agents Server.
-   Added microphone button to `<Chat/>` with visual recording indicators and real-time transcription insertion.
-   Enhanced visuals of the agent chat page
-   Refined chat message bubble sizing with a minimum width and responsive max widths for desktop and mobile layouts.
-   Increased the minimum chat bubble width on small screens so short messages no longer render as tiny pills in Agents Server chat.
-   Fixed chat message stack width so source chips wrap within bubble bounds on desktop and mobile in Agents Server.
-   Added grained background to the chat page (matching the agent profile page)
-   Increased saturation of agent messages for better visibility
-   Fixed chat page height to exactly 100vh to prevent unnecessary scrolling
-   Recursive inheritance for meta properties (e.g. `META COLOR`) in `Agents Server`
-   Enhanced the visual design of the chat input area with a modern capsule-like design, better padding, refined button styling, and brand-color focus highlights.
-   Human-readable titles for showing tool calls in chiplets with better labels and emojis (e.g. `[🔎 Venezuela]`).
-   Clicking on a tool call chiplet opens a modal with tool call details (arguments and results).
-   Improved tool call details modal with better formatting for arguments and results (especially for search results).
-   Reimagined the generic tool call modal (used by non-special chips) with a hero header, prose-rich request/result panels, friendly issue badges, and a collapsible raw payload view so it feels intuitive for everyone while retaining the raw JSON for explorers.
-   Web Search: Show stored tool results in the source chiplet modal in Agents Server (parsed list or raw output).
-   Store raw tool call data (arguments/results/errors/timestamps) in `ChatMessage.toolCalls` and render time/search chiplets from stored tool calls (no re-runs).
-   Improved search results parsing in tool call modal to handle multiple nested result formats (stringified JSON, nested result objects, various field names like `data`, `items`, `results`)
-   Record timestamp of tool calls and store them in `ChatMessage.completedToolCalls`
-   Preserve assistant message content in Agents Server chat when tool calls are emitted.
-   When the `USE TIME` is used, show the chiplet which will show that time was used (similarly to `USE SEARCH ENGINE` chiplets).
-   User-friendly details popup for the time tool with a visual clock and relative time display based on the tool call timestamp.
-   Allow AI to leverage all the options and possibilities of SERP search engine (location, localization, pagination, advanced filters, etc.).
-   Updated `SearchEngine` interface to support advanced options.
-   Enhanced Search Engine Test page with advanced SERP parameters and raw call details.
-   Allow to add additional model requirements like image size in the [Image Generator Test](http://localhost:4440/admin/image-generator-test)
-   Improved the voice input in the chat component to be more natural:
    -   Implemented silence detection (VAD-like) in `OpenAiSpeechRecognition` using `AudioContext` and `AnalyserNode` to automatically stop recording after 2 seconds of silence.
    -   Show better visual feedback that the audio is being processed.
    -   Once transcription is done, automatically insert the transcribed text into the chat input box.
    -   Cleaned up redundant logic in `<Chat/>` component regarding voice input handling.
-   Enhance visuals of the agent connections on the Agents Graph on home page
    -   Increase distance between nodes in the graph
    -   Remove particle animation from connection links
    -   Improve connection arrow visibility
    -   Enhanced visuals with smoother node hover effects, shadowed nodes, and oceanic cluster backgrounds
-   Added a home page Agents Graph overview panel that shows the number of visible agents and servers, connection totals, folder-order links, and per-type counts so filtering feedback is immediate.
-   Removed `isOpen` prop from dialogs in Agents Server and implemented conditional rendering to prevent unnecessary background rendering when closed.
-   Added "Back to Agent" button to all agent-specific pages in Agents Server for better navigation.
-   Allow to pass `files` as `Array<File>` into `ChatPrompt`.
-   Implement file passing in `OpenAiExecutionTools` (currently supporting images via `image_url`).
-   Implemented `ChatPrompt.files` for `OpenAiAssistantExecutionTools`, allowing to attach files to OpenAI Assistants via the message attachments.
-   Add sample of passing files in OpenAI playground.
-   Support for generating images in Google LLM execution tools.
-   Fixed Google image generation in Agents Server to call the Gemini API directly when using Vercel providers.
-   Implemented tool calling when transpiling book into the code in `OpenAiSdkTranspiler`.
-   Added ESLint rule `no-magic-numbers` to the entire project (root and `agents-server`), configured to allow common semantically distinct numbers like -1, 0, 1, 2, 10, 60, 100, 1000.
-   Added prompt prioritization to the Codex prompt runner, honoring `[ ] !`, `[ ] !!`, `[ ] !!!` and grouping upcoming tasks by priority.
-   Filtered Codex prompt runner upcoming tasks to exclude prompts that still need authoring (`@@@`).
-   Added Cline CLI as a second agent runner in the coding agent script with `--agent <openai-codex|cline>` flag.
-   Added Claude code as a third agent runner in the coding agent script with `--agent <openai-codex|cline|claude-code>` flag.
-   Standardized runners of coding agent script to use temporary script files for robust prompt execution.
-   Reorganized the coding agent prompt runner script into runner-specific folders and shared utilities without behavior changes.
-   Implemented interactive chat animations triggered by emojis in agent messages:
    -   Added `ChatEffectsSystem` component with pluggable architecture for visual effects
    -   Implemented confetti animation effect for 🎉 emoji (particles falling from top)
    -   Implemented floating hearts animation effect for ❤️ and other heart emojis (hearts rising from bottom)
    -   Effects trigger only once per message even with multiple identical emojis
    -   Multiple different emojis in the same message trigger multiple effects simultaneously
    -   Effects only trigger for newly received agent messages (not user messages, not old messages on scroll)
    -   Decoupled effects logic with separate components for each effect type
    -   Easily extensible system for adding new effects in the future
    -   Integrated into all chat components: `<Chat/>`, `<LlmChat/>`, `<AgentChat/>`, `<MockedChat/>`
    -   Default effects configuration enabled in Agents Server chat interface
-   Implemented chat sound system with gentle, non-annoying audio feedback:
    -   Created `SoundSystem` class for managing chat sounds with localStorage persistence
    -   Implemented `ChatSoundSystem` interface for decoupled sound integration
    -   Added sound effects for message events:
        -   Subtle "whoosh" sound when user sends a message
        -   Soft "ding" sound when agent sends a message
        -   Light typing indicator sound when agent is thinking
    -   Added sound effects for button interactions (tap sound on all clickable buttons)
    -   Added sound effects for emoji-triggered visual effects:
        -   Celebratory sound for confetti effect (🎉)
        -   Gentle sound for hearts effect (❤️)
    -   Implemented sound settings toggle in the save menu (🔊/🔇) with localStorage persistence
    -   All sounds are:
        -   Gentle and professional (not jarring or annoying)
        -   Short duration (< 2 seconds)
        -   Configurable volume levels
        -   Can be muted by user
    -   Sound system is:
        -   Decoupled from Chat component (passed as prop)
        -   Scalable for future sound effects
        -   Follows best practices with separation of concerns
        -   Pluggable to all Chat implementations (`<Chat/>`, `<LlmChat/>`, `<AgentChat/>`, `<MockedChat/>`)
    -   Sound assets directory created at `apps/agents-server/public/sounds/` with documentation for required audio files
    -   Integrated into Agents Server via `AgentChatWrapper`
-   Enhanced `USE BROWSER` commitment with two-level browser access:
    -   Implemented `fetch_url_content` tool for one-shot URL content fetching and scraping
    -   Prepared `run_browser` tool for future complex browser interactions (scrolling, clicking, form filling)
    -   Agent can now fetch and scrape content from URLs including webpages and documents
    -   Integrated with existing scraper system (`WebsiteScraper`, `PdfScraper`)
    -   Added `fetchUrlContent` utility function to handle URL fetching and content conversion to markdown
    -   Updated tool titles and descriptions to distinguish between one-shot and running browser modes
    -   Tool functions properly integrated into commitment system via `getToolFunctions()`
    -   **Refactored for browser safety:**
        -   Created `/api/scrape` endpoint in Agents Server to proxy server-side scraping functionality
        -   Implemented `fetchUrlContentViaBrowser` wrapper that safely calls the API from browser environments
        -   Updated `USE_BROWSER` commitment to automatically detect environment and use appropriate implementation:
            -   Server-side (Node.js): Direct scraping via `fetchUrlContent`
            -   Browser: Proxy through Agents Server API via `fetchUrlContentViaBrowser`
        -   Added environment detection using `$isRunningInBrowser()` utility
        -   Prevents server-only code (marked with [🟢]) from being executed in browser packages
-   Implemented `USE EMAIL` commitment to enable agents to send emails:
    -   Created `UseEmailCommitmentDefinition` with support for optional additional instructions (e.g., "Write always formal and polite emails")
    -   Implemented `send_email` tool that integrates with the existing email queue system in Agents Server
    -   Tool supports sending emails with multiple recipients, CC, subject, and markdown-formatted body
    -   Added email capability chip to agent profiles showing "Email" with a mail icon
    -   Implemented email chiplet display showing the email subject when the tool is used
    -   Created interactive email details popup modal with Gmail-like UI showing:
        -   Email metadata (To, CC, Subject) in a styled header
        -   Full email body rendered as markdown in a clean, readable layout
        -   Tool call result showing success/failure status
    -   Email tool leverages existing `sendMessage` utility and email providers (Sendgrid, Zeptomail)
    -   All emails are queued through the database-driven message system
    -   Follows the same pattern as `USE TIME` and `USE SEARCH ENGINE` commitments for consistency
-   Implemented a new experimental app called **Story**, an interactive storytelling app where users orchestrate AI agents to collaboratively write a story.
    -   Added a new top-level menu group: **Experiments**, visible only when the `IS_EXPERIMENTAL_APP` metadata flag is enabled.
    -   The app supports two modes: **Beletrie Mode** (free narrative) and **Dramatic Mode** (dialogue).
    -   Users can manage multiple stories with a bookmarks/chapters-style UI.
    -   Stories are persisted per user across devices using a new extensible `UserData` table.
    -   Stories can be exported to plain text and Markdown, with a clear **Experimental** label.
-   Fixed `USE EMAIL` tool exposure to use commitment-provided functions with node/browser variants and updated the email tool modal to display sender metadata and status.
-   Enhanced agent-to-agent interaction chips in chat UI:
    -   Created reusable `<AgentChip/>` component displaying agent avatar and name
    -   Replaced generic "🤝 Consulting teammate..." text with agent-specific chips showing actual agent profile picture and name
    -   Removed displaying agent IDs (e.g., "TEoiVpZzBgTPUi") in favor of user-friendly agent names
    -   Agent chips automatically fetch agent profile data from both local and federated servers
    -   For ongoing consultations, chips display spinner animation with agent avatar and name
    -   For completed consultations, chips are clickable and show full team interaction details
    -   Implemented DRY principle with single reusable chip component inspired by `<AgentProfile/>`
    -   Works seamlessly with both same-server and federated agent interactions
    -   Added `teammates` prop to `<Chat/>` and `<ChatMessageItem/>` components to pass agent metadata
    -   Updated `getToolCallChipletInfo()` to return agent data along with display text
    -   Enhanced `TeamToolResult` type to include teammate URL and label information
-   Fixed teammate consultation chips to resolve agent names and avatars from team metadata and tool results, avoiding agent IDs in both ongoing and completed tool calls.
-   Enhanced team consultation modal design and UI:
    -   Simplified modal to show only `<MockedChat/>` component with the conversation between agents
    -   Agent profile pictures and names are now displayed through the existing `participants` prop of `<MockedChat/>`
    -   Removed "Teammate:" and "When to consult:" sections from the modal for cleaner design
    -   Display agent names instead of agent IDs (works with both local and federated agents)
    -   Added clickable agent name header that opens the agent page in a new window
    -   Modal now focuses on the actual conversation, making it easier to understand agent interactions
-   Improved TEAM tool call modal UX with linked participant header badges, avatar/name labels in the conversation, and a top-right close button.
-   Surfaced transitive teammate tool calls and source chips in Agents Server chat with "by teammate" suffixes, and listed those tool calls with inline details inside the TEAM modal.
-   Enhanced caching of GPT assistants created for agents on Agents Server:
    -   Created `AssistantCacheManager` class to centralize assistant lifecycle management
    -   Implemented `computeAssistantCacheKey` utility to compute cache keys based on assistant configuration
    -   Added `extractAssistantConfiguration` function to separate base agent config from dynamic context
    -   Supports two caching modes:
        -   Strict caching (default): includes full configuration including dynamic CONTEXT in cache key
        -   Enhanced caching: excludes dynamic CONTEXT from cache key for better reuse across similar agents
    -   Improved code maintainability and DRY principle by consolidating duplicate caching logic
    -   Made the system extensible for future configuration parameters (model, temperature, tools)
    -   Added detailed logging for cache hits and misses with cache keys
    -   Refactored `handleChatCompletion` to use the new `AssistantCacheManager`
-   Appended an 8-character assistant cache hash to GPT assistant names in Agents Server for clearer differentiation (e.g. `My Agent - abcd1234`).
-   Enhanced error handling for agent chat in Agents Server:
    -   Created centralized error message mapping utility (`errorMessages.ts`) following DRY principle:
        -   Categorizes errors into user-friendly categories (network, authentication, validation, rate limit, server error, timeout, etc.)
        -   Provides context-aware friendly error messages instead of raw technical errors
        -   Logs raw errors to console.error for debugging while showing user-friendly messages in UI
    -   Implemented `<ChatErrorDialog/>` component with retry functionality:
        -   Displays user-friendly error titles and messages in a modal dialog
        -   Shows retry button for recoverable errors (network issues, timeouts, server errors)
        -   Allows dismissing errors with cancel/close buttons
        -   Modern, polished UI with error icons and action buttons
    -   Added error handling support in `<LlmChat/>` component:
        -   Introduced optional `onError` prop to handle errors with custom logic
        -   Stores last failed message for retry functionality
        -   Provides retry callback to allow re-sending failed messages
        -   Maintains backward compatibility (errors still shown in chat if no handler provided)
    -   Integrated error handling in `AgentChatWrapper`:
        -   Uses `handleChatError` utility to categorize and format errors
        -   Displays `<ChatErrorDialog/>` with retry button for failed messages
        -   Automatically retries last failed message when user clicks retry button
    -   Improved user experience:
        -   Clear, actionable error messages instead of technical jargon
        -   Ability to retry failed operations without re-typing messages
        -   Consistent error handling across all chat interfaces
        -   Better debugging with raw errors logged to console
-   Moved the back button to the top menu bar in agent-specific pages (chat, book, etc.) using the existing hoisting mechanism for a cleaner and more consistent UI.
-   Fixed Agents Server back button menu hoisting to avoid a render loop that triggered "Maximum update depth exceeded" warnings.
-   Reduced number of capability chips in Agents Server:
    -   Grouped identical Knowledgebase chips together.
    -   Hid the `VOID` inheritance chip, showing only inheritance from other agents.
-   Limited capability chips on Agents Server cards and profiles with priority ordering and grouped knowledge/PDF sources to reduce chip overload.
-   Enhanced RAG source citation display in Agents Server chat:
    -   Replaced ugly OpenAI annotation format `【5:13†document.pdf】` with native Promptbook chips
    -   Created `<SourceChip/>` component displaying source document with file icon and citation ID
    -   Citations now appear as clickable chips below messages (similar to `USE SEARCH ENGINE` commitment)
    -   Implemented citation preview modal with:
        -   Source document name and citation ID
        -   Optional URL link to the source document
        -   Document excerpt/preview when available
        -   Clean, user-friendly UI matching existing tool call modals
    -   Added `citations` field to `ChatMessage` type for storing RAG source annotations
    -   Implemented `parseCitationsFromContent` utility to extract citations from message content
    -   Citation references in text are now rendered as numbered superscripts `[5:13]` instead of full annotations
    -   Follows DRY principle by reusing existing modal styles and chip patterns
    -   Integrated seamlessly with existing chat UI and tool call chip system
-   Enhanced document preview in Agents Server chat:
    -   Clicking on a `KNOWLEDGE` source chip now opens a document preview in an iframe (e.g. for PDFs).
    -   Added a "Download" button to the source preview modal.
    -   Automatically detects URLs in source names if explicit URL is missing.
    -   Improved fallback messaging when no preview is available.
    -   Moved close button to the top right corner with 'X' icon for better UX.
    -   Relaxed URL validation to allow previewing documents from relative paths or filenames.
    -   Ensured download button is available when source is present.
-   Added missing sound files to the Agents Server's public directory.
-   Enhanced the UI of the chips of `TEAM` commitment to show agent profile picture and name instead of ID in agent lists and profile pages.
-   Rendered chat chip emojis (tool calls and source citations) with the OpenMoji color font in Agents Server.
-   Migrate `Agent` class and all related classes from using OpenAI Assistants API to OpenAI Responses API.
    -   `KNOWLEDGE` works as before.
    -   Tool calling works as before.
    -   Caching of the agents and underlying assistants works as before.
    -   It works in the `Agents Server` application `/apps/agents-server`.
    -   All existing features work as before.
    -   Kept `OpenAiAssistantExecutionTools`, marked as deprecated and not used in `Agent`.
-   Fixed document preview and download in Agents Server chat:
    -   Resolved issue where source URLs with query parameters (e.g. from blob storage) were not matched correctly, preventing previews.
    -   Fixed download button for cross-origin files by implementing a fetch-and-download mechanism to bypass browser restrictions on `download` attribute.
-   Improve the chat UI responsiveness by allowing user interaction (sending messages) while waiting for the agent reply.
-   Fixed tool-call chip styling so the chips keep their natural casing/spacing while the tool-call modal uses a dedicated `toolCallModalLabel`, keeping both places readable.
-   Fixed document preview modal for KNOWLEDGE sources in Agents Server chat:
    -   Resolved issue where document preview was showing "Agent Not Found" error due to invalid URL resolution
    -   Fixed preview to only load when a valid URL is available (checks for http:// or https://)
    -   Removed technical clutter (Citation ID, Source, URL fields) from the modal for a cleaner user experience
    -   Redesigned download button with modern styling matching the application's design system
    -   Added proper error handling when preview is unavailable, showing a user-friendly message
    -   Simplified modal header to show only document name (without file extension) for better readability
-   Fixed image generation caching to consider all generation parameters (model, size, quality, style) in the cache key, ensuring that changing these parameters generates a new image instead of returning a cached one from a previous generation with different settings.
-   Fixed image generation caching to include input images (attachments) in the cache key, ensuring that using the same prompt with different input images generates new results.
-   Improved self-learning experience in `Agent` class:
    -   The agent now returns the generated answer immediately before starting the self-learning process.
    -   Self-learning is performed asynchronously in the background.
    -   A "Self learning" chip is displayed during the learning phase, similar to tool usage chips.
    -   This enhances user experience by eliminating the wait time for self-learning completion.
-   Enhanced codebase by using explicit types instead of type inference across multiple files in `src/`, `apps/`, and `scripts/` directories to improve readability and maintainability.
-   Fix width of the message in the chat by adding a minimum width and improving layout for short messages.
-   Use model `gemini-3-pro-image-preview` for the agent of Avatar Images
-   Updated `openai` from `4.63.0` to `6.18.0` and fixed all resulting type errors.
-   Resolved `zod` peer dependency conflicts between `@ai-sdk/deepseek` and `@openai/agents` by using `overrides` in `package.json`.
-   Fixed `node-fetch` declaration issue in `LindatAutomaticTranslator.ts` by using native `URLSearchParams` and removing `node-fetch` import.
-   Stabilized Agents Server under low traffic by removing constant 5-second DB polling from timeout/preparation workers, restoring durable timeout wake-ups through Vercel cron, fixing agent-source cycle detection across canonical/name URLs, and reducing agent-reference resolver churn.
-   Logged richer durable diagnostics for failed Agents Server chat turns so admin task inspection no longer stops at the generic lease-expired summary:

    -   Added backwards-compatible `failureDetails` storage for `UserChatJob` rows and now persist structured JSON diagnostics containing the failure summary, serialized error payload (message/name/stack when available), provider, timing, and chat-turn identifiers.
    -   Reused the same diagnostics builder for runtime failures, unexpected worker-route failures, and expired-lease recovery paths to keep failure logging DRY and consistent.
    -   Extended the admin task manager to surface the stored diagnostics under failed chat-completion tasks via an expandable "Show details" panel in the Last error column.

-   Refactored Agents Server `apps/agents-server/src/app/agents/[agentName]/api/chat/route.ts` into smaller focused private chat-route helpers without changing external behavior:

    -   Moved request-time runtime assembly, disclaimer and credential resolution, history initialization, and frozen team-member chat persistence behind the private `resolveAgentChatRouteContext` and `createTeamMemberFrozenChatPersistence` facades so `route.ts` now reads as a thin HTTP entrypoint.
    -   Extracted the long-lived markdown stream orchestration, cancellation handling, tool-call framing, and final post-processing into the private `createAgentChatStreamResponse` helper while preserving the existing stateless chat streaming behavior, keep-alives, history recording, learning, and calendar activity logging.

-   Enhanced the Agents Server new-agent wizard team step so it now behaves as a homepage-style multi-select picker:

    -   Removed the separate manual "Team members" entry UI and kept only the existing-agents picker headed by "Browse existing agents" / "Vyberte existující agenty".
    -   Kept multi-selection for teammate agents across the local server and federated servers while continuing to exclude the hidden core server from federated lists.
    -   Extracted a shared homepage-like `AgentCardsSection` renderer so the wizard and federated-agent surfaces reuse the same card-grid, loading, empty, and error presentation.

-   Improved Agents Server expired chat-worker diagnostics so the stale "Background worker lease expired before the chat turn finished." failure now leaves actionable evidence instead of a generic summary:

    -   Added shared expired-lease diagnostics for durable chat jobs that record queue/run/heartbeat timing, worker runtime thresholds, configured server limits, and a snapshot of active chat jobs and timeouts at the moment recovery runs.
    -   Started logging structured `lease_expired` recovery/reconciliation events so server logs show which background tasks were active and whether the job had already outlived the 300-second worker route limit when heartbeats stopped.

-   Added immediate optimistic profile-to-chat navigation in Agents Server, so starting a first message from an agent profile now swaps to the chat route without waiting for the server and keeps the user bubble visible throughout the handoff:

    -   Persisted profile-to-chat optimistic turn metadata across the route transition, including the client message id reused later for canonical reconciliation and failure states.
    -   Added a chat-route loading surface that renders the pending user turn right away while the standalone chat page server data is still loading.
    -   Tightened optimistic/canonical merge ordering so unresolved user bubbles stay ahead of later assistant streaming messages until the server confirms them.

-   Added the new deterministic `AsciiOctopus` avatar visual alongside the existing avatar set, with an animated ASCII-art rendering that keeps the same organic alien octopus feel as `Octopus3` while varying its blob silhouette, tentacle count, face, and colors from the agent name, hash, colors, and animation time:

    -   Added the new built-in `ascii-octopus` canvas renderer to the shared avatar registry without changing the existing `Octopus`, `Octopus2`, `Octopus3`, pixel-art, Minecraft, or Fractal visuals.
    -   Kept the implementation DRY by reusing shared octopus body and tentacle geometry helpers, while translating that geometry into deterministic ASCII glyphs instead of painted surfaces.
    -   Updated the existing utils `/avatars` playground and regression coverage so the new renderer appears in the selector, preview grid, deterministic sample gallery, and supported URL-state parsing without creating a separate page.

-   Fixed Agents Server metadata enum handling so predefined metadata keys no longer accept arbitrary strings in `/admin/metadata`:

    -   Added shared metadata definitions with reusable predefined option lists, so enum-like metadata such as `DEFAULT_AGENT_AVATAR_VISUAL`, `SERVER_LANGUAGE`, `SERVER_VISIBILITY`, `CHAT_FEEDBACK_MODE`, `CHAT_VISUAL_MODE`, `NAME_POOL`, `DEFAULT_VISIBILITY`, and `NEW_AGENT_WIZZARD` now render as selects instead of free-form text inputs.
    -   Reused the same option registries across the metadata page and existing server-creation flows to keep enum values centralized and DRY.
    -   Added server-side validation for predefined metadata options, so invalid enum values are rejected even when `/api/metadata` is called directly.
