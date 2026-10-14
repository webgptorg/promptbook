# Using `ptbk`

Run commands from your Git project or select it with `--path DIR`. Relative CLI paths resolve from the invocation directory and must respect the selected project's boundaries. Code and daemon workers resolve from the installed package; two projects can use different local versions. Bare `ptbk`, help, about and dashboards show the invoked/running engine version. `ptbk COMMAND --help`, `ptbk COMMAND help` and `ptbk help COMMAND` show the same command-specific reference, including aliases. Inspection never checks for updates or performs setup.

Suitable terminals default to rich panels, semantic colors and aligned summaries; `NO_COLOR` suppresses color while retaining readable layout. `--raw`/`--no-ui`, redirection or `TERM=dumb` provide plain output without decoration, cursor controls, QR codes or terminal questions. `--non-interactive` forbids questions and keyboard controls without changing process placement. `--interactive` requests the command's appropriate input flow and conflicts with raw/noninteractive operation.

## Saved defaults

`ptbk.json` belongs to the selected project and is versioned. Settings resolve from engine defaults, legacy `PTBK_HARNESS`/`PTBK_MODEL`/`PTBK_THINKING_LEVEL` fallbacks, project configuration, then explicit flags. Explicit false or empty settings clear lower-priority defaults; Boolean flags accept `--flag=false`. CLI and runtime overrides never rewrite an existing configuration.

```json
{
    "harnesses": {
        "openai-codex": { "enabled": true, "model": "your-available-model" },
        "claude-code": false
    },
    "routing": { "agent": "Developer" },
    "execution": { "check": "npm run check", "waitAfterError": "10m" },
    "browser": { "mode": "headless", "profile": ".ptbk/browser/profile" },
    "updates": { "harnesses": true }
}
```

`harnesses` also accepts an array of enabled identifiers; an empty array deliberately enables none. Supported settings can be at the top level or grouped under `routing`, `execution` and `process`; process settings include `mode` (`daemon` or `foreground`), `persist`, `server`, `port` and `qr`. Legacy `raw`/`interactive` mode values retain explicit foreground behavior; new presentation flags are independent. Numeric pacing values use milliseconds. Paths in the file resolve from its project, including `tasks`, `context`, local Book references and browser profiles. Never store keys, tokens or browser sessions. Supported integrations accept explicit `apiKeyEnv`/`configurationPath` references through their native environment; unsupported references block execution with a diagnostic.

## Initialize and author

```bash
ptbk init --no-install --no-questions
ptbk add "Preserve CSV columns and quote multiline values"
ptbk list --json
ptbk run --dry-run --json
```

`init`/`initialize` creates missing core Adam, Manager and Teacher Books, ordinary roles, conventions and templates. Existing custom content is preserved. Interactive setup is a finite wizard; unattended setup supplies `--installation local|global`, `--harnesses NAME,NAME`, browser choices and any nested-project strategy in advance. `--no-install` explicitly defers installation. Local installation uses the exact running version in dependencies, preserving a declared devDependency and healthy local installation. Harness installation is global and touches only selected integrations; native login is reused. Blank initialization never invokes a model. A fresh sample includes working local validation and a bounded readiness task; the task is saved with setup and later runs through normal checks and a result commit. A versioned first-task record prevents duplicate work after completion or archiving.

Predefined answers use labeled pickers: arrows move focus and Enter confirms. Harness selection and individual updates use checkboxes: Space toggles each item and Enter confirms the selected set. More opens the complete harness catalog while preserving selections; PgUp/PgDn browse long lists. Esc cancels without applying the choice, and Ctrl+L shows complete option details. Freeform fields use the multiline composer with Ctrl+S to submit.

Interactive `add` reuses supplied descriptions/template/priority, offers missing template and priority choices, and previews exact task bytes before saving. Back edits the draft; cancellation before confirmation creates no task. Supplied noninteractive arguments, stdin and templates remain supported. Task creation does not call a model or execute the task.

Versioned setup and authoring operations create scoped `PTBK: ` commits by default; `--no-commit` leaves artifacts for manual persistence. Unrelated staging stays untouched. Generated edits overlapping existing user changes remain uncommitted and are recorded as pending review; initialization/start expose those requirements until the files are committed and clean. Repeating satisfied setup creates no empty commit.

`--new-project DIR` creates a destination. A new child inside Git requires `--nested-strategy ignored|submodule` or `back`; submodules additionally require `--submodule-source URL_OR_PATH`. Parent ignore/submodule metadata remains uncommitted, and the child has its own setup commit. Interactive Back returns to destination selection. In-place setup reuses the existing repository and branch.

