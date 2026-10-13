# Project configuration and precedence

[Main specification](../_main.md)

`ptbk.json` in the selected project directory is the human-readable, Git-versioned configuration for Promptbook. It describes project choices, not machine runtime state. `.ptbk/` remains Git-ignored runtime storage; it is not the configuration file.

Resolve each supported setting in this order, from lowest to highest priority:

1. Engine defaults, usable without a configuration file.
2. Values explicitly stored in the selected project's `ptbk.json`.
3. Explicit CLI flags for this invocation.

Omitted values inherit; explicit false, empty or disabled values must not be mistaken for omission. Legacy `PTBK_HARNESS`, `PTBK_MODEL` and `PTBK_THINKING_LEVEL` fill otherwise unspecified defaults before project settings, never override `ptbk.json` or CLI flags. Environment-provided credentials are secret inputs, not another project configuration file.

Configuration covers enabled harnesses and their non-secret setup, routing/model preferences, one browser configuration and supported operating/update policies. Multiple harnesses and the single browser are independent settings. A task's explicit requirements remain constraints, not lower-priority defaults to overwrite.

Resolve paths in the file relative to its project; resolve CLI paths relative to the invocation directory. Do not inherit another project's configuration merely because it is an ancestor or contains the installation. Diagnose invalid settings before affected work, with their location; do not silently fall back after a configuration error.

CLI overrides do not rewrite `ptbk.json`. Live control changes are temporary unless explicitly saved. Recovery may retain a running process's effective settings; a new independent invocation resolves its own configuration. Show effective settings and their sources on request, without secrets.

Check setup is an explicit configuration operation: when the default validation is missing or invalid, a confirmed setup choice or `init --check COMMAND` saves its replacement. Existing valid defaults remain intact; other commands' `--check` flags and an init override of valid validation remain temporary.

Store credential references, not API keys, login tokens or browser sessions. Machine-specific paths can be supplied as temporary overrides. Initialization preserves existing choices and adds only missing required settings. See [initialization](initialization.md), [harnesses](harnesses.md), [browser](browser.md) and [controls](controls.md).
