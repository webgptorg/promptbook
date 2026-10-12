# Commands and configuration

[Main specification](../_main.md)

The command root is `ptbk`. Bare invocation displays [top-level help](help.md), in both interactive and noninteractive environments, without starting work or asking to start. The ordinary workflow is initialization or cloning, followed by `ptbk start`.

## Commands

| Command | Purpose |
| --- | --- |
| `init`, `initialize` | Prepare a project, optionally create and start an agenda from intent. |
| `start` | Operate the ongoing agenda with automatic routing. |
| `stop`, `restart` | Control the selected project's daemon. |
| `status`, `show` | Inspect the current process without changing its lifecycle. |
| `answer` | Inspect and answer pending human requests. |
| `run` | Execute a finite existing queue with one selected configuration. |
| `about` | Show a short product overview and the running engine version. |
| `add` | Create a task from description, stdin or a template, without a model call. |
| `generate-boilerplates` | Create unfinished, non-runnable task templates. |
| `plan` | Discuss and save approved tasks without implementing them. |
| `list` | Read-only queue, filters and readiness explanations. |
| `fix` | Check and repair project validation, not the ordinary queue. |
| `verify` | Human review, follow-up and archiving of results; not a check run. |
| `migrate` | Explicit local conversion of Markdown tasks to Books. |
| `recover` | Inspect and explicitly resolve interrupted/blocked work. |
| `find-unwritten`, `find-refactor-candidates`, `find-fresh-emoji-tags` | Authoring helpers. |
| `ping` | An explicit small harness/model call, optionally repeated with `--period`. |

## Shared configuration and presentation

`--path` selects the project; `--tasks` selects its task source. [Configuration precedence](configuration.md) defines engine defaults, versioned `ptbk.json` and temporary CLI overrides, including legacy environment defaults. Task requirements cannot be silently overridden by an incompatible invocation choice.

`--agent`, `--harness`, `--model`, `--thinking-level` and `--context` configure finite work. Agent, harness and model are separate concepts. Run/fix/plan default to the project's Developer role when an agent is not selected; an explicit Planner is supported. Start discovers project roles and enabled harnesses and uses Manager, subject to explicit restrictions/preferences rather than a hidden fixed Developer configuration.

[Interactive UI](interactive-ui.md) defines `--interactive` and `--non-interactive`, a wizard for init and a shared runtime dashboard for run/start. Noninteractive initialization accepts destination/child-repository strategy, intent, installation scope, selected harnesses, browser and update decisions through flags rather than prompts. Help documents these choices without dumping provider-specific configuration.

Start supports `--daemon` (default), `--raw`, `--interactive`, `--no-persist`, `--no-server`, `--port`, `--no-qr`, `--browser-mode headless|headful` and `--browser-profile <path>`. Process placement and interaction are distinct; raw/no-UI operation never requests terminal input. `--help` and `--version` follow the shared [help/version contract](help.md). See [controls](controls.md).

## Finite-run and service options

Preserve priority bounds (`--min-priority`, `--max-priority`, with `--priority` as the lower-bound alias), successful-task `--limit`, `--git-changes fail|ignore|continue`, `--no-commit`, `--no-auto`, `--auto-pull`, `--auto-push`, `--check`, `--check-before`, `--isolate`, `--no-normalize-line-endings`, `--no-ui`, `--preserve-logs`, `--no-questions` and `--allow-credits`.

Pacing uses `--wait-between-prompts`, `--wait-after-prompt` and `--wait-after-error`, accepting duration forms such as `30m` and `1h30m`. Initial pacing defaults are zero between/after tasks and ten minutes after a technical error. Thinking settings include `low`, `medium`, `high`, `xhigh`, `max` only where the selected harness supports them; unsupported settings are diagnosed, not falsely accepted.

Validate combinations before work: invalid priority bounds fail; `--no-auto` requires an interactive terminal and conflicts with `--no-questions` and noninteractive operation; automatic `--no-commit` requires `--git-changes ignore`; isolation requires commits and conflicts with continue; continue conflicts with pre-check repair. Auto-pull requires automatic persistence. Start cannot disable task commits or become a finite `--limit` run.

Authoring services use explicit `--commit`; optional push requires a commit. An agenda bootstrap follows the task commit contract; initialization's setup commits follow [initialization](initialization.md). `add` retains template/priority input; boilerplate `--count` supports `N` and `N*M` (default `5*1`); verify supports review order and repeatable ignore filters. Optional `--auto-migrate` is a configured project migration hook, distinct from task-format conversion; destructive permission requires that hook to be enabled explicitly.

List/help/about/version/dry-run must not install or update tools, initialize files, authenticate, call models or modify Git. Never silently ignore an unsupported flag. Read-only previews report missing capabilities without repairing them.
