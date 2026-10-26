# Per-task execution audit

[Main specification](../_main.md) · [Task identity](task-identity.md) · [Trace configuration](trace-configuration.md)

## Literal source-filename mapping

For a canonical Task Book, the root audit directory is **`traces/<task-file-basename>/`**. Take the actual source filename, remove only its final `.book` extension and use the remaining text **literally, one to one**, as the directory name. For legacy Markdown sources remove the final `.md` instead. Do not derive this component from the opening TASK name, normalize it, slugify it again, strip a date, change case/diacritics, add a hash or allocate an ID.

For example, `tasks/2026-10-19-1205-browser-repair.book` maps to `traces/2026-10-19-1205-browser-repair/`, even if its declaration is `TASK Restore the browser — 2026-10-19 12:05:00`. A custom task-source directory changes neither the filename nor the project-root `traces/` destination. This storage convention makes the source file and evidence directory immediately pairable; it does **not** replace the normalized declared name as the task's logical identity.

Record the declared task name, actual project-relative source path and source revision alongside evidence. Retries, repairs, recurring occurrences and task-scoped TEAM consultations remain distinct records under the same source-named directory; they do not refresh the filename/date or create task IDs. Newly created follow-ups use their own actual source basenames.

Preserve literal filename characters supported by the workspace filesystem. Diagnose an invalid/empty basename, unsafe path or conflicting source-to-directory mapping rather than silently inventing another name. Different active sources with the same basename, including `.md` versus `.book`, must not silently share or overwrite task evidence. Resolve that source conflict explicitly before using the ambiguous audit destination; do not repair it by appending an opaque suffix to the trace directory.

Legacy Markdown can contain several task sections in one source file. Its literal source-named directory contains separately attributed section/attempt records, identified through declared names and source revisions, without merging results or inventing task IDs. Canonical one-Book-per-file tasks retain the direct one-to-one pairing.

## Renames and existing evidence

Changing a declared TASK name changes logical identity but does not by itself change the trace directory when the filename is unchanged. Changing/moving a file without changing its declaration preserves logical identity; changing its basename changes the destination for new evidence. Reconcile attributable history, source revisions and links deliberately. A safe coordinated source/trace rename may move owned evidence; never merge an occupied destination, erase old attempts or attach another source's records merely because a name matches.

Existing name-derived trace directories remain historical evidence, not proof that the old naming rule still applies. Preserve and link them to their verified source/task provenance; when safely migrating their location, use the exact source basename. Ambiguous legacy attribution is diagnosed, not guessed from a similar title. Inspection alone does not rename files or directories. No identity migration or re-execution is needed merely to adopt the storage convention.

## Evidence

Retain success, failure, interruption, recovery and human-chat waiting records from the first attempt onward. Preserve chronological harness/attempt/occurrence boundaries and one consolidated readable stream of **available harness output**: exposed tool observations, text, errors and diagnostic/reasoning material actually provided. Unknown, truncated or private reasoning is labelled unavailable, never fabricated; Teacher/Fixer use only actual evidence.

Record source revision, selected agent/harness/model/thinking level and versions, actions, checks/formatters, known usage, external effects, linked chats, commits and synchronization/recovery outcomes. Distinguish contexts using different execution settings. Dashboard/API links use the actual saved source-filename-based path; a missing path is never reported as saved.

## Browser video and secrets

When enabled, capture playable project-browser actions owned by the task in headless/headful mode, with relevant tab transitions and segmented attempts/occurrences. Capture no unrelated desktop, user browser, other project or next task. Exclude/mask login/password/2FA frames, cookies, tokens and secrets in text/video; label gaps. Disabled, unsupported, failed or partial capture is explicit. Optional evidence failure does not unnecessarily block safe work; required evidence may be an acceptance condition.

[Trace policy](trace-configuration.md) decides whether finalized evidence/video join the task's **one result commit**, with accepted changes, TASK DONE, follow-ups and task-internal agent messages. Human-facing messages saved in scoped conversation batches are linked, not retroactively absorbed. Commit metadata uses `Task-Name: <name>`, not TASK ID or filename identity. A commit cannot contain its own SHA in its tree; retain post-commit events without a bookkeeping commit loop.

Local `.ptbk/` holds live ownership/recovery, read markers and system diagnostics; `chats/` holds durable conversations. A diagnostic with no task does not receive a fake task name or filename. Trace copies are evidence, never executable Books. Preserve unresolved-effects evidence across restart, failure and Git revert without automatically repeating external work.

Redact before storing/displaying. Never version browser profiles/credentials; warn that permitted project/page content may still be sensitive. Retention/truncation is visible and protects pending-work evidence before optional capture.

## Acceptance outcomes

Use a Task Book whose filename differs from its TASK name: its trace directory exactly equals the filename without `.book`, including date, case and other supported characters. Repeat with a custom source folder, retry, recurrence and TEAM exchange: no alternate slug/hash or new task ID appears. Test `.md` compatibility, multi-section attribution and basename collisions without mixed evidence. Rename a declaration and a source basename separately; preserve logical identity rules, history and verified links, including old name-derived directories. A shadowed duplicate never acquires another task's records. Video remains playable/attributed/redacted and capture failures never invent saved files.
