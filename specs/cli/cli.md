# Commands and configuration

[Main specification](../_main.md)

The command root is `ptbk`. Bare invocation displays [top-level help](help.md), in both interactive and noninteractive environments, without starting work or asking to start. Successful `ptbk init` prepares the project and automatically starts its background agenda; the optional next command is `ptbk dashboard`. An already initialized, cloned or stopped project can also be started explicitly with `ptbk start`.

## Commands

| Command | Purpose |
| --- | --- |
| `init`, `initialize` | Complete finite technical setup, preserve initial input, initialize missing core roles, create an ordinary Expert bootstrap task and start the background agenda. |
| `start` | Start the ongoing agenda's daemon and report one status snapshot; explicit foreground operation is available. |
| `pause` | Stop new task claims, drain current work and keep the engine alive in pause. |
| `resume` | Resume pause or cancel a pending pause/stop/restart and return to running. |
| `stop` | Gracefully drain and stop the selected service; `--force` or `-F` requests immediate owned-work termination. |
| `restart` | Gracefully stop and start one replacement for the same project and effective configuration. |
| `dashboard` | Continuously observe/control an existing project service without starting or owning it. |
| `dashboard --global` | Continuously list host-wide project engines across installations, independently of CWD, and attach to a selected project view. |
| `status`, `show` | One shared project-state snapshot, including chat attention and connection information, without lifecycle changes. |
| `chat` | New persistent user conversation with Chatter by default, or explicitly reopen a named existing thread; no dashboard required. |
| `ask` | Compatibility/quick task-submission or enquiry using the same chat/task model, not a separate request store. |
| `answer` | Select a waiting chat and append a user answer. |
| `run` | Execute a finite existing queue with one selected configuration. |
| `help` | Top-level or command/subcommand-scoped help in pretty/raw presentation. |
| `about` | Short product overview and running engine version. |
| `add` | Create/commit a task through wizard, supplied description, stdin or template without a model call. |
| `generate-boilerplates` | Create unfinished non-runnable task templates. |
| `plan` | Discuss and save approved tasks without implementing them. |
| `list` | Read-only queue, filters and readiness explanations. |
| `fix` | Project validation/repair, not ordinary queue execution. |
| `verify` | Human review, follow-up and archiving; not a check run. |
| `migrate` | Explicit local Markdown-to-Book conversion. |
| `recover` | Inspect/explicitly resolve interrupted work; ordinary safe recovery remains automatic. |
| `find-unwritten`, `find-refactor-candidates`, `find-fresh-emoji-tags` | Authoring helpers. |
| `ping` | Explicit small harness/model call, optionally repeated with `--period`. |

## Project selection and lifecycle

`--path` selects the project; `--tasks` selects its source. `dashboard --global` is the explicit exception: launch directory is irrelevant, no project is initialized, and the view stays open with zero services. An explicit conflicting project selector is diagnosed. [Global discovery](global-dashboard.md) spans installations/versions; there is no global engine or new stop-all operation.

Pause/resume/stop/restart invoke the same [engine lifecycle operations](service-lifecycle.md) as dashboards/API. Live states are running, pausing, pause and stopping. `ptbk stop --force` and `ptbk stop -F` are equivalent immediate actions, not another state. There is no hard pause. Resume cancels pending pause/stop without replaying active work. Stop-to-pause replacement requires confirmation; a noninteractive caller can explicitly resume/cancel before requesting pause. Repeating ordinary stop is not force escalation.

One-shot results distinguish request acceptance/pending intent from completed, failed or unconfirmed outcomes, without attaching a live view. A lost endpoint is not proof of completed stop. Only the verified owner is controlled; [owner lock cleanup](locking.md) is attempted during controlled shutdown, including internal force, but is not guaranteed after an external hard kill.

Opening/closing dashboard or chat leaves the engine alone. Multiple clients may attach to one service, but a second engine cannot own the same project. Missing per-project service is an actionable error, not startup; the global zero-entry case remains usable. See [process modes](process-modes.md).

## Shared configuration and presentation

[Configuration precedence](configuration.md) defines engine defaults, versioned `ptbk.json` and temporary CLI overrides, including legacy environment defaults. Task requirements cannot be silently overridden by an incompatible invocation choice.

`--agent`, `--harness`, `--model`, `--thinking-level` and `--context` configure finite work. Agent, harness and model are separate. Agent selection uses the shared [resolver](../book-language/references.md). Run/fix/plan default to Developer when no agent is selected; explicit Planner is supported. Start discovers project roles/enabled harnesses and uses Manager subject to restrictions/preferences, not hidden fixed Developer routing.

