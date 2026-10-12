# Help, about and version

[Main specification](../_main.md)

Bare `ptbk` and `ptbk --help` show the same useful top-level help; they do not start work or launch a setup prompt. `ptbk about` gives a short product/engine overview. Every command's help follows the same presentation principles.

Show the actual running Promptbook engine version in bare/help/about output, at the beginning of every wizard and persistently in the runtime dashboard. Obtain it from the invoked installation, never a hard-coded label, registry latest version or another local/global installation. `--version` provides the same version directly. A page inspecting a process shows that process's engine version.

Help is a designed, scannable document: product/version heading, brief purpose, usage, grouped commands/options, important defaults and a few useful examples. Put detailed options in command-specific help. Clearly distinguish interactive/noninteractive behavior, temporary flags and saved configuration. Explain whether relevant runtime settings are live-adjustable or require restart.

Do not dump the harness registry, provider configuration, model catalogs or internal objects. When a harness overview is useful, show only featured names and an obvious route to More or detailed help, following [harness presentation](harness-plugins.md). Additional details are opt-in.

Use readable spacing, alignment and wrapping, with optional emphasis on capable terminals and equally useful plain text when redirected. Help/about/version work offline and never initialize projects, check for updates, install tools, authenticate, call models or modify Git. See [interactive UI](interactive-ui.md).
