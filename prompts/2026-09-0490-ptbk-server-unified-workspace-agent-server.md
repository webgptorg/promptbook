[-] - Wait until better model / manGo

[✨🖥️] Reimplement `ptbk coder server` as the alias of `ptbk server`: the full Agent Server operating autonomously on a Git workspace with file-backed agents and the shared Coder execution engine.

```bash
cd my-project
ptbk server

# The same command, not a separate server implementation:
ptbk coder server
```

-   Blocking prerequisite: implement and verify [shared Git preflight and initialization](2026-09-0480-ptbk-coder-git-repository-preflight.md) first. Do not bypass that prerequisite with a private server-only Git check.
-   The user starts one command over the current project. It discovers the project's agents, serves the complete Agent Server web/API experience, allows chatting with those agents, and continuously implements ready PRDs from the project's prompts directory.
-   Combine the actual [Agent Server application](../apps/agents-server) with the execution logic behind `ptbk coder run`. This is not another standalone kanban UI and not merely the current single-agent runner with `keepAlive: true`.
-   Reimplement server orchestration while extracting and reusing shared behavior. Do not implement the requested redesign by copying the run command or forking the Agent Server app.

## Command contract and startup

-   Make `ptbk server` the canonical entrypoint and `ptbk coder server` an alias through the same registration/action helpers. Both must have identical defaults, workspace resolution, options, validation, services, storage, and shutdown behavior; only the spelling of the invocation differs.
-   At the inspected baseline, the top-level command is not registered. Add it to the current CLI registry, not to a deprecated pipeline server entrypoint.
-   `ptbk coder run` remains a finite invocation with one primary Book agent and one selected harness, processing its selected queue and exiting when finished. Preserve its flags, defaults, tests, result semantics, terminal controls, and existing TEAM consultations. It must not become a daemon or launch the web app.
-   The server must not require selecting one permanent `--agent`, one priority, or a harness flag before it can start. Resolve available configured/installed harnesses using shared configuration and selection rules; explicit task/agent configuration must remain authoritative. Do not silently install every harness or switch to an unconfigured paid provider.
-   Resolve the workspace directory and enclosing Git root once. Use the prerequisite's interactive/noninteractive policy before any setup. Preserve the selected project's scope when it is a subdirectory of a larger repository.
-   Initialize missing essential workspace artifacts through the existing non-destructive bootstrap; users must not have to manually launch `coder run` or a second server. Preserve customized Books and settings, and never turn generated examples, unfinished boilerplates, or README files into executable PRDs.
-   Reuse Agent Server build/runtime preparation and packaging. Startup must work from an installed CLI in an arbitrary project, not only from a checkout of this monorepo. Pass explicit workspace/storage paths to child services rather than allowing their installation directory or changed process cwd to become the project root.
-   Print the project/Git root, local URL, storage location, discovered agents, execution readiness, and synchronization state. Missing optional harnesses may leave their jobs visibly blocked while the UI and other usable agents continue; missing mandatory startup prerequisites must produce actionable errors without a half-started supervisor.
-   Keep `--port` and one documented default shared by both spellings. Resolve retained legacy environment/options consistently and document intentional default changes. Preserve useful existing controls such as preview and plain/no-UI operation; a dry-run must not start services, create a database, or execute jobs.

## One shared execution architecture

-   Extract reusable services from the existing run/startup paths for Book resolution, harness/model/thinking selection, prompt parsing and targeting, task execution, output/events, verification, retries, status updates, Git change scopes, commits, pull/push, and applicable migration checks.
-   The finite CLI runner and server workers must call those services. Do not copy the processing loop, spawn a nested `ptbk coder run` CLI for every job, or add another implementation of the same Git/harness rules.
-   Server-only responsibilities are discovery, long-lived scheduling, supervision, persistence, and exposing shared state/control through the Agent Server. Keep these responsibilities out of the finite command's policy.
-   Reuse the existing Agent Server chat workers, authentication, app services, and components. Reconcile overlapping worker pumps so adding Coder supervision cannot execute a chat job or PRD twice.
-   Pass explicit per-workspace and per-job context. Concurrent sessions must not race through global `process.chdir`, shared environment mutation, or mutable global agent/harness selection.
-   Remove the superseded standalone Coder HTTP/UI path once its required capabilities are integrated, and remove dead entrypoints instead of leaving two active server implementations. Keep reusable task-board, output, and control components where they are useful.

## SQLite state and two agent-storage modes

