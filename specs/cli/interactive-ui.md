# Interactive and noninteractive CLI experience

[Main specification](../_main.md)

Every CLI workflow separates interactive presentation/input from noninteractive execution. Interactivity is not the command's lifetime: init is a finite wizard; run is finite execution; start is an ongoing supervisor. Process placement is defined separately in [process modes](process-modes.md).

## Modes

Interactive use prioritizes a polished, coherent terminal interface, not a stream of internal messages. Init and finite commands use it by default when a suitable terminal is attached. Explicit `--interactive` requests it; `--non-interactive` disables terminal prompts. Raw/no-UI operation is noninteractive. Diagnose incompatible choices or an explicitly requested interactive mode without a usable terminal.

Noninteractive use accepts choices in advance through CLI flags and [project configuration](configuration.md), including initialization decisions. It emits readable plain output without cursor-control sequences and never waits for hidden input. Missing required decisions produce an actionable unsuccessful result; ongoing human requests use [channels](channels.md). Do not turn an interactive default into unattended consent for installation, self-update or nested-repository changes; declared automatic harness-update policy is separate.

## Two UI patterns

**Wizard:** Init presents a clear beginning, current step, visible defaults, progress through setup and a final outcome. Group related choices, support going back before applying them and make cancellation safe. Update the current view instead of flooding terminal scrollback. Summarize what changed, what was already ready and what remains unresolved.

**Dashboard:** Start and run share the [terminal dashboard](terminal.md). It represents live state, not a form or a sequence of setup questions. Start has no completion countdown; run ends with a truthful outcome for its finite queue. Setup required before execution uses the wizard, then hands over to the appropriate runtime presentation.

## Predefined choices

When a prompt offers a fixed set of answers, present selectable options rather than requiring the user to type a label, identifier, number or comma-separated list. This applies throughout the wizard and runtime requests, including yes/no confirmations, destination and installation choices, browser settings, harness selection and update decisions. Use descriptive labels; internal identifiers remain an implementation detail of the selection.

Single-choice prompts show the available options, the focused option and any default. Arrow keys move focus and Enter confirms the focused option. A declared default is initially focused, so Enter accepts it without typing. Merely focusing, displaying or cancelling a default never accepts it.

Multiple-choice prompts show checkbox-style selection, keeping focus distinct from selected state. Arrow keys move focus, Space toggles the focused option and Enter confirms the selected set. Where choosing none is allowed, make that outcome clear and permit confirming the empty set. Explain any minimum selection requirement before confirmation and retain the selection when validation fails.

Show the applicable keys beside the control. Esc cancels the prompt or returns to an available preceding step without applying the unconfirmed selection. Provide pointer selection where the surface supports it, with complete keyboard operation everywhere. While a picker has focus, its navigation and selection keys belong to that picker rather than dashboard shortcuts.

Large catalogs use the [featured/More presentation](harness-plugins.md) with selectable browsing actions. More, paging and returning must not require typing command words; preserve selected items across catalog views. Optional search may use text entry, but all choices remain reachable without typing their identifiers. Freeform input such as project intent, a new folder name or an explicit profile path still uses the text composer.

Keep focused and selected options visible and readable during output updates and terminal resize, including narrow terminals. Scroll or page a bounded list rather than losing options or controls. Background logs must not corrupt the picker or reset its state; distinguish focus and selection without relying on color alone. These controls do not change CLI flags, configuration values or the noninteractive requirement to supply decisions in advance.

## Text entry and accessibility

Every interactive text entry, including project intent, planning, task descriptions and answers, uses the same high-quality input experience, inspired by the Codex terminal composer. Provide a clearly bounded, labeled field, visible focus/cursor, comfortable editing, multiline entry, paste that does not accidentally submit, and discoverable submit/newline/cancel actions. Support pointer focus and caret positioning where the terminal permits, with complete keyboard operation everywhere.

Preserve drafts during output updates, validation errors and resize. Background logs must not corrupt input. Keep spacing, hierarchy, wrapping and contrast readable; do not rely on color alone. Adapt to narrow or limited terminals without losing content or controls. This is an observable UX contract, not a prescribed terminal library or widget implementation.
