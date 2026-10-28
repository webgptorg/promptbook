# Commands and configuration

[Main specification](../_main.md)

The root command is `ptbk`. Bare interactive invocation offers exactly two context-dependent choices under [the bare-command picker](help.md#bare-command-picker): the focused default is **Initialize project**, **Start project** or **Open dashboard** according to the selected directory and verified engine state; **Open help** is always second. Selecting an action invokes its existing workflow; showing/cancelling the menu does not start or initialize anything. Bare noninteractive/redirected invocation shows technical help without prompting. Successful interactive init starts the background agenda and hands off after a brief cancellable countdown to the ordinary dashboard. An initialized/cloned/stopped project can be started explicitly.

## Commands

| Command | Purpose |
| --- | --- |
| `init`, `initialize` | Preserve intent, prepare missing support/core roles/simple tools, ask optional sync, save ordinary Expert bootstrap and start the agenda. No check-command question. |
| `start` | Start/reuse the ongoing daemon and, in ordinary interactive use, automatically open its project dashboard; explicit foreground and `--no-dashboard` modes are available. |
| `pause` | Stop new claims, drain current work and remain alive in pause. |
| `resume` | Resume or cancel pending pause/stop/restart and return to running. |
| `stop` | Graceful drain/stop; `--force` or `-F` immediately terminates owned execution. |
| `restart` | Gracefully stop/start one replacement and, in ordinary interactive use, automatically open its dashboard. |
| `dashboard` | Continuously observe/control an existing project, without owning or starting it. |
| `dashboard --global` | Host-wide known-project table including stopped entries, individual/bulk lifecycle controls and stopped-entry removal. |
| `panic` | Confirmed host-wide force stop of accessible active engines and owned execution; `--yes` skips confirmation. No soft/pause variants. |
| `status`, `show` | One shared project-state snapshot, including tools and enabled synchronization, without lifecycle changes. |
| `tool` | Named tool list/show/add/modify/move/enable/disable/remove using shared saved management. See [tool commands](tool-management.md). |
| `chat` | New Chatter-first persistent conversation or explicit existing thread, without a dashboard requirement. |
| `ask` | Compatibility/quick submission or enquiry using the same chat/task model. |
| `answer` | Select a waiting chat and append a human reply. |
| `help` | Top-level or command/subcommand-scoped help in pretty/raw form. |
| `about` | Product overview and actual running engine version. |
| `add` | Create/commit a task through wizard, description, stdin or template, without a model call. |
| `generate-boilerplates` | Create unfinished non-runnable templates. |
| `plan` | Discuss and save approved tasks, not implement them. |
| `list` | Read-only queue, filters and readiness explanations. |
| `fix` | Project validation/repair, not ordinary queue execution. |
| `verify` | Human review, follow-up and archiving, not a check run. |
| `migrate` | Explicit local Book/Markdown conversion through the shared deterministic project migration operations. |
| `recover` | Inspect/explicitly resolve interrupted work; routine safe recovery is automatic. |
| `find-unwritten`, `find-refactor-candidates`, `find-fresh-emoji-tags` | Authoring helpers. |
| `ping` | Explicit small harness/model call, optionally repeated with `--period`. |

## Project selection and lifecycle

`--path` selects the project and `--tasks` its task source. Global dashboard and [panic](panic.md) are explicit directory-independent operations and diagnose conflicting project selection; neither initializes the launch directory or creates a global engine. Discovery spans installations/versions. The [global dashboard](global-dashboard.md) retains stopped projects, offers individual/bulk lifecycle controls and removes only stopped registry entries. Panic is the confirmed emergency force-stop shortcut.

Lifecycle commands use the [shared four-state machine](service-lifecycle.md): running, pausing, pause, stopping. `ptbk stop --force` and `-F` immediately terminate all execution owned by the selected engine, not another state or a hard pause. `ptbk panic` applies the same contract across accessible local engines, with confirmation or explicit `--yes`; it rejects `--soft` and `--pause`. Resume cancels pending pause/stop without replaying current work. Stop-to-pause replacement confirms intent; noninteractive callers can explicitly cancel/resume first. Repeated graceful stop does not escalate.

One-shot outcomes distinguish acceptance/draining, actual completion and failure/unconfirmed status. Lost connection alone does not prove termination. Only the verified owner is controlled; [lock cleanup](locking.md) is best-effort during handled force stop and not guaranteed after external hard kill. Opening/closing dashboards/chat leaves ownership alone. Per-project missing service is an error, not implicit startup; the global empty state remains usable.

Resource availability is separate: an initialized service can start and remain running while waiting for tools. Recheck before every task and during waits, not just launch. A new/reenabled tool can help current work without restart. See [tool runtime](tool-runtime.md).

## Configuration and presentation

Use shared [precedence](configuration.md), [version migrations](configuration-migrations.md) and [naming](../coding-standards/naming.md). Saved keys are camelCase, booleans use `is`, user tool names are kebab-case and fixed enum values uppercase. CLI flags keep conventional dashed spellings; tolerant accepted CLI enums save canonically. Task requirements remain constraints.

Where supported by authoring, planning or maintenance, explicit `--agent`, `--harness`, `--model`, `--thinking-level` and `--context` describe that operation's requirements/context. Preserve task constraints through the shared MODEL semantics rather than a second execution path. Agent, tool instance/variant and model are distinct. Agent references use the shared Book resolver. Fix/plan retain their documented default agent unless selected otherwise; start uses Router for unresolved choices. By variant, use eligible ordered instance fallback; an explicitly authorized named-instance restriction must not be silently broadened. MODEL itself does not name an account/instance.

Pretty/raw and interactive/noninteractive follow [CLI presentation](interactive-ui.md). Init/add are finite wizards; dashboards continuous; lifecycle/management commands report once. Noninteractive init accepts destination/nesting, intent/assets, installation, harness/browser, trace, update and synchronization choices. No required check-command choice is added; explicit `--check` is still supported. Help must not dump every provider's configuration into the initial view.

New chat without an explicit target offers Chatter (focused default/Enter) or Choose another agent; the latter opens all valid core/specialist/Expert targets. Explicit `--agent` bypasses selection; noninteractive default is Chatter. Existing threads retain participants; User/Void/Null are not speakers. Ctrl+C leaves chat only. Authorized execution requested in chat uses ordinary tasks and respects pause/ownership.

Start supports `--daemon` (default), `--foreground`, `--no-dashboard`, `--no-persist`, `--no-server`, `--port`, `--browser-mode headless|headful` and `--browser-profile <path>`. `init` and `restart` also accept `--no-dashboard` to suppress their automatic interactive viewer handoff. With several browsers, `--browser-tool <name>` disambiguates temporary browser overrides; never silently apply them to every instance. Saved per-tool changes instead use `ptbk tool modify`.

HTTP is loopback-only. `--no-server` disables HTTP/SPA while retaining local engine control. Raw does not select foreground or change HTTP enablement. Dashboard/status do not apply launch-only options.

`--help`, trailing `help` and `ptbk help <command-path>` show only the selected scope, including `tool add`/`modify`/`disable` and global-dashboard help. No path means top-level. Help/version/read-only inspection require no service/setup and never run the selected command.

## Saved tools and synchronization

Tool subcommands, options, protected secret input, ordering and examples are specified once in [tool management](tool-management.md). Enable/disable are primary, permanent removal secondary. Every real saved change commits independently and promptly, even during active task work; read/no-op/cancel does not. API key values are `${{ env.NAME }}` references; actual secrets enter only protected local editing, not command arguments or Git.

For an in-use modification/disable/remove, CLI refuses without writes and prints the same command with `--force`/`-F` (save while existing use finishes), plus the alternative standalone `ptbk stop --force`, followed after stop by the original command. There is **no tool `--force-stop` option**. Last-enabled-type confirmation is independent: explicit `--yes` accepts that warning noninteractively and does not imply in-use `--force` or vice versa.

Root `isAutoSync` defaults false. `--auto-sync`/`--no-auto-sync` override the invocation. Legacy `--auto-pull`/`--auto-push` are documented compatibility opt-ins to the same combined policy, not independent persisted settings; explain both directions. Use the existing Git origin/current started branch, periodic and boundary attempts, immutable merges and nonblocking remote failure under [synchronization](git-synchronization.md). Manual dashboard synchronization uses that same coordinator.

## Persistence and operation options

Normal mutating workflows commit scoped changes by default with `ptbk: ` and relevant Task-Name/Chat-Name correlation. Human messages save immediately with bounded debounced commits, task consultations with their result, conversation-only advice as scoped authoring. `--no-commit` opts out for an ordinary workflow, including init's service, but cannot silently suppress required configuration-migration or explicit tool-management commits; incompatible requests fail before those writes. Runtime-only/read-only/no-op actions do not commit; a commit alone does not imply push.

Document task-list priority filters and authoring priority separately from execution. Preserve applicable maintenance/start options such as `--git-changes fail|ignore|continue`, `--check`, `--check-before`, `--no-normalize-line-endings`, `--no-ui`, `--preserve-logs`, `--no-questions` and `--allow-credits` only on the commands that actually support their behavior. Do not retain finite-queue `run`, `--limit` or per-task `--no-auto` approval as another work launcher. Pacing options `--wait-between-prompts`, `--wait-after-prompt`, `--wait-after-error` accept durations such as `30m`/`1h30m`; defaults are zero between/after work and ten minutes after a technical error. Thinking selections low/medium/high/xhigh/max apply only where supported, not as invented provider equivalence.

Validate incompatible priorities and flags before work. Start is the ongoing work launcher and does not require routine per-task approval. Legacy `--isolate` is rejected before mutation; task worktrees are removed. Continue conflicts with pre-check repair. No-commit conflicts with autosync (including compatibility flags), not merely with owned dirty work. No option takes ownership of unrelated edits.

Authoring saves one approved operation; push requires a commit. Add keeps template/priority input; boilerplate count accepts N or N*M (default 5*1); verify retains review order/repeatable ignore filters. An optional project-specific hook cannot replace or disable the shared mandatory project-version migration mechanism for configuration and Books. Diagnose unsupported flags rather than ignoring them.

List/help/about/version/dry-run never install/update/authenticate, call models, normalize/migrate files or modify Git. Report missing capabilities and needed repairs without performing them. See [Git persistence](git-persistence.md), [unattended operation](autonomous-operation.md) and [acceptance](acceptance.md).

The command surface contains no `ptbk run`; use `ptbk start` for the ongoing engine and ordinary tasks for bounded work. Unknown/removed commands give an actionable diagnostic rather than silently invoking another workflow. Bare-command menu, technical help and the visual product/about box are distinct experiences under [help](help.md).