-   The hidden project directory is `.promptbook`, not `.prombook`. Store the workspace Agent Server's persistent database state underneath that directory in the selected project, never in the installed package or an unrelated shared global directory.
-   Reuse the existing SQLite path resolvers and migration/bootstrap machinery. The current registry fallback is `.promptbook/agents-server.sqlite`, with isolated server databases resolved beneath `.promptbook/servers/`; retain that structure where needed rather than assuming that all existing state fits in one SQLite file.
-   Resolve and pass paths explicitly so changing the listening port, invoking the alias, or restarting from the supported project context reopens the same workspace state. Independent projects must not share users, agents, chats, metadata, or scheduler state accidentally.
-   Preserve the complete relevant application machinery: users, authentication, permissions, server settings, Metadata, chats/history, task state, and other persistent operational data. This must not be a stripped-down demo database or a new throwaway database on every launch.
-   Distinguish ordinary standalone/droplet mode from workspace mode. Standalone Agent Server may continue to keep agent sources in its database. Workspace mode keeps authoritative agent Books in the project's existing lowercase `agents/` directory, including supported subdirectories, while non-source application data remains in SQLite.
-   A database index/cache of file-backed agents is acceptable; a second independently editable canonical copy is not. Rebuild/reconcile derived data from files and retain stable agent identifiers so moving or renaming a Book does not detach its chats, permissions, or history.
-   SQLite is the required backend for this feature. PostgreSQL compatibility is not an acceptance requirement, and obsolete PostgreSQL-only implementation may be removed if it simplifies the shared application. Such removal must update affected configuration, tests, and deployment documentation and explain existing-installation migration/backup requirements; it must never silently drop deployed databases or destroy user data.
-   Exclude SQLite files, WAL/journal/SHM sidecars, locks, secrets, and runtime logs from Git and published packages through narrowly scoped rules. Do not ignore all of `.promptbook` if it contains intentionally versioned project configuration. Inspect package generators as well as root ignore files so runtime state cannot leak into CLI tarballs.

## File-backed Agent Server, not a one-time import

-   Introduce a real shared agent-collection/storage contract and a workspace-backed implementation. At the inspected baseline, `AgentCollection` is a type alias to `AgentCollectionInSupabase`; merely changing one constructor without untangling that coupling is insufficient.
-   Select the storage implementation at the shared provider boundary. Audit UI actions, API routes, folder/organization operations, agent preparation, and direct database accesses so no mutation route silently bypasses the workspace implementation.
-   Support creating/importing/duplicating an agent, editing its Book and source-backed metadata, renaming it, moving it between folders, deleting it, and restoring it where the existing UI supports restoration. Reflect source and organization changes in `agents/` and Git using the existing Book conventions.
-   Mirror logical agent folders with the appropriate workspace directory structure. Any essential agent-source/organization information not representable in a Book or path must use a minimal documented versioned representation, not disappear into a database-only change. Operational accounts, sessions, secrets, and chat messages remain database data and must not be committed merely because a user interacted with the app.
-   Every successful logical source/organization mutation from the web UI or API must produce a scoped local Git commit automatically, including additions and deletions. Group one logical operation into one coherent commit and do not create an empty commit for an unchanged save. Reuse the shared Git service and configured author/signing behavior.
-   Use atomic file writes and optimistic conflict detection. A stale browser edit must not overwrite a newer local edit, another user's save, or an update brought by Git. If a target file already contains unrelated uncommitted work, reject/defer the operation with a clear conflict instead of absorbing that work into the server's commit.
-   Treat filesystem changes, derived database updates, and commits as a recoverable workflow rather than pretending they form one database transaction. Surface `saved`, `committed`, `push pending`, or failed states accurately; reconcile interrupted operations without losing source or making duplicate commits. Do not acknowledge a mutation as fully committed when committing failed.
-   Watch/reconcile external file additions, edits, renames, moves, deletions, and changes brought by pull. The UI, discovery, and subsequent executions must update without a restart. Do not automatically commit unrelated manual edits merely because a watcher observed them.
-   Avoid watcher feedback loops for the server's own writes and invalidate shared caches correctly. Reject invalid Books and path/name collisions visibly rather than executing an undisclosed stale definition. In-flight jobs use a recorded source snapshot; agent changes affect subsequent jobs or follow explicit cancellation/restart behavior.
-   Prevent path traversal and writes outside the permitted workspace, including symlink escapes and case-collision problems across Windows, macOS, and Linux. Preserve authorization checks for both UI and API operations.

## Autonomous multi-agent scheduling

