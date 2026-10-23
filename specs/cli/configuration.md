# Project configuration and precedence

[Main specification](../_main.md) · [Configuration migrations](configuration-migrations.md) · [Tools](tools.md) · [Naming](../coding-standards/naming.md)

`ptbk.json` in the selected project directory is the human-readable, Git-versioned configuration for Promptbook. It describes project choices, not machine runtime state. There is no user-level Promptbook settings file shared across projects: references to global configuration mean this project-wide file. Shared executable/native login stores and reusable browser profiles are resources, not another Promptbook configuration layer. `.ptbk/` remains ignored runtime storage; task evidence lives separately in root-level `traces/`. The root includes `promptbookVersion`, ordered `tools` and `isAutoSync` (default false).

`promptbookVersion` records the initializing/last-migrating engine version. Apply the shared [version/migration contract](configuration-migrations.md), including the fixed baseline for absent versions, rather than treating a version as arbitrary metadata. All Promptbook-owned JSON keys are lower camelCase, all boolean properties begin with `is`, user tool identifiers are kebab-case and fixed enum values are SCREAMING_SNAKE_CASE. Known spelling errors are normalized and committed; ambiguous configuration uses [automatic repair](../concepts/automatic-repair.md).

## Resolution and effective state

Resolve each supported setting from engine defaults, then the selected project's explicit `ptbk.json`, then explicit CLI overrides. Omitted values inherit; false, empty and disabled values are not omission. Credentials are secret inputs, resolved through [environment references](environment.md), not a second project configuration file.

Configuration covers named browser/harness connections, checks, [trace settings](trace-configuration.md), operating/update policies and optional synchronization. A task's explicit requirements constrain selection; they are not lower-priority defaults to overwrite. Multiple browsers and harnesses coexist in `tools`; the old singleton browser and separate harness map are [migrated](tools-migration.md), not retained as competing live configuration sources.

Project-scoped paths resolve relative to the project; CLI paths resolve relative to the invocation directory. Managed-global browser profiles resolve per OS user, not as Git-versioned absolute machine paths. Existing/custom paths follow explicit ownership checks. Do not inherit another project's configuration merely because it is an ancestor or contains the installation. Preserve unrelated fields and diagnose problems at their actual location.

Load/revalidate before every task and refresh promptly during work and waits. File edits, another terminal's tool command and dashboard saves become effective without restart. New tools can serve current work; changes to an already acquired tool retain its current use only under [runtime consistency](tool-runtime.md). Genuine startup-only placement/HTTP settings may still require restart and are labelled as such; that is not permission to make all configuration startup-only.

## Persistence boundaries

Invocation-only CLI overrides and generic temporary runtime controls do not rewrite defaults. Explicit saves are scoped authoring operations. **Tool management is explicitly saved management**, not a temporary runtime-control variant: its changes commit immediately and publish their new revision to the engine. Configuration migrations and deterministic normalization also create their own scoped audit commits, excluding task work. A no-op/read-only load does not commit.

Recovery may retain a particular active use's effective settings without restoring an obsolete whole-project snapshot. A new invocation resolves its own overrides. Init's automatic start preserves applicable explicit workflow overrides. Show effective values and their sources without secrets, and distinguish saved state, active retained use, pending changes and restart-only settings.

## Traces, synchronization and access

Save `traces.isCommitted`, `traces.isVideoIgnored` and `traces.isVideoRecordingEnabled` from the Traces step. Their defaults and parent/video ignore precedence are defined only in [trace configuration](trace-configuration.md). Recording is independent of Git inclusion and applies to attributable activity of any selected browser tool.

`isAutoSync` is the single saved opt-in for ongoing pull/push through the repository's existing origin and current branch; remote/branch definitions stay in Git, not duplicate JSON fields. New initialization asks, while migrated projects default off. See [Git synchronization](git-synchronization.md).

Remote HTTP exposure still defaults on with HTTP under [remote access](remote-access.md); this is unrelated to Git autosync. Persisted booleans use `server.isEnabled` and `server.tunnel.isEnabled`, with canonical provider enums. CLI `--no-tunnel`/`--tunnel` and `--tunnel-provider` remain invocation overrides; no-server suppresses implicit tunneling. Store references rather than provider secrets, pairing links or device sessions. Runtime URLs/processes are not versioned defaults.

## Initialization and checks

Init uses the same tool operations but keeps its simple selection UX; it does not ask users to design account pools or fallback chains. Preserve existing selections, profiles, native logins and explicit false values. New browser defaults remain the dedicated reusable global Promptbook profile, not personal Chrome.

Init no longer asks for a checking command. Preserve an existing real `execution.check`; when absent, save an explicit successful informational placeholder such as `echo "Configure project checks in ptbk.json execution.check"`. It is not evidence of real validation and does not block bootstrap. A supplied `init --check COMMAND` can fill the missing choice without a question; existing valid defaults and temporary overrides retain their precedence. See [checks](checks.md) and [initialization](initialization.md).

Model/thinking defaults come from harness plugin code, never per-instance tool settings. Agent/task/chat execution requirements use the shared [MODEL](../book-language/commitments/model.md) contract. Explicit CLI choices become requirements for the relevant operation; they cannot relax existing agent/task constraints.
