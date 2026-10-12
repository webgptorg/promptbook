# Help, about and version

[Main specification](../_main.md)

## Command-scoped help

Bare `ptbk`, `ptbk help` and `ptbk --help` show the same top-level overview. It explains the tool, ordinary workflow, command groups and common options without expanding every command's full reference. `ptbk about` gives a short product/engine overview.

For any supported command or nested subcommand path, `<path> --help`, `<path> help` and `ptbk help <path without ptbk>` show help only for that command path. For example, `ptbk init --help`, `ptbk init help` and `ptbk help init` are equivalent; `ptbk start --help` describes start, not the entire CLI. Apply the same rule to dashboard, add and every other command, including aliases and supported nested subcommands.

Scoped help shows the full invocation, its purpose, relevant arguments/options and defaults, applicable inherited options, immediate subcommands if any, and useful examples for that scope. It must not repeat unrelated commands or options belonging to other workflows. Offer a brief way back to broader help instead of dumping it. Unknown command paths produce a concise scoped diagnostic and guidance, not successful top-level help. Usage errors point to the affected command's help.

Resolve help before operation-specific required inputs, project/readiness checks or service startup. Asking for `start --help` never starts a service, and `init help` never launches a wizard. Normal invocation without a help request retains the command's defined behavior.

## Pretty and raw presentation

Help uses the same [presentation contract](interactive-ui.md) as other commands. On a suitable terminal, pretty is the default: a designed, scannable document with semantic terminal colors, emphasis, clear sections, aligned options, readable spacing and wrapping. It is a one-shot document, not a live dashboard or interactive wizard; it does not wait for dismissal.

`--raw` gives conventional plain CLI help without color, decoration, cursor-control sequences or prompts. Redirection or an unsuitable terminal falls back to this form. Pretty and raw expose the same relevant meaning, syntax, defaults and examples at the same scope; color suppression or a narrow terminal must not hide information.

Clearly distinguish presentation/input policy, daemon versus foreground operation, temporary flags and saved configuration. Explain whether relevant runtime settings are live-adjustable or require restart. Do not dump the harness registry, provider configuration, model catalogs or internal objects. When a harness overview is useful, show only featured names and a route to More or detailed help, following [harness presentation](harness-plugins.md).

## Version and side effects

Show the actual running Promptbook engine version in bare/help/about output, at the beginning of every wizard and persistently in runtime dashboards. Obtain it from the invoked installation, never a hard-coded label, registry latest version or another local/global installation. `--version` provides the same version directly. An attached terminal or browser dashboard shows the inspected service's version, not a client's assumed version.

Help/about/version work offline and without an initialized project or running daemon. They never initialize projects, check for updates, install tools, authenticate, call models, modify Git or change service state.