-   Discover all project agents and make them visible and usable through the server, not only the Developer Book or the first resolved agent. Additions/removals must be reflected while the server runs.
-   Maintain distinct agent/session identities and execute eligible work for multiple agents under one supervisor. Do not mistake several harnesses for several agents, and do not run the Cartesian product of every agent and every installed harness.
-   Use the existing PRD parser and supported agent/harness/model targeting, priorities, and status annotations. Respect explicit targets; show an unresolved target or unavailable harness as blocked rather than silently running the task with a different agent/provider.
-   Consider all ready priority levels by default, not only the current server command's `priority: 0` selection. Use a deterministic documented scheduling policy with priority ordering and fair progress among eligible agents. Explicit user filters may narrow the queue but must not define the out-of-the-box multi-agent behavior.
-   For untargeted implementation work, reuse the existing default-role policy. Preserve Planner and helper/TEAM roles; making every Book available must not cause the same implementation PRD to be broadcast to every agent or turn a consultation-only helper into an unconditional coding loop.
-   Keep one shared task registry/claim mechanism per workspace. Reconcile eligibility immediately before execution and after repository synchronization. Completed, not-ready, documentation, and template entries must not become new jobs accidentally, and a failed prerequisite must not be treated as satisfied.
-   Support bounded concurrency and independent chat/agent sessions. Repository-writing jobs and UI edits must be coordinated: use a shared mutation queue or isolated Git worktrees with controlled integration, not several uncoordinated agents editing and committing the same working tree.
-   Coordinate with other mutating Coder invocations and prevent two supervisors from independently owning the same workspace. Locks must have an explicit release/recovery path; never delete another live process's lock simply to proceed.
-   Persist enough state to explain current work and recover interrupted claims. On restart, reconcile task status, files, and existing commits before retrying; do not assume an external tool's side effects can always be executed exactly once. Ambiguous interrupted work must be shown for recovery rather than blindly repeated.
-   Continue watching after the queue is empty and pick up newly ready PRDs and agents. An idle server must not make paid model calls just to poll the filesystem or spin in a busy loop.
-   Reuse existing retry, pacing, verification, credit/rate-limit, disk-space, and failure-handling policies. One unavailable agent must not erase other agents' state or crash healthy chat sessions. Show why a worker is waiting, blocked, failed, or paused.

## Automatic Git synchronization by default

-   Unlike `coder run`, the server enables automatic processing, scoped commits, pull, and push out of the box when the repository has the required remote/upstream and credentials. Use the shared execution/Git options and document explicit opt-outs; do not change `coder run` defaults to achieve this.
-   Synchronize at safe task/mutation boundaries, recheck the queue and agent definitions after pulling, and push successful local commits. Serialize index, branch, commit, and remote operations across workers and UI mutations.
-   A new local repository without a remote/upstream remains usable in clearly reported local-only mode: keep local commits, explain why pull/push are unavailable, and do not invent a remote or block every task with repeated setup questions.
-   Never use force-push, destructive reset/clean, silent autostash, history rewriting, or an indiscriminate `git add .` to make synchronization succeed. Preserve unrelated staged and unstaged user changes and do not fold them into a server commit.
-   Divergence, conflicts, permission/authentication errors, and network failures must be visible and recoverable. Pause affected unsafe mutations/integration while keeping the UI available; retain local work and use bounded retries where retrying is safe.
-   A failed push is not a failed implementation. Keep its local commit and pending synchronization state without rerunning the PRD, adding a second completion commit, or claiming that the remote is up to date.

## Complete UI, chat, and lifecycle

-   Serve the existing Agent Server navigation, agent list/folders, profile/chat/Book editor, account/settings/metadata management, and applicable admin/API features against the same workspace agents and SQLite state. Do not replace them with a lookalike shell or embed a separate unconnected app.
-   Integrate a project execution view showing all discovered agents, their actual current jobs and selected harness/model, queue/priorities, waiting/blocked states, verification results, and Git synchronization. Reuse existing components/events where possible and do not fabricate progress or agent messages.
-   Allow real chat with any available agent while autonomous work continues. Chat and implementation must resolve the same underlying Book identity/source, while maintaining separate conversation/job contexts and preserving normal permissions and TEAM behavior.
-   Expose coherent pause/resume and graceful-stop controls in the web UI and terminal. Pause means no new automatic jobs are claimed; explain the treatment of already-running work. UI and terminal controls must operate on the same supervisor state.
-   Retain usable logs and the existing normal/raw output capabilities where applicable, and keep `--no-ui`/redirected terminal output free of interactive redraw sequences. Hiding terminal UI must not disable the web app or autonomous execution.
-   Default local workspace exposure to loopback and preserve authenticated/authorized mutation endpoints. Do not turn the ability to edit Books, enqueue coding work, or perform Git operations into an unauthenticated remote command-execution endpoint. Reuse existing secure account/bootstrap mechanisms rather than introducing a universal default password.
-   Handle port conflicts, web-process failures, worker failures, and `SIGINT`/`SIGTERM` explicitly. Stop only owned processes, stop claiming jobs, finish or safely record interrupted work, flush persistent state, and release resources without orphaning workers. Never kill all Node processes on the machine.

## Acceptance criteria and verification

