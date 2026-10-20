# Automatic Git persistence

[Main specification](../_main.md)

## Commit by default

Every successful Promptbook operation changing versioned project content commits its own authorized changes by default: initialization, task/chat authoring, approved planning saves, templates, saved configuration, repair/recovery and task execution, including Manager, Teacher, Fixer, discovery and Chatter-requested work. CLI, terminal, browser and API share the rule; a separate `--commit` is not required.

A logical operation is the boundary, not each file write or UI step. Each accepted human-facing message and chat creation commits independently. Task-internal consultations join the task's single result commit; conversation-only consultations use ordinary scoped authoring persistence. See [chats](chats.md).

[Configuration migrations](configuration-migrations.md) commit the whole successful multi-version pass once, including the final version even if there are no transformation steps. [Tool management](tool-management.md) commits add/modify/reorder/enable/disable/remove immediately and separately. Deterministic normalization saves an isolated correction, or joins the owning configuration operation when already being prepared there. None may absorb task changes or create an empty commit for a no-op. Secret-file edits follow their own [timestamped local audit](environment.md), never a Git commit of `.env`.

A clean repository is clean at completed operation boundaries unless another owned operation is still active. Read-only commands, cancelled previews, no-ops and runtime/session changes create no commits. Pause/resume/stop/restart, browser repair and viewer navigation are runtime-only unless explicitly saving defaults. Trace inclusion never authorizes versioning `.ptbk/`, credentials or profiles. Push is governed separately by [autosynchronization](git-synchronization.md).

Report saved completion only after commit success. Dispatch does not race ahead of a task's authoring commit. Failed persistence remains recoverable/pending, not completion and not a reason to rerun successful model work.

## Commit messages and history

Every automatic engine commit starts with exact `PTBK: ` plus a meaningful operation summary. Apply the prefix once. A task result uses `PTBK: <task title>` with its descriptive assignment and task-local rules retained in the body. Other subjects identify setup, tool changes, migration, normalization, maintenance or integration. Chat commits retain Chat-Name correlation.

Task-attributable commits carry `Task-Name: <declared name>` and source/revision context, not generated IDs or filename identity. Creation, assignment, result, repair, integration and recurrence retain the name valid for that operation; explicit renames relate old/new names. Multi-task records distinguish executing work from generated follow-ups.

History is append-only for automatic engine operations. Never rebase, amend, squash away commits, reset away history or force-push to manufacture cleanliness. Real integrations use visible non-fast-forward merge commits under [synchronization](git-synchronization.md) and [isolation](isolation.md); already up-to-date input does not require an empty merge. Preserve each original result commit and its provenance. Specification-editing commits in this repository follow their requested `Specs - ...` convention, not the runtime `PTBK: ` convention.

## Concurrent operations and task results

Each completed task/occurrence has one result commit containing its accepted changes, formatter/check changes, completion, follow-ups and eligible artifacts in **`traces/<task-file-basename>/`**, including finalized selected video. This literal source filename without final `.book`/`.md` is independent of Task-Name. Failed attempts remain evidence, not successful result commits. A separate later integration merge is not a second task execution/result.

A tool may be added/modified in another terminal during an active task: commit that tool operation immediately, make newly available resources usable by the task, and commit the task result later. Preserve the intervening commit and configuration. Coordinate file/index ownership at the required granularity; never stage the active task's unfinished work in the tool commit or restore an obsolete `ptbk.json` snapshot when the task ends. Same-file concurrent edits require reconciliation, not blanket replacement. A safe tool operation need not wait for the whole task to finish merely to keep commits separate.

Only attributable changes may enter a commit. Preserve unrelated staged/unstaged content, hooks, signing and ignore rules. No blanket staging or destructive cleanup/stashing. Validate the actual intended committed content; post-check external/synchronization edits require reconciliation and affected checks. A user's dirty state is not automatically adopted by another operation.

Apply trace/video exclusions before staging and never force-add ignored evidence. Preserve local traces regardless of inclusion. Finalize pre-commit artifacts; record later commit/push events without embedding a commit's own SHA in its tree or producing endless bookkeeping commits. Keep source/name/trace rename provenance.

Start may refuse unrelated dirty initial state; subsequently it manages its own pending/interleaved writes rather than treating every owned change as fatal. Ambiguous shared ownership prevents unsafe progress while controls remain available. Intentionally ignored traces are not such a blocker.

Publish task-source updates atomically. Transient Windows sharing failures allow bounded retry of the same prepared update with ownership, confinement and original revision rechecked. Never delete the destination to force replacement; exhaustion preserves work without rerunning agents or false completion.

<a id="explicit-uncommitted-mode"></a>

## Explicit uncommitted workflows

`--no-commit` disables automatic commits for an ordinary invoked task/authoring workflow and its spawned work, including init's service, not another owner or future invocation. `--commit` spells the default; contradictory flags fail before writes. Keep the uncommitted state visible and retain checks, names, source revisions, traces and recovery without inventing SHAs or rerunning accepted work.

Required configuration migrations and explicit saved `ptbk tool` management do not silently become uncommitted: diagnose an incompatible no-commit request before their writes, and explain the committed operation needed. A fresh init can still batch initial tool preparation into its explicitly uncommitted setup; later management commands remain separate committed operations. A configuration repair requiring a commit cannot silently violate an explicit no-write/no-commit invocation.

An uncommitted workflow may process its proven owned work, not adopt unrelated changes. Reentering committed mode requires reconciliation, never a surprise aggregate commit. Preserve `--git-changes fail|ignore|continue`: default refuses unrelated dirt, ignore retains it, continue resumes one proven interrupted task. No flag transfers unknown ownership. No-commit conflicts with isolation and autosync, including legacy auto-pull/push aliases.

Respect configured Git identity/signing, including `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, `CODING_AGENT_GIT_SIGNING_KEY` and `CODING_AGENT_GPG_KEY_ID`; report the effective identity when falling back to Git configuration.

A full revert may reverse result/completion together or remove a task created there. Reverts add history rather than rewriting it. Git cannot undo browser/external effects; preserve their evidence and never repeat them solely because a completion stamp disappeared.

## Acceptance outcomes

Verify creation commits before dispatch, one meaningful PTBK prefix, task/chat name correlation and one result per occurrence. Interleave tool changes and task work, including same-file edits: preserve both scoped histories and unrelated staging. Test mandatory version-only migration commits, normalization no-ops, secret exclusion, failed hooks/signing and explicit uncommitted workflows. Pull/push failure does not rerun successful work; visible merge commits retain original results. Runtime controls and navigation create no commits.

See [authoring](authoring.md), [checks](checks.md), [recovery](recovery.md), [Git synchronization](git-synchronization.md) and [isolation](isolation.md).
