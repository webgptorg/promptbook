# CLI presentation and interaction

[Main specification](../_main.md)

Keep presentation, interaction, command lifetime and process placement separate. A polished one-shot result is not interactive; a dashboard is not a setup form; a long-running daemon does not require a long-running launching terminal. [Process modes](process-modes.md) define lifecycle independently. [Initialization UX](initialization-ui.md) and the [rich composer](rich-input.md) specialize this shared presentation contract without embedding visual requirements in functional setup rules.

## Pretty and raw presentation

Every command, including help and lifecycle commands, defaults to pretty presentation on a suitable terminal. Make it a designed terminal UI, not merely colored log lines: use semantic colors, emphasis, panels, aligned summaries/tables, clear status indicators and rich selection/input controls where useful. Maintain a coherent visual hierarchy and discoverable actions across commands. Richness must improve readability rather than add decoration or invent progress.

`--raw` requests conventional readable plain output without color, decorative layout, cursor-control sequences, animated updates or terminal prompts. `--no-ui`, where supported, follows this contract. Redirected output or an unsuitable terminal falls back to raw. Presentation changes do not select foreground/background operation, attach a dashboard or alter the requested operation.

`--interactive` explicitly requests the interaction appropriate to the command; `--non-interactive` forbids terminal questions and keyboard controls. Neither turns a one-shot command into a live dashboard. Diagnose contradictory options, such as raw plus explicit interactive input, or an explicitly requested interactive experience without a usable terminal.

Noninteractive use accepts choices in advance through CLI flags and [project configuration](configuration.md), including initialization decisions. It never waits for hidden input. Missing required decisions produce an actionable unsuccessful result; ongoing human requests use [channels](channels.md). Do not turn defaults into unattended consent for installation, self-update or nested-repository changes; declared automatic harness-update policy is separate.

## Four UI patterns

**Wizard — init and add:** A finite, step-by-step form with a clear beginning, current step, visible defaults, progress and final outcome. Group related choices, support going back before applying them and make cancellation safe. Update the current view instead of flooding scrollback. Init's dedicated [experience](initialization-ui.md) specifies intent-first input, step X of Y, the Expert guide, a Traces screen and a restrained success celebration. It ends after technical setup and confirmed background start; it never becomes an attached dashboard or waits for bootstrap completion. Interactive `ptbk add` guides task creation using the shared composer and relevant template/priority choices, reuses supplied inputs and confirms the task before saving. Cancelling before confirmation creates no task. It retains noninteractive description/stdin/template input and never calls a model or executes the task.

**Dashboard — dashboard and foreground execution:** `ptbk dashboard` continuously observes and controls an existing project service through the [terminal dashboard](terminal.md). It is a living status view with keyboard controls, not a sequence of form steps, and has no predefined completion or overall step count. Explicit foreground start uses the same view; interactive run shares it but ends with a truthful finite-queue outcome. Setup needed before execution is a distinct wizard phase. Opening or closing a monitoring client does not advance or stop the service's work.

**Chat — `ptbk chat` and dashboard/browser conversations:** A persistent named Book thread has a one-agent picker for new user-led chats, chronological attributed messages, a rich composer and related-task links. The dashboard's attention action opens the same existing conversation that an agent initiated, not another form. `ptbk chat` starts directly without a dashboard; Ctrl+C leaves only that terminal client. [Chat UX](chat-ui.md) defines unread, waiting and all-chats navigation.

**One-shot result — start, stop, restart and inspection:** For a ready project, lifecycle commands perform their operation, render one well-designed result and return the terminal. Status/show, help and similar finite informational commands likewise render once. Show the relevant project, outcome, current status and useful next actions; do not enter a refresh loop, wait for dismissal or automatically attach the dashboard. An explicitly permitted setup wizard may precede start's final result. Pretty presentation is required here too, but keyboard interaction is not.

## Predefined choices

When a prompt offers a fixed set of answers, present selectable options rather than requiring the user to type a label, identifier, number or comma-separated list. This applies throughout the wizard and chat messages offering predefined choices, including yes/no confirmations, destination and installation choices, browser and trace settings, harness selection and update decisions. Use descriptive labels; internal identifiers remain an implementation detail of the selection.

Single-choice prompts show the available options, the focused option and any default. Arrow keys move focus and Enter confirms the focused option. A declared default is initially focused, so Enter accepts it without typing. Merely focusing, displaying or cancelling a default never accepts it.

Multiple-choice prompts show checkbox-style selection, keeping focus distinct from selected state. Arrow keys move focus, Space toggles the focused option and Enter confirms the selected set. Where choosing none is allowed, make that outcome clear and permit confirming the empty set. Explain any minimum selection requirement before confirmation and retain the selection when validation fails.

Show the applicable keys beside the control. Esc cancels the prompt or returns to an available preceding step without applying the unconfirmed selection. Provide pointer selection where the surface supports it, with complete keyboard operation everywhere. While a picker has focus, its navigation and selection keys belong to that picker rather than dashboard shortcuts.

Large catalogs use the [featured/More presentation](harness-plugins.md) with selectable browsing actions. More, paging and returning must not require typing command words; preserve selected items across catalog views. Optional search may use text entry, but all choices remain reachable without typing their identifiers. Freeform input such as project intent, a new folder name or an explicit profile path still uses the text composer.

Keep focused and selected options visible and readable during output updates and terminal resize, including narrow terminals. Scroll or page a bounded list rather than losing options or controls. Background logs must not corrupt the picker or reset its state; distinguish focus and selection without relying on color alone. These controls do not change CLI flags, configuration values or the noninteractive requirement to supply decisions in advance.

## Text entry and accessibility

Every interactive text entry, including project intent, planning, task descriptions and answers, uses the same high-quality [rich composer](rich-input.md), inspired by Codex and Claude Code terminal input. Provide a clearly bounded, labeled field, visible focus/cursor, comfortable editing, multiline entry, paste that does not accidentally submit, and discoverable submit/newline/cancel actions. Long pasted blocks and attachments use inspectable compact tokens while retaining their full payload. Support pointer focus and caret positioning where the terminal permits, with complete keyboard operation everywhere.

Preserve drafts during output updates, validation errors and resize. Background logs must not corrupt input. Keep spacing, hierarchy, wrapping and contrast readable; do not rely on color alone. Adapt to narrow or limited terminals without losing content or controls. Respect terminal color capabilities, color suppression and reduced motion without losing meaning. This is an observable UX contract, not a prescribed terminal library or widget implementation.
