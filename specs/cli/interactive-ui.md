# Interactive and noninteractive CLI experience

[Main specification](../_main.md)

Every CLI workflow separates interactive presentation/input from noninteractive execution. Interactivity is not the command's lifetime: init is a finite wizard; run is finite execution; start is an ongoing supervisor. Process placement is defined separately in [process modes](process-modes.md).

## Modes

Interactive use prioritizes a polished, coherent terminal interface, not a stream of internal messages. Init and finite commands use it by default when a suitable terminal is attached. Explicit `--interactive` requests it; `--non-interactive` disables terminal prompts. Raw/no-UI operation is noninteractive. Diagnose incompatible choices or an explicitly requested interactive mode without a usable terminal.

Noninteractive use accepts choices in advance through CLI flags and [project configuration](configuration.md), including initialization decisions. It emits readable plain output without cursor-control sequences and never waits for hidden input. Missing required decisions produce an actionable unsuccessful result; ongoing human requests use [channels](channels.md). Do not turn an interactive default into unattended consent for installation, self-update or nested-repository changes; declared automatic harness-update policy is separate.

## Two UI patterns

**Wizard:** Init presents a clear beginning, current step, visible defaults, progress through setup and a final outcome. Group related choices, support going back before applying them and make cancellation safe. Update the current view instead of flooding terminal scrollback. Summarize what changed, what was already ready and what remains unresolved.

**Dashboard:** Start and run share the [terminal dashboard](terminal.md). It represents live state, not a form or a sequence of setup questions. Start has no completion countdown; run ends with a truthful outcome for its finite queue. Setup required before execution uses the wizard, then hands over to the appropriate runtime presentation.

## Text entry and accessibility

Every interactive text entry, including project intent, planning, task descriptions and answers, uses the same high-quality input experience, inspired by the Codex terminal composer. Provide a clearly bounded, labeled field, visible focus/cursor, comfortable editing, multiline entry, paste that does not accidentally submit, and discoverable submit/newline/cancel actions. Support pointer focus and caret positioning where the terminal permits, with complete keyboard operation everywhere.

Preserve drafts during output updates, validation errors and resize. Background logs must not corrupt input. Keep spacing, hierarchy, wrapping and contrast readable; do not rely on color alone. Adapt to narrow or limited terminals without losing content or controls. This is an observable UX contract, not a prescribed terminal library or widget implementation.
