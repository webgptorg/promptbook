# Using `ptbk`

Run commands from your Git project or select it with `--path DIR`. `--tasks DIR` changes the task directory within that project. Paths, code and daemon workers resolve from the installed package; two projects can use different local versions. `ptbk --help` lists all accepted options. Unknown or contradictory options fail before starting work.

## Initialize and author

```bash
ptbk init --no-install --no-questions
ptbk add "Preserve CSV columns and quote multiline values" --commit
ptbk list --json
ptbk run --dry-run --json
```

`init`/`initialize` creates missing core Adam, Manager and Teacher Books, ordinary roles, conventions and templates. Existing custom content is preserved. Without `--no-install`, initialization offers global installation of supported harnesses and native interactive login; unattended login instructions remain visible. Basic initialization does not execute tasks. Add `--commit` to persist setup through a scoped commit.

Set the project's `check` script to actual tests, validation and/or builds. Initialization combines existing check scripts where possible and otherwise creates a failing setup placeholder. Commit your intended project baseline and configure Git identity/signing before automatic execution.

`ptbk init --agenda "Maintain this project's objective"` materializes and executes the installation-provided Expert's bootstrap task, then starts its agenda. It requires an authenticated harness and a checked outcome. Expert is reserved and does not need a project Book.

A modern task is plain text:

```book
TASK Improve CSV export

Preserve column names and correctly quote commas and newlines.
Add a regression test that verifies exported values.

TASK ID csv-export
TASK AGENT @Developer
TASK HARNESS opencode
TASK PRIORITY 2
TASK AFTER 2026-10-30T09:00:00+01:00
RULE Preserve the public export interface.
```

Agent Books begin with the agent name. `FROM` defines one parent, `IMPORT` includes context, `TEAM` exposes bounded consultation, and final `OPEN`/`CLOSED` controls learning. Adam, Manager and Teacher defaults live under `agents/.core/`; customization is preserved. Teacher must be CLOSED. Hidden agents remain explicitly referenceable. Expert, User and Void are reserved roles; User is a human request and Void is a TEAM no-op.

Task Books support explicit dependencies (`TASK DEPENDS ON #task-id`) and parent references, earliest starts, due dates, recurrence and dated completion. Natural text and fenced examples survive edits. Markdown task files and checkmarks remain supported; `ptbk migrate --dry-run` previews deterministic conversion and `ptbk migrate` archives originals after preserving their payload/assets. `generate-boilerplates`, `find-unwritten` and other authoring diagnostics help maintain the queue.

## Execute and supervise

```bash
ptbk run --harness opencode --check "npm run check" --limit 1
ptbk start
ptbk start --raw --no-server
ptbk start --interactive --no-persist --port 3100
ptbk status
ptbk show
ptbk restart
ptbk stop
```

`run` freezes its initial queue and uses one configuration (Developer unless selected otherwise). A recurring definition runs at most once in that invocation. `fix` validates/repairs the selected check without consuming backlog work. `verify` is human review/archive. `plan` exposes read-only discussion and proposal tools: `/save`, `/draft`, `/discard` and `/exit`. `plan --prompt TEXT --no-questions` can produce a noninteractive draft without implementing it.

`start` operates indefinitely, selects from installed authenticated authorized harnesses, respects explicit task requirements and uses Manager to fill missing choices. It does not switch automatically to an API billing account. Future tasks retain their time boundary; blocked or future work prevents an idle goal enquiry. When unfinished backlog is exhausted, ordinary goal-enquiry tasks are generated with a durable cooldown.

The default daemon releases your terminal after reporting its project, actual localhost URL and QR code. Repeating start connects to the existing owner. `--no-qr` suppresses the QR; `--no-server` keeps socket/CLI controls; `--no-persist` disables reboot/crash registration. `--raw` stays in the foreground without hidden stdin questions. `--interactive` requires a terminal and supports P pause, S skip pacing wait, X finish/exit, O normal/raw output, arrows and End. Q opens pending questions; C applies runtime settings.

