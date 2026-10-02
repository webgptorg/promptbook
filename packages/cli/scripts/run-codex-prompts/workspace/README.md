# Workspace Agent Server

Run `ptbk server` in a Git project. `ptbk coder server` registers the same command/action and retains the
same default port, **4441**. `ptbk agents-server start` remains the ordinary database-backed application.
`ptbk coder run` remains a finite, selected-Book invocation; it does not launch the web application.

```bash
cd my-project
ptbk server --test npm test
# Equivalent spelling:
ptbk coder server --test npm test
# Preview only, including without a repository:
ptbk server --dry-run --workspace ./sub-project
```

Both commands use the shared Git preflight before setup. Interactive missing-Git initialization requires the
existing confirmation; noninteractive/`--no-questions` starts require `ptbk init --no-questions` or `git init`
first. Missing essential artifacts are filled through the existing additive Coder initializer. Existing Books,
scripts, guides and settings are preserved. Generated drafts, templates and the prompts README do not run.
Shared bootstrap validates managed artifact paths before writing. Symlink targets, path traversal and portable
case/name collisions require correction before setup; project roots reached through filesystem aliases remain supported.

The actual Agent Server supplies accounts, permissions, profiles, Book editing, chats, settings, Metadata,
organization and APIs. Workspace agent sources are authoritative files. The **System → Project execution** view
shows actual queue/worker state, source mutation recovery and synchronization. Only authenticated administrators
can control the supervisor. Workspace agent access requires authentication; mutation endpoints retain the normal
ownership/admin checks. The service binds to loopback. Admin/session credentials use existing configured values
or new random project-specific credentials in the private file printed at startup; there is no shared password.

## Project layout and persistence

```text
agents/**/*.book                    Authoritative Books (lowercase agents/)
agents/.promptbook.json             Versioned stable identities, tombstones, folders, order/appearance
agents/.core/adam.book              Existing shared inheritance core
prompts/*.md                       Shared parsed PRD queue
.promptbook/config.json            Optional versioned execution configuration
.promptbook/agents-server.sqlite   Existing registry database
.promptbook/servers/default.sqlite Workspace users, chats, settings, Metadata, indices and job journals
.promptbook/secrets/               Private persisted credentials
.promptbook/logs/                  Private application logs
```

The database index/history is derived from Books, rather than another independently editable definition store.
IDs survive UI rename/move/delete/restore. External changes are reconciled while idle and before execution.
Invalid definitions remain visible and are not executed. Jobs record their own compiled source and PRD snapshots.
SQLite paths are explicitly passed to the web process. Ports, aliases and runtime installation directories do not
select a different database. `PTBK_AGENTS_SERVER_SQLITE_PATH` may select another registry beneath this project's
`.promptbook`; its isolated server databases remain beneath `servers/`. Independent projects have separate state.
Ordinary standalone/droplet storage and PostgreSQL installations remain supported and are not converted or deleted.
Back up all project SQLite databases with the SQLite backup mechanism (or stop the server before copying them),
alongside private credentials; Git contains neither operational accounts nor chat history.

Runtime directories, databases/sidecars, credentials, logs and locks have narrow Git/package exclusions. Versioned
configuration is allowed under `.promptbook`; do not ignore the whole directory. Existing custom ignore rules are
preserved. The installed CLI bundles the actual app/runtime inputs and materializes its build beneath the selected
project, using the same build preparation as standalone startup.

## Selection and scheduling

No permanent `--agent`, `--harness` or priority is required. The server checks installed harnesses using the shared
registry without installing/upgrading them or calling a model. CLI/environment defaults and optional configuration
use the existing harness/model/thinking rules. Per-agent configuration is authoritative:

```json
{
    "coder": {
        "harness": "openai-codex",
        "model": "default",
        "agents": { "designer": { "harness": "qwen-code", "model": "default" } }
    }
}
```

Agent keys can be permanent IDs, project-relative Book paths, or normalized first-line names. An unavailable
configured provider blocks that agent's work without switching providers. With no harness configuration, the
first installed adapter in the shared registry is selected. Backtick targets on PRD status lines restrict Book,
harness and configured model dimensions; unknown/ambiguous/conflicting targets remain blocked. An optional
`--agent` narrows automatic work while all agents remain available for chat. `--priority`/`--min-priority` and
`--max-priority` explicitly narrow the queue.

