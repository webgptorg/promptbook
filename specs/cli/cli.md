# Commands and configuration

[Main specification](../_main.md)

The root command is `ptbk`. Bare invocation shows [top-level help](help.md) without starting work or asking to start. Successful init performs finite setup and starts the background agenda; `ptbk dashboard` is the optional next view. An initialized/cloned/stopped project can be started explicitly.

## Commands

| Command | Purpose |
| --- | --- |
| `init`, `initialize` | Preserve intent, prepare missing support/core roles/simple tools, ask optional sync, save ordinary Expert bootstrap and start the agenda. No check-command question. |
| `start` | Start ongoing daemon and report one snapshot; explicit foreground mode is available. |
| `pause` | Stop new claims, drain current work and remain alive in pause. |
| `resume` | Resume or cancel pending pause/stop/restart and return to running. |
| `stop` | Graceful drain/stop; `--force` or `-F` immediately terminates owned execution. |
| `restart` | Gracefully stop and start one replacement for the selected project. |
| `dashboard` | Continuously observe/control an existing project, without owning or starting it. |
| `dashboard --global` | Live host-wide engine table, independent of CWD, with project attachment and meaningful zero-entry state. |
| `status`, `show` | One shared project-state snapshot, including tools and enabled synchronization, without lifecycle changes. |
| `tool` | Named tool list/show/add/modify/move/enable/disable/remove using shared saved management. See [tool commands](tool-management.md). |
| `chat` | New Chatter-first persistent conversation or explicit existing thread, without a dashboard requirement. |
| `ask` | Compatibility/quick submission or enquiry using the same chat/task model. |
| `answer` | Select a waiting chat and append a human reply. |
| `run` | Execute a finite existing queue with selected configuration and live resource checks. |
| `help` | Top-level or command/subcommand-scoped help in pretty/raw form. |
| `about` | Product overview and actual running engine version. |
| `add` | Create/commit a task through wizard, description, stdin or template, without a model call. |
| `generate-boilerplates` | Create unfinished non-runnable templates. |
| `plan` | Discuss and save approved tasks, not implement them. |
| `list` | Read-only queue, filters and readiness explanations. |
| `fix` | Project validation/repair, not ordinary queue execution. |
| `verify` | Human review, follow-up and archiving, not a check run. |
| `migrate` | Explicit local Markdown-to-Book conversion, distinct from automatic configuration migrations. |
| `recover` | Inspect/explicitly resolve interrupted work; routine safe recovery is automatic. |
| `find-unwritten`, `find-refactor-candidates`, `find-fresh-emoji-tags` | Authoring helpers. |
| `ping` | Explicit small harness/model call, optionally repeated with `--period`. |

## Project selection and lifecycle

`--path` selects the project and `--tasks` its task source. Global dashboard is the explicit directory-independent exception and diagnoses conflicting project selection; it never initializes a project or creates a global engine. Discovery spans installations/versions, with no new stop-all command.

Lifecycle commands use the [shared four-state machine](service-lifecycle.md): running, pausing, pause, stopping. `ptbk stop --force` and `-F` are equivalent immediate actions, not another state or a hard pause. Resume cancels pending pause/stop without replaying current work. Stop-to-pause replacement confirms intent; noninteractive callers can explicitly cancel/resume first. Repeated graceful stop does not escalate.

One-shot outcomes distinguish acceptance/draining, actual completion and failure/unconfirmed status. Lost connection alone does not prove termination. Only the verified owner is controlled; [lock cleanup](locking.md) is best-effort during handled force stop and not guaranteed after external hard kill. Opening/closing dashboards/chat leaves ownership alone. Per-project missing service is an error, not implicit startup; the global empty state remains usable.

Resource availability is separate: an initialized service can start and remain running while waiting for tools. Recheck before every task and during waits, not just launch. A new/reenabled tool can help current work without restart. See [tool runtime](tool-runtime.md).

## Configuration and presentation

Use shared [precedence](configuration.md), [version migrations](configuration-migrations.md) and [naming](../coding-standards/naming.md). Saved keys are camelCase, booleans use `is`, user tool names are kebab-case and fixed enum values uppercase. CLI flags keep conventional dashed spellings; tolerant accepted CLI enums save canonically. Task requirements remain constraints.

`--agent`, `--harness`, `--model`, `--thinking-level` and `--context` configure finite work. Agent, tool instance/variant and model are distinct. Agent references use the shared Book resolver. Run/fix/plan default to Developer unless selected otherwise; start uses Router and enabled tools subject to requirements. When selecting a harness by variant, use that variant's eligible ordered instance fallback; a named-instance restriction must remain explicit rather than silently broadened.