Interactive init checks for a newer engine first and offers updating the invoked local/global installation. An authorized successful update exits with a rerun instruction before destination setup. `--self-update` authorizes the unattended equivalent; `--no-self-update` skips it. Offline metadata remains unknown. Harness updates are separate: init offers keep/all/individual choices for outdated selected integrations; start maintains enabled integrations by default, with `--no-auto-update-harnesses` or `updates.harnesses: false` disabling that policy. Updates verify global ownership/version and wait until no project invocation uses the installation.

Set the project's `check` script to actual tests, validation and/or builds. Initialization combines existing check scripts where possible. Empty sample projects receive real material validation; existing projects without validation remain incomplete until a real command is configured. Deferred setup returns exit code 2 with a resume action. Setup is complete only when saved defaults, all selected harnesses and their native execution capabilities are ready for plain start. Commit your intended project baseline and configure Git identity/signing before automatic execution.

`ptbk init --intent "Maintain this project's objective"` on a fresh destination materializes and executes the installation-provided Expert's bootstrap task, then starts its agenda. `--agenda` explicitly requests this flow for an existing project as well. It requires an authenticated harness and a checked outcome. Expert is reserved and does not need a project Book.

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
ptbk start --foreground --interactive --no-persist --port 3100
ptbk dashboard
ptbk dashboard --raw
ptbk status
ptbk show
ptbk restart
ptbk stop
```

`run` freezes its initial queue and uses one configuration (Developer unless selected otherwise). Interactive run and explicit foreground start share a stable dashboard. Run opens its authenticated dashboard and managed remote tunnel until completion; `--no-tunnel` keeps it local; `--no-server` disables it. A recurring definition runs at most once in that invocation. `fix` validates/repairs the selected check without consuming backlog work. `verify` is human review/archive. `plan` exposes read-only discussion and proposal tools: `/save`, `/draft`, `/discard` and `/exit`. `plan --prompt TEXT --no-questions` can produce a noninteractive draft without implementing it.

`start` operates indefinitely, selects from enabled, installed authenticated authorized harnesses, respects explicit task requirements and uses Manager to fill missing choices. It does not switch automatically to an API billing account. Future tasks retain their time boundary; blocked or future work prevents an idle goal enquiry. When unfinished backlog is exhausted, ordinary goal-enquiry tasks are generated with a durable cooldown.

The default daemon releases your terminal after one result reporting its project and actual local and verified remote URLs; pretty terminal output may also include a QR code. Repeating start reports the existing owner without setup, configuration replacement or dashboard attachment. `--raw` retains daemon placement. `--foreground` owns ongoing execution, with a live dashboard or plain events. `--no-qr` suppresses the QR; `--no-server` keeps socket/CLI controls; `--no-persist` disables reboot/crash registration.

`dashboard` continuously observes the existing correct service without starting a worker. Q/Ctrl+C or disconnection leaves only this client; explicit X requests stopping after the current task, and a second X cancels owned work. P pauses/resumes, S skips pacing, O changes presentation, arrows/End browse activity, D shows details, R answers requests, H browses featured/More harnesses and C edits temporary settings. E edits a task source when the runtime supports it, with confirmation and an unchanged source revision required for saving. In an owning foreground invocation Q answers requests and Ctrl+C stops owned execution. `dashboard --raw` is continuous plain observation without input; status/show remain one-shot snapshots.

Automatic start requires outcome evidence and checks (default `npm run check`). A successful task yields one commit containing implementation, formatter/check changes, dated TASK DONE and generated follow-ups. OPEN agents create a separate Teacher task; CLOSED prevents learning. Failed validation never stamps completion. Finite `run` reports explicitly when checks are skipped.

`--git-changes fail|ignore|continue`, `--isolate`, `--auto-pull` and `--auto-push` control Git handling. Unrelated working/staged content is preserved, hooks and signing remain active, and push failures retain successful local commits. `--no-commit --git-changes ignore` is available for a finite manual workflow. `recover TASK_ID` inspects a journal; choose `--action resume`, `retry` or `acknowledge` explicitly when its safe boundary cannot be proven. Resume does not replay successful inference or committed work. Read the diagnostic before retrying uncertain external actions.

## Requests, controls and browser

`ptbk answer` lists pending durable requests. Answer explicitly with `ptbk answer REQUEST_ID "Reply"`, or use `--request`, `--response` and `--action answered|rejected|cancelled`. Replies apply once, including when HTTP is disabled. `show` displays unanswered requests without consuming them. TEAM User, system setup/recovery and browser login all use this queue with distinct reasons.

The loopback HTTP root serves a lightweight JavaScript SPA consuming the shared API. A managed Cloudflare Quick Tunnel publishes a verified HTTPS entry point by default; `--no-tunnel` avoids provider contact and preserves local HTTP, while `--no-server` disables both. Setup reuses a compatible `cloudflared` or installs an official checksum-verified connector in ignored runtime tools. Local work continues during bounded connection failures and retries. Quick hostnames are ephemeral; the relay can see relayed content.

Use the sensitive ten-minute, single-use pairing link displayed in a trusted local pretty terminal to authorize a device. The browser removes its URL fragment before exchanging it for an expiring HttpOnly session cookie. Public visitors receive only the app shell; project data and controls require authentication. Status, raw output and browser connection panels show public addresses and never mint pairing credentials. `ptbk access renew` explicitly renews pairing; `ptbk access devices` lists revocable grant identifiers; `ptbk access revoke [ID]` revokes one grant or all device/API access; `ptbk access token` explicitly issues a sensitive project API bearer. Access state is private and Git-ignored.

GET `/api/state` and `/api/connection` expose authenticated state. POST `/api/control` accepts applicable actions including `pause`, `resume`, `skip-wait`, `finish`, `stop`, `answer`, `settings`, `harnesses` and task inspection/editing. Direct API clients use `Authorization: Bearer CREDENTIAL`; cookie controls require same-origin JSON requests. Answers contain `id` and `response`; temporary settings use `{"action":"settings","settings":{"waitAfterError":30000}}`. Explicit `save:true` at a paused safe boundary saves and commits project defaults, respecting the current persistence policy. POST `/api/task` accepts `id`, source `revision` and complete UTF-8 `content`; edits are revision-checked and committed by default. Drafts survive polling and disconnection. Closing a dashboard leaves the service running.

Named Cloudflare tunnels reuse an existing user-managed tunnel and hostname. Save `tunnel: {"provider":"cloudflare-named","hostname":"dashboard.example.com","id":"EXISTING-TUNNEL-UUID","credentialsFile":"/private/path/to/credentials.json"}` in `ptbk.json`. Optional `enabled:false` disables default exposure and `client` selects an installed executable. Credential bytes, pairing links and generated hostnames never belong in project configuration; setup does not create accounts, domains or DNS routes.

Snapshots list settings capabilities and the running engine version. Checks, pacing, enabled harnesses and browser mode/profile changes apply at safe task boundaries. A finite run keeps one routing selection; routing changes require a new invocation. Process mode, persistence, HTTP enablement and port require restart. Live changes are temporary; pending/restart changes are exposed separately. All mutations use the same authorization and workspace ownership across interfaces.

The page capability appears only in the displayed session URL fragment; an unauthenticated HTML request never discloses it.

Browser tools use local Chrome/Chromium through CDP and the ignored `.ptbk/browser/profile` by default. Sessions survive restart. `--browser-profile PATH` selects an existing dedicated profile, and `--browser-mode headful` allows human login on desktop systems. Conflicting ownership is refused; only the runtime's browser process is stopped. Password values, cookies and session storage are not exposed through read tools. Login/2FA requests direct you to the actual browser and wait for your answer. A host without a display receives a diagnostic when headful mode cannot run.

## Persistence and diagnostics

Daemon persistence uses a project-specific current-user registration: systemd user service on Linux, LaunchAgent on macOS, or logon Task Scheduler entry on Windows. Installation pins the selected Node executable and package worker. Missing user-service prerequisites are diagnosed. Linux startup before login requires the operating system's user-manager/linger configuration. An intentional stop records the stopped intent and disables its registration; foreground processes do not register themselves.

Ignored `.ptbk/` contains process/control configuration, leases, occurrence journals, redacted traces, requests, cooldowns, browser state and two rotating diagnostic logs (5 MiB each). Unix control sockets use a private current-user temporary directory so long project paths remain supported; Windows uses a project-specific named pipe. Never commit it. A PID alone is not sufficient authority to control a process: CLI commands authenticate its project identity through its local endpoint. Workspaces sharing a Git root also share task ownership.

The seven harnesses are `openai-codex`, `claude-code`, `gemini`, `qwen-code`, `github-copilot`, `cline` and `opencode`. Installed CLI versions must expose the requested capabilities. Unknown model catalogs/usage remain unknown; unavailable features fail before inference. Codex account login is preferred; API billing additionally requires `PTBK_OPENAI_CODEX_USE_API_KEY=1`. `--allow-credits` explicitly authorizes credits where supported; no paid fallback occurs silently.

`list`, preview, help, status, migration preview and planning file access do not install tools or make inference calls. Keep recovery evidence when a disk, check, provider or Git operation fails; the supervisor remains inspectable through its controls. [Compatibility](compatibility.md) describes test coverage and [releasing](releasing.md) covers automated publication.

Status snapshots and live dashboards share prominent User attention, observed task/agent activity and available connection information. Pretty terminals add stable offline Coder mascot badges and complete QR codes when space permits; `--no-qr` retains the URL. Raw output keeps names, state and actionable request references. Browser artwork is rendered locally without external avatar services or focus changes; restrained work gestures follow actual activity and respect reduced motion.
