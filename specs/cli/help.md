# Help, about and version

[Main specification](../_main.md)

## Bare-command picker

Bare interactive `ptbk` detects the selected working directory's initialization and verified engine ownership before presenting **exactly two choices**. The first choice is focused by default; **Open help is always second**.

| Selected directory | First choice (default) | Second choice |
| --- | --- | --- |
| Not initialized as a Promptbook project | Initialize project (`ptbk init`) | Open help (`ptbk help`) |
| Initialized, with no active engine | Start project (`ptbk start`) | Open help (`ptbk help`) |
| Initialized, with an active engine | Open dashboard (`ptbk dashboard`) | Open help (`ptbk help`) |

Use the ordinary [project selection](workspace.md), defaulting to the invocation's CWD and honoring an explicit `--path`. A nonempty directory may still be uninitialized; missing/disabled tools alone do not make an initialized project uninitialized. Verify the actual owner across installations and equivalent paths. An engine in `pausing`, `pause` or `stopping` still exists and receives the dashboard choice, not another start/restart. Unknown/unreachable ownership is diagnosed rather than assumed stopped.

Never show all three lifecycle choices together, offer restart as another picker item or make Help the initial selection. Show version/project context without starting, initializing, migrating or otherwise changing anything. Enter invokes only the focused choice through its existing workflow; cancellation has no side effects. Revalidate relevant state before acting so a concurrent start cannot create a duplicate engine. Successful interactive start opens the dashboard by default whether selected here or invoked directly, using the same [handoff and opt-outs](process-modes.md).

Without interactive input, bare invocation shows technical top-level help without a prompt.

## Command-scoped help

`ptbk help` and `ptbk --help` always show technical command reference: ordinary workflow, command groups, relevant flags/defaults and scoped usage. They do not enter the action menu. `ptbk about` gives a visually designed compact product box with Promptbook name, actual engine version, purpose and [ptbk.io](https://www.ptbk.io/), rather than another dump of command options. Raw about retains that information in plain text.

The about introduction and the short help banner follow the shared [product presentation](../concepts/product-presentation.md): ongoing autonomous agendas and ownership of the engine, files and execution choices. About introduces the self-hosted engine first and links to the complete product and GitHub. It can mention the upcoming application while making clear that the current engine dashboard/API is local to its host. Pretty and raw use the same authored product copy; engine version and installation details remain derived from the invoked installation.

For any supported command or nested subcommand path, `<path> --help`, `<path> help` and `ptbk help <path without ptbk>` show help only for that command path. For example, `ptbk init --help`, `ptbk init help` and `ptbk help init` are equivalent; `ptbk start --help` describes start, not the entire CLI. Apply the same rule to dashboard, chat, ask, answer, add and every other command, including aliases and supported nested subcommands.

Scoped help shows the full invocation, its purpose, relevant arguments/options and defaults, applicable inherited options, immediate subcommands if any, and useful examples for that scope. It must not repeat unrelated commands or options belonging to other workflows. Offer a brief way back to broader help instead of dumping it. Unknown command paths produce a concise scoped diagnostic and guidance, not successful top-level help. Usage errors point to the affected command's help.

Resolve help before operation-specific required inputs, project/readiness checks or service startup. Asking for `start --help` never starts a service, and `init help` never launches a wizard. Normal invocation without a help request retains the command's defined behavior.

## Pretty and raw presentation

Help uses the same [presentation contract](interactive-ui.md) as other commands. On a suitable terminal, pretty is the default: a designed, scannable document with semantic terminal colors, emphasis, clear sections, aligned options, readable spacing and wrapping. It is a one-shot document, not a live dashboard or interactive wizard; it does not wait for dismissal.

`--raw` gives conventional plain CLI help without color, decoration, cursor-control sequences or prompts. Redirection or an unsuitable terminal falls back to this form. Pretty and raw expose the same relevant meaning, syntax, defaults and examples at the same scope; color suppression or a narrow terminal must not hide information.

Clearly distinguish presentation/input policy, daemon versus foreground operation, temporary flags and saved configuration. Explain whether relevant runtime settings are live-adjustable or require restart. Do not dump the harness registry, provider configuration, model catalogs or internal objects. When a harness overview is useful, show only featured names and a route to More or detailed help, following [harness presentation](harness-plugins.md).

## Version and side effects

Show the actual running Promptbook engine version in bare/help/about output, at the beginning of every wizard and persistently in runtime dashboards. Obtain it from the invoked installation, never a hard-coded label, registry latest version or another local/global installation. `--version` provides the same version directly. An attached terminal or browser dashboard shows the inspected service's version, not a client's assumed version.

Help/about/version and displaying the bare action menu work offline and without an initialized project or running daemon. They never initialize projects, check for updates, install tools, authenticate, call models, modify Git or change service state.