Pretty/raw and interactive/noninteractive follow [CLI presentation](interactive-ui.md). Init/add are finite wizards; dashboards continuous; lifecycle/management commands report once. Noninteractive init accepts destination/nesting, intent/assets, installation, harness/browser, trace, update and synchronization choices. No required check-command choice is added; explicit `--check` is still supported. Help must not dump every provider's configuration into the initial view.

New chat without an explicit target offers Chatter (focused default/Enter) or Choose another agent; the latter opens all valid core/specialist/Expert targets. Explicit `--agent` bypasses selection; noninteractive default is Chatter. Existing threads retain participants; User/Void/Null are not speakers. Ctrl+C leaves chat only. Authorized execution requested in chat uses ordinary tasks and respects pause/ownership.

Start supports `--daemon` (default), `--foreground`, `--no-persist`, `--no-server`, `--port`, `--no-qr`, `--browser-mode headless|headful` and `--browser-profile <path>`. With several browsers, `--browser-tool <name>` disambiguates temporary browser overrides; never silently apply them to every instance. Saved per-tool changes instead use `ptbk tool modify`.

HTTP workflows support `--tunnel`, `--no-tunnel`, `--tunnel-provider`; CLI provider spellings remain `cloudflare-quick`/`cloudflare-named` and saved enums are canonical uppercase. No-server suppresses implicit tunnelling and conflicts with explicit enablement. HTTP exposure is not Git autosync. Raw does not select foreground or change exposure. Dashboard/status do not apply launch-only options or create tunnels.

`--help`, trailing `help` and `ptbk help <command-path>` show only the selected scope, including `tool add`/`modify`/`disable` and global-dashboard help. No path means top-level. Help/version/read-only inspection require no service/setup and never run the selected command.

## Saved tools and synchronization

Tool subcommands, options, protected secret input, ordering and examples are specified once in [tool management](tool-management.md). Enable/disable are primary, permanent removal secondary. Every real saved change commits independently and promptly, even during active task work; read/no-op/cancel does not. API key values are `${{ env.NAME }}` references; actual secrets enter only protected local editing, not command arguments or Git.

For an in-use modification/disable/remove, CLI refuses without writes and prints the same command with `--force`/`-F` (save while existing use finishes), plus the alternative standalone `ptbk stop --force`, followed after stop by the original command. There is **no tool `--force-stop` option**. Last-enabled-type confirmation is independent: explicit `--yes` accepts that warning noninteractively and does not imply in-use `--force` or vice versa.

Root `isAutoSync` defaults false. `--auto-sync`/`--no-auto-sync` override the invocation. Legacy `--auto-pull`/`--auto-push` are documented compatibility opt-ins to the same combined policy, not independent persisted settings; explain both directions. Use the existing Git origin/current started branch, periodic and boundary attempts, immutable merges and nonblocking remote failure under [synchronization](git-synchronization.md). Manual dashboard synchronization uses that same coordinator.

## Persistence and finite-run options

Normal mutating workflows commit scoped changes by default with `PTBK: ` and relevant Task-Name/Chat-Name correlation. Human messages commit individually, task consultations with their result, conversation-only advice as scoped authoring. `--no-commit` opts out for an ordinary workflow, including init's service, but cannot silently suppress required configuration-migration or explicit tool-management commits; incompatible requests fail before those writes. Runtime-only/read-only/no-op actions do not commit; a commit alone does not imply push.

Preserve `--min-priority`, `--max-priority`, `--priority` lower-bound alias, successful-task `--limit`, `--git-changes fail|ignore|continue`, `--no-auto`, `--check`, `--check-before`, `--isolate`, `--no-normalize-line-endings`, `--no-ui`, `--preserve-logs`, `--no-questions` and `--allow-credits`. Pacing options `--wait-between-prompts`, `--wait-after-prompt`, `--wait-after-error` accept durations such as `30m`/`1h30m`; defaults are zero between/after work and ten minutes after a technical error. Thinking selections low/medium/high/xhigh/max apply only where supported, not as invented provider equivalence.

Validate incompatible priorities and flags before work. No-auto requires interactive input and conflicts with no-questions/noninteractive; start cannot become a finite limit run or require routine no-auto approval. Isolation requires commits and conflicts with continue; continue conflicts with pre-check repair. No-commit conflicts with isolation and autosync (including compatibility flags), not merely with owned dirty work. No option takes ownership of unrelated edits.

Authoring saves one approved operation; push requires a commit. Add keeps template/priority input; boilerplate count accepts N or N*M (default 5*1); verify retains review order/repeatable ignore filters. A configured project migration hook is distinct from Book conversion and mandatory engine-configuration evolution; its optional enablement must not disable the latter. Diagnose unsupported flags rather than ignoring them.

List/help/about/version/dry-run never install/update/authenticate, start tunnels, call models, normalize/migrate files or modify Git. Report missing capabilities and needed repairs without performing them. See [Git persistence](git-persistence.md), [unattended operation](autonomous-operation.md) and [acceptance](acceptance.md).