Automatic start requires outcome evidence and checks (default `npm run check`). A successful task yields one commit containing implementation, formatter/check changes, dated TASK DONE and generated follow-ups. OPEN agents create a separate Teacher task; CLOSED prevents learning. Failed validation never stamps completion. Finite `run` reports explicitly when checks are skipped.

`--git-changes fail|ignore|continue`, `--isolate`, `--auto-pull` and `--auto-push` control Git handling. Unrelated working/staged content is preserved, hooks and signing remain active, and push failures retain successful local commits. `--no-commit --git-changes ignore` is available for a finite manual workflow. `recover TASK_ID` inspects a journal; choose `--action resume`, `retry` or `acknowledge` explicitly when its safe boundary cannot be proven. Resume does not replay successful inference or committed work. Read the diagnostic before retrying uncertain external actions.

## Requests, controls and browser

`ptbk answer` lists pending durable requests. Answer explicitly with `ptbk answer REQUEST_ID "Reply"`, or use `--request`, `--response` and `--action answered|rejected|cancelled`. Replies apply once, including when HTTP is disabled. `show` displays unanswered requests without consuming them. TEAM User, system setup/recovery and browser login all use this queue with distinct reasons.

The localhost dashboard displays the same activity, tasks, settings, agent/harness inventory, requests, statistics and recent outcomes. It binds to `127.0.0.1` and requires its session token for API access. GET `/api/state` uses `X-Ptbk-Token`; POST requests also require `Origin: http://127.0.0.1:PORT`. POST `/api/control` accepts an `action`: `pause`, `resume`, `skip-wait`, `finish`, `stop`, `answer`, or `settings`. An answer includes `id` and `response`; settings use `{"action":"settings","settings":{"waitAfterError":30000}}`. Pacing settings use milliseconds. POST `/api/task` accepts `id`, source `revision` and complete UTF-8 `content`, and rejects stale edits or edits during an active task.

Snapshots list settings capabilities. Routing, checks, pacing, enabled harnesses and browser mode change at safe task boundaries. Mode, profile, persistence, HTTP enablement and port require restart; pending/restart changes are exposed separately. All mutations use the same authorization and workspace ownership across interfaces.

Browser tools use local Chrome/Chromium through CDP and the ignored `.ptbk/browser/profile` by default. Sessions survive restart. `--browser-profile PATH` selects an existing dedicated profile, and `--browser-mode headful` allows human login on desktop systems. Conflicting ownership is refused; only the runtime's browser process is stopped. Password values, cookies and session storage are not exposed through read tools. Login/2FA requests direct you to the actual browser and wait for your answer. A host without a display receives a diagnostic when headful mode cannot run.

## Persistence and diagnostics

Daemon persistence uses a project-specific current-user registration: systemd user service on Linux, LaunchAgent on macOS, or logon Task Scheduler entry on Windows. Installation pins the selected Node executable and package worker. Missing user-service prerequisites are diagnosed. Linux startup before login requires the operating system's user-manager/linger configuration. An intentional stop records the stopped intent and disables its registration; foreground processes do not register themselves.

Ignored `.ptbk/` contains process/control configuration, leases, occurrence journals, redacted traces, requests, cooldowns, browser state and two rotating diagnostic logs (5 MiB each). Unix control sockets use a private current-user temporary directory so long project paths remain supported; Windows uses a project-specific named pipe. Never commit it. A PID alone is not sufficient authority to control a process: CLI commands authenticate its project identity through its local endpoint. Workspaces sharing a Git root also share task ownership.

The seven harnesses are `openai-codex`, `claude-code`, `gemini`, `qwen-code`, `github-copilot`, `cline` and `opencode`. Installed CLI versions must expose the requested capabilities. Unknown model catalogs/usage remain unknown; unavailable features fail before inference. Codex account login is preferred; API billing additionally requires `PTBK_OPENAI_CODEX_USE_API_KEY=1`. `--allow-credits` explicitly authorizes credits where supported; no paid fallback occurs silently.

`list`, preview, help, status, migration preview and planning file access do not install tools or make inference calls. Keep recovery evidence when a disk, check, provider or Git operation fails; the supervisor remains inspectable through its controls. [Compatibility](compatibility.md) describes test coverage and [releasing](releasing.md) covers automated publication.