[Presentation and interaction](interactive-ui.md) defines pretty defaults, `--raw` and input policy via `--interactive`/`--non-interactive`. Init/add use finite wizards; project/global dashboards are continuous; lifecycle commands report once. Run/explicit foreground start share the live project view. Noninteractive init accepts destination/child strategy, intent/attachments, installation, harness, browser, trace and update choices in advance; help documents them without provider configuration dumps.

New `ptbk chat` without an explicit target offers **Chat with Chatter** as focused default and **Choose another agent** second. Enter proceeds with Chatter; the latter opens the full valid target list including hidden/core roles and Expert. Explicit `--agent` bypasses the picker; noninteractive default is Chatter. Existing chats/answers retain their real participant. User/Void/Null are not speakers. Ctrl+C closes chat only. Replies can propose/create ordinary authorized tasks, but opening chat never creates work or starts an engine. See [chats](chats.md) and [chat UI](chat-ui.md).

Live/snapshot project views follow [status](status-view.md) and [layout](dashboard-layout.md). Lifecycle controls are directly visible; actual execution configuration and browser profile/diagnostics use [expandable detail panels](dashboard-details.md). `--no-qr` suppresses code in dashboard, status/show, start/restart and run without disabling HTTP/remote access. Waiting chats, status and connection are not mutually exclusive screens. Init's finite finish hints at dashboard without opening it.

Start supports `--daemon` (default), `--foreground`, `--no-persist`, `--no-server`, `--port`, `--no-qr`, `--browser-mode headless|headful` and `--browser-profile <path>`, alongside shared presentation/input options. [Remote access](remote-access.md) adds `--tunnel`, `--no-tunnel` and `--tunnel-provider <provider>` for HTTP-launching workflows, including finite run and init's start. Protected tunnelling defaults on with HTTP; no-server suppresses it and conflicts with explicit tunnel. Initial provider values remain cloudflare-quick (default) and configured cloudflare-named.

Daemon/foreground conflict; raw never implicitly selects foreground or changes tunnelling. Init stays finite and hands off to the daemon. Dashboard/status/show do not create tunnels or apply launch-only settings. `--help`, trailing help and `ptbk help <command-path>` show only selected scope; no path means top-level. These and `--version` follow [help/version](help.md). Global-dashboard help documents directory independence and its continuous empty state.

## Persistence and finite-run options

Mutating workflows commit their own versioned changes by default under [Git persistence](git-persistence.md), with `PTBK: ` subjects and Task-Name/Chat-Name correlation. Human-facing messages commit individually; task-internal consultations join their result; conversation-only consultation uses scoped authoring persistence. This includes init/add/other authoring and start/run work. `--no-commit` opts out for that workflow, including init's service; `--commit` explicitly states the default. Neither grants unrelated ownership. Runtime-only/read-only/no-op actions create no commits, and commit alone does not imply push.

Preserve `--min-priority`, `--max-priority`, `--priority` lower-bound alias, successful-task `--limit`, `--git-changes fail|ignore|continue`, `--no-auto`, `--auto-pull`, `--auto-push`, `--check`, `--check-before`, `--isolate`, `--no-normalize-line-endings`, `--no-ui`, `--preserve-logs`, `--no-questions` and `--allow-credits`.

Pacing uses `--wait-between-prompts`, `--wait-after-prompt` and `--wait-after-error`, accepting `30m`/`1h30m` and equivalent durations. Defaults are zero between/after tasks and ten minutes after a technical error. Thinking levels low/medium/high/xhigh/max apply only where supported; unsupported settings are diagnosed, not falsely accepted.

Validate combinations before work: invalid priority bounds fail; no-auto requires interactive input and conflicts with no-questions/noninteractive; isolation requires commits and conflicts with continue; continue conflicts with pre-check repair. No-commit conflicts with isolation and auto-pull/push, but does not require ignore merely to allow its own writes. Pre-existing dirt follows ownership policy. Start cannot become a finite limit run or require routine no-auto approvals; diagnose incompatible attended-only options rather than silently stall.

Authoring saves/commits one approved operation; optional push requires a commit. Add retains template/priority input; boilerplate count supports N or N*M (default 5*1); verify supports review order/repeatable ignore filters. Optional auto-migrate is a configured project hook, distinct from task conversion; destructive permission requires its explicit enablement.

List/help/about/version/dry-run must not install/update tools, initialize/authenticate, start tunnels, call models or modify Git. Never ignore unsupported flags silently. Inspection reports missing capabilities without repairing them. Ongoing operation follows [unattended service](autonomous-operation.md) and explicit lifecycle intent.