All ready priorities are considered by default. Highest priority runs first; eligible agents at that priority
rotate in stable ID order, with paths/sections sorted within each agent. Untargeted implementation goes to
Developer. Planner/helpers only execute explicitly targeted PRDs or advisory TEAM consultations, never a
broadcast of every task. `PREREQUISITE: [required](other-task.md)` requires every referenced section to be done.
One writing job runs at a time under a repository-wide mutation lease shared by UI edits and other mutating Coder
commands. Independent chats use separate bounded sessions and the same Book/harness service. No paid call polls
an empty queue. Adding a ready PRD or Book is picked up without restarting.

## Git safety and recovery

Automatic processing, scoped local commits and safe pull/push are enabled for the server. Finite `coder run`
defaults remain unchanged. `--no-auto` starts paused; `--no-auto-pull` and `--no-auto-push` disable remote actions.
`--no-commit` affects implementation jobs and requires disabling automatic push; successful source/organization
changes through the app still require their scoped local commit. Use `--dry-run` for a fully read-only preview.

Source/organization mutations use atomic optimistic writes and one journaled scoped commit per logical operation,
including deletions. Book editor/API saves require the observed source revision; stale edits and unrelated dirty
target files are rejected. Watchers do not commit manual edits. Unchanged saves create no empty commit. Configured
Git author/signing is reused. Unrelated staged/unstaged files are preserved, never swept into an operation commit.
The project scope is preserved inside enclosing repositories.

Remote synchronization uses fast-forward pull at serialized boundaries, then reconciles definitions/readiness.
No remote/upstream means usable, reported local-only mode. Divergence, dirty pull boundaries and fetch errors
pause unsafe mutations; the app remains available. There is no force push, reset/clean, history rewriting or
automatic stash. Failed pushes retain completed local work as **push pending** and never rerun the PRD.
Automatic retries are bounded; use **Synchronize** after resolving credentials/network/history problems.

Interrupted source mutations retain before/after paths and an operation marker. Recovery reconciles files and
existing commits before finishing, never creating a duplicate completion commit. Ambiguous interrupted jobs
require review; restore their PRD to ready and explicitly retry only when appropriate. Never delete a live lock:
leases verify owning process/host/token and only recover confirmed dead owners. A second supervisor is refused.

Pause stops new claims and lets current work finish. Web controls and terminal `P`/`S`/`X` share SQLite control
state. `O` toggles normal/raw terminal output. `--no-ui` and redirected output use plain logs while the web app
and execution continue. First SIGINT/SIGTERM requests graceful stop; a second cancels only owned work, which is
recorded for recovery. Next process failures stop claims and cancel the owned active invocation.

`--port` overrides `PTBK_SERVER_PORT`, then legacy `PTBK_CODER_SERVER_PORT`, then `PORT`, then 4441. Optional
unavailable harnesses do not prevent startup. Invalid Git/storage/port/author prerequisites fail before launching
the supervisor. Production app preparation and owned child lifecycle are shared with `agents-server`.

## Offline verification

Unit/integration tests use temporary Git repositories, SQLite, local bare remotes and deterministic harness/chat
streams. The installed-package fixture verifies the actual packaged app outside the monorepo, both spellings,
multiple targeted agents/priorities, authenticated chat, state persistence and idle discovery without paid calls:

```bash
npm run test-package-generation
PACKAGE_BASENAME=cli node --max-old-space-size=8000 node_modules/rollup/dist/bin/rollup --config rollup.config.js
node node_modules/ts-node/dist/bin.js --transpile-only \
  --compiler-options '{"ignoreDeprecations":"5.0","module":"CommonJS"}' \
  scripts/run-codex-prompts/workspace/testing/installedWorkspaceServerSmoke.ts
```

The fixture preserves its temporary diagnostics unless `PTBK_WORKSPACE_SMOKE_REMOVE=true`. Package generation
recreates bundle directories, so bundle the CLI after generation and before packing the installed fixture.
