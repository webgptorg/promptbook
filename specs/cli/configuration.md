# Project configuration and precedence

[Main specification](../_main.md)

`ptbk.json` in the selected project directory is the human-readable, Git-versioned configuration for Promptbook. It describes project choices, not machine runtime state. `.ptbk/` remains Git-ignored runtime storage; it is not the configuration file. Task audit evidence lives separately in root-level `traces/`, with recording and Git inclusion controlled by this configuration.

Resolve each supported setting in this order, from lowest to highest priority:

1. Engine defaults, usable without a configuration file.
2. Values explicitly stored in the selected project's `ptbk.json`.
3. Explicit CLI flags for this invocation.

Omitted values inherit; explicit false, empty or disabled values must not be mistaken for omission. Legacy `PTBK_HARNESS`, `PTBK_MODEL` and `PTBK_THINKING_LEVEL` fill otherwise unspecified defaults before project settings, never override `ptbk.json` or CLI flags. Environment-provided credentials are secret inputs, not another project configuration file.

Configuration covers enabled harnesses and their non-secret setup, routing/model preferences, one browser configuration (including portable profile-source selection and independent headless/headful mode), [trace settings](trace-configuration.md) and supported operating/update policies. Multiple harnesses and the single browser are independent settings. A task's explicit requirements remain constraints, not lower-priority defaults to overwrite.

Save `traces.commit`, `traces.ignoreVideos` and `traces.recordVideo` from initialization's Traces step. These distinguish Git inclusion of all traces, exclusion of video, and actual browser recording. Preserve stored false values and explain effective precedence when the whole trace tree is ignored. Their defaults and ignore rules are defined only in [trace configuration](trace-configuration.md), not independently by individual harnesses.

Remote HTTP exposure follows [tunnel configuration](remote-access.md): default enabled when HTTP runs, provider selection and non-secret options are discoverable and can be saved, while `--no-tunnel`/`--tunnel` and `--tunnel-provider` override this invocation. No-server suppresses implicit tunneling. Save credential references rather than provider tokens, pairing links or device sessions. Generated ephemeral URLs and tunnel processes are runtime state, not versioned defaults.

Resolve project-scoped paths in the file relative to its project; resolve CLI paths relative to the invocation directory. A selected **Promptbook-managed global** browser profile is a source kind, not a project-relative or Git-versioned absolute machine path: resolve it in the current OS user's Promptbook application-data directory. Project-isolated, user-existing and custom-path profiles remain explicit alternatives. See [browser](browser.md). Do not inherit another project's configuration merely because it is an ancestor or contains the installation. Diagnose invalid settings before affected work, with their location; do not silently fall back after a configuration error.

CLI overrides do not rewrite `ptbk.json`. Live control changes are temporary unless explicitly saved. A confirmed save of versioned settings is an [authoring operation](authoring.md), committed by default; temporary control changes need no commit. Recovery may retain a running process's effective settings; a new independent invocation resolves its own configuration. Show effective settings and their sources on request, without secrets. Init's automatic start preserves applicable explicit overrides for that workflow rather than resolving a contradictory service configuration.

Check setup is an explicit configuration operation: when the default validation is missing or invalid, a confirmed setup choice or `init --check COMMAND` saves its replacement. Existing valid defaults remain intact; other commands' `--check` flags and an init override of valid validation remain temporary.

Store credential references, not API keys, login tokens or browser sessions. New unconfigured projects default to the dedicated reusable global Promptbook browser profile; reinitialization preserves an already selected profile kind and sessions. Machine-specific paths can be supplied as temporary overrides. Initialization preserves existing choices and adds only missing required settings. See [initialization](initialization.md), [harnesses](harnesses.md), [browser](browser.md) and [controls](controls.md).
