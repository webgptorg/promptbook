# Commands and configuration

[Main specification](../_main.md)

The command root is `ptbk`. Bare invocation displays [top-level help](help.md), in both interactive and noninteractive environments, without starting work or asking to start. Successful `ptbk init` prepares the project and automatically starts its background agenda; the optional next command is `ptbk dashboard`. An already initialized, cloned or stopped project can also be started explicitly with `ptbk start`.

## Commands

| Command | Purpose |
| --- | --- |
| `init`, `initialize` | Complete finite technical setup, preserve initial input, create an ordinary Expert bootstrap task and automatically start the background agenda. |
| `start` | Start the ongoing agenda's daemon and report one status snapshot; explicit foreground operation is available. |
| `stop`, `restart` | Control the selected project's daemon and report the outcome and status once. |
| `dashboard` | Continuously observe and control an existing project service in the terminal without starting it. |
| `status`, `show` | Show one snapshot of the shared dashboard state, including chat attention and connection information, without changing its lifecycle. |
| `chat` | Start a new persistent user↔agent conversation directly, or explicitly reopen a named existing chat; no dashboard required. |
| `ask` | Compatibility/quick task-submission or enquiry entry point using the same chat/task model, not a separate request store. |
| `answer` | Select a waiting chat and append a user answer (compatibility for former requests). |
| `run` | Execute a finite existing queue with one selected configuration. |
| `help` | Show top-level or command/subcommand-scoped help in pretty or raw presentation. |
| `about` | Show a short product overview and the running engine version. |
| `add` | Create and commit a task through a wizard or supplied description, stdin or template, without a model call. |
| `generate-boilerplates` | Create unfinished, non-runnable task templates. |
| `plan` | Discuss and save approved tasks without implementing them. |
| `list` | Read-only queue, filters and readiness explanations. |
| `fix` | Check and repair project validation, not the ordinary queue. |
| `verify` | Human review, follow-up and archiving of results; not a check run. |
| `migrate` | Explicit local conversion of Markdown tasks to Books. |
| `recover` | Inspect and explicitly resolve interrupted/blocked work; ordinary safe recovery remains automatic. |
| `find-unwritten`, `find-refactor-candidates`, `find-fresh-emoji-tags` | Authoring helpers. |
| `ping` | An explicit small harness/model call, optionally repeated with `--period`. |

## Shared configuration and presentation

`--path` selects the project; `--tasks` selects its task source. [Configuration precedence](configuration.md) defines engine defaults, versioned `ptbk.json` and temporary CLI overrides, including legacy environment defaults. Task requirements cannot be silently overridden by an incompatible invocation choice.

`--agent`, `--harness`, `--model`, `--thinking-level` and `--context` configure finite work. Agent, harness and model are separate concepts. Agent selection uses the shared [reference resolver](../book-language/references.md). Run/fix/plan default to the project's Developer role when an agent is not selected; an explicit Planner is supported. Start discovers project roles and enabled harnesses and uses Manager, subject to explicit restrictions/preferences rather than a hidden fixed Developer configuration.

[CLI presentation and interaction](interactive-ui.md) defines pretty output by default on suitable terminals, shared `--raw`, and the input policy of `--interactive`/`--non-interactive`. Init/add use finite wizards; dashboard uses a continuous control view; default start/stop/restart render a single result. Run and explicit foreground start share the live dashboard. Noninteractive initialization accepts destination/child-repository strategy, full intent and attachments, installation scope, selected harnesses, browser, trace and update decisions in advance rather than through prompts. Help documents these choices without dumping provider-specific configuration.

`ptbk chat` is a dedicated interactive conversation, not a task execution run or dashboard attachment. It selects one agent before opening a new named chat, defaulting to visible ordinary project agents with explicit access to hidden/core agents and Expert. Ctrl+C leaves only the chat client. Chat replies may propose or create ordinary tasks, but opening a chat never starts or invents one. See [chats](chats.md) and [chat UI](chat-ui.md). `ptbk ask` retains the existing quick-submit intent without a second human-request subsystem; `ptbk add` remains finite explicit task creation.