-   After the Git prerequisite is implemented, both command spellings start the same complete workspace server from an external fixture project without a mandatory agent, priority, or harness flag. No second command is needed to process ready work or chat.
-   A fixture with multiple Books, explicitly targeted PRDs, and at least two priority levels demonstrates that more than one agent actually executes appropriate work and the default scheduler is not restricted to priority zero. Each PRD is claimed once at a time; helper consultations do not duplicate implementation jobs.
-   Adding a ready PRD or valid Book while the server is idle updates the UI and scheduling without restarting. Invalid/unavailable targets are visible; completed and not-ready PRDs, README files, and templates remain excluded.
-   UI/API tests create, edit, rename, move, delete, and restore agents and folders. Assert the actual filesystem result, stable identities, refreshed UI/chat behavior, and scoped Git commits. Test external editor changes and pull-driven updates in the reverse direction.
-   Integration tests with temporary repositories and a local bare remote cover successful automatic pull/commit/push, local-only operation, unrelated dirty/staged files, overlapping edits, divergent history, rejected pushes, and interrupted synchronization. A push failure never causes a completed task to run again.
-   Concurrency/restart tests cover competing task claims, UI edits during execution, two attempted supervisors, stale claims, and interruption between file save, database reconciliation, commit, and push. There is no silent overwrite, duplicate completion, or lock theft.
-   Restart with each alias and verify persistent users, settings, metadata, chat history, and job/synchronization state. Two fixture projects remain isolated. SQLite runtime files and credentials are absent from Git diffs and packed CLI artifacts.
-   Regression-test the finite `coder run` and ordinary standalone SQLite Agent Server. Demonstrate that shared parser/runner/Git services are exercised by both the finite and persistent workflows; do not satisfy DRY merely by renaming copied code.
-   Test authorization, path confinement, a missing harness, no-question/non-TTY startup, port conflicts, clean shutdown, and plain terminal output. Use mocked deterministic harness/chat streams and temporary Git/SQLite state; no paid model calls are required.
-   Run relevant unit/integration tests, type checks, app/CLI builds, and an installed-package smoke test with the required runtime assets outside the monorepo. Record exact verification commands/results and distinguish existing or environmental failures from regressions.

## Context and related work

-   Inspect [CLI registration](../src/cli/$initializePromptbookCliProgram.ts), [run options](../src/cli/cli-commands/coder/run.ts), [current server options](../src/cli/cli-commands/coder/server.ts), [current server wrapper](../scripts/run-codex-prompts/main/runCodexPromptsServer.ts), and [the shared runner](../scripts/run-codex-prompts/main/runCodexPrompts.ts).
-   Reuse [Agent Server CLI startup](../src/cli/cli-commands/agents-server/run.ts), [its supervisor](../src/cli/cli-commands/agents-server/startAgentsServer.ts), [startup helpers](../src/cli/cli-commands/agents-server/startAgentsServer), and [multi-agent message execution](../scripts/run-agent-messages/main/runMultipleAgentMessages.ts) rather than creating competing launch machinery.
-   Inspect [the agent collection type](../src/collection/agent-collection/AgentCollection.ts), [the shared provider](../apps/agents-server/src/tools/$provideAgentCollectionForServer.ts), [app actions](../apps/agents-server/src/app/actions.ts), [API mutations](../apps/agents-server/src/app/api/v1/agents/route.ts), and [agent organization services](../apps/agents-server/src/utils/agentOrganization).
-   Reuse [SQLite support](../apps/agents-server/src/database/sqlite), [registry path resolution](../apps/agents-server/src/database/sqlite/resolveAgentsServerSqliteDatabasePath.ts), [per-server path resolution](../apps/agents-server/src/database/sqlite/resolveServerSqliteDatabasePath.ts), [project bootstrap](../src/cli/cli-commands/coder/initializeCoderProjectConfiguration.ts), and [Git synchronization](../scripts/run-codex-prompts/git/coderGitSync.ts).
-   Coordinate with [default-agent selection](2026-09-0420-ptbk-coder-default-agents.md), [helper initialization](2026-09-0430-ptbk-coder-helper-agents-init.md), [TEAM runtime](2026-09-0440-ptbk-coder-team-runtime.md), [normal/raw output](2026-09-0450-ptbk-coder-normal-and-raw-output.md), [generated README](2026-09-0460-ptbk-coder-init-prompts-readme.md), and [legacy cleanup](2026-09-0470-remove-legacy-pipelines-and-clean-repository.md). Preserve their implemented behavior and resolve moved paths rather than rebuilding retired layers.
-   Keep in mind the DRY _(don't repeat yourself)_ principle: shared logic must actually be shared, including between both aliases, the finite runner, file/database storage modes, and standalone/workspace app startup.
-   Update CLI/help, workspace layout and Git-safety documentation, generated workflow documentation, and the [Coder landing website](../apps/coder-landing), including changed examples/demo behavior. Add the implemented changes and intentional compatibility changes into the [changelog](../changelog/_current-preversion.md).