Live dashboards and one-shot runtime results follow the [shared status view](status-view.md) and [panel layout](dashboard-layout.md). `--no-qr` suppresses the code in dashboard, status/show, start/restart and run; it does not disable HTTP or remote access. Waiting agent-authored chats, status and connection information are not separate mutually exclusive screens. Init's finite [completion experience](initialization-ui.md) hints at dashboard without opening it.

Start supports `--daemon` (default), `--foreground`, `--no-persist`, `--no-server`, `--port`, `--no-qr`, `--browser-mode headless|headful` and `--browser-profile <path>`, alongside shared presentation/input options. [Remote access](remote-access.md) adds `--tunnel`, `--no-tunnel` and `--tunnel-provider <provider>` for workflows starting HTTP, including finite run and init's automatic start. A managed protected tunnel is enabled by default with HTTP; no-server suppresses it, while explicit tunnel plus no-server is invalid. Available provider values initially are `cloudflare-quick` (default) and configured `cloudflare-named`.

Daemon and foreground conflict; raw output never implicitly selects foreground or changes tunnel policy. Init remains finite and hands off to the daemon, not a foreground dashboard. Attached dashboard/status/show inspect the existing process and do not create a tunnel or alter its settings by receiving launch-only flags. `--help`, trailing `help` and `ptbk help <command-path>` show only the selected scope; no path means top-level help. These forms and `--version` follow [help/version](help.md). See [process modes](process-modes.md) and [controls](controls.md).

## Persistence and finite-run options

Every mutating workflow commits its own versioned project changes by default under [Git persistence](git-persistence.md), with a `PTBK: ` subject prefix and readable Task-Name/Chat-Name correlation where applicable. Each independently accepted human-facing message commits separately; task-internal agent consultations join their task result. This includes init, add, other authoring services and work dispatched by start/run. `--no-commit` explicitly opts out for the invoked workflow, including init's spawned service; `--commit` is the explicit/default compatibility form. Neither grants ownership of unrelated changes. Status reports the selected persistence mode. Read-only/no-op and runtime-only actions create no commits; push is never implied merely by committing.

Preserve priority bounds (`--min-priority`, `--max-priority`, with `--priority` as the lower-bound alias), successful-task `--limit`, `--git-changes fail|ignore|continue`, `--no-auto`, `--auto-pull`, `--auto-push`, `--check`, `--check-before`, `--isolate`, `--no-normalize-line-endings`, `--no-ui`, `--preserve-logs`, `--no-questions` and `--allow-credits`.

Pacing uses `--wait-between-prompts`, `--wait-after-prompt` and `--wait-after-error`, accepting duration forms such as `30m` and `1h30m`. Initial pacing defaults are zero between/after tasks and ten minutes after a technical error. Thinking settings include `low`, `medium`, `high`, `xhigh`, `max` only where the selected harness supports them; unsupported settings are diagnosed, not falsely accepted.

Validate combinations before work: invalid priority bounds fail; `--no-auto` requires an interactive terminal and conflicts with `--no-questions` and noninteractive operation; isolation requires commits and conflicts with continue; continue conflicts with pre-check repair. Explicit no-commit conflicts with isolation and automatic pull/push, but does not require ignore merely to allow its own new writes. Pre-existing dirty state still follows the selected ownership policy. Start cannot become a finite `--limit` run or an unattended worker requiring per-task `--no-auto` confirmation; diagnose incompatible attended-only options instead of silently stalling the daemon.

[Authoring](authoring.md) saves and commits one approved logical operation by default; optional push requires a commit. An agenda bootstrap follows the ordinary task persistence contract and begins after [initialization](initialization.md). `add` retains template/priority input; boilerplate `--count` supports `N` and `N*M` (default `5*1`); verify supports review order and repeatable ignore filters. Optional `--auto-migrate` is a configured project migration hook, distinct from task-format conversion; destructive permission requires that hook to be enabled explicitly.

List/help/about/version/dry-run must not install or update tools, initialize files, authenticate, start tunnels, call models or modify Git. Never silently ignore an unsupported flag. Read-only previews report missing capabilities without repairing them. Ongoing operation follows the primary [unattended-service contract](autonomous-operation.md).
