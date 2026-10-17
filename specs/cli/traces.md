# Per-task execution audit

[Main specification](../_main.md) · [Name-based task identity](task-identity.md) · [Trace configuration](trace-configuration.md)

Executed tasks have root-level `traces/<name-key>/` audit directories. The key is a deterministic safe encoding of the task's **normalized first-line Book name**, never a generated ID or filename. Source revisions, actual commit history and the declared name at each operation provide provenance. An intentional rename changes name-based identity; preserve prior evidence and explicitly reconcile its references rather than reassigning it to a same-name duplicate.

## Evidence

Retain success, failure, interruption, recovery and human-chat waiting records from the first attempt onward. Separate attempts, recurring occurrences, repairs and task-scoped TEAM consultations under the same task without inventing subtask IDs. New follow-ups have their own readable names and trace locations.

Keep one consolidated readable stream of **available harness output**, including exposed tool observations, text, errors and diagnostic/reasoning material actually exposed. Preserve chronological harness/attempt/occurrence boundaries. Record source revision, selected agent/harness/model/effort and versions, actions, check/formatter outcomes, usage when known, external effects, linked chats, commits and sync/recovery results. Unknown, truncated or private reasoning is labeled unavailable, never fabricated; Teacher/Fixer can use only actual evidence.

## Browser video and secrets

When recording is enabled, capture playable project-browser actions owned by the task in headless/headful use, with relevant tab transitions and segmented attempts/occurrences. No unrelated desktop, user browser, other project or next task is captured. Exclude or mask password/login/2FA frames, cookies, tokens and other secrets in both text and video; label intentional gaps. Disabled, unsupported, failed or partial capture is explicit. Optional evidence failure does not unnecessarily block safe work; required evidence can still be an acceptance condition.

[Trace policy](trace-configuration.md) decides if finalized evidence and video join the task's **one result commit** with accepted changes, TASK DONE and follow-ups. Internal agent↔agent Chat Books/messages produced in the task join that same commit. Separately committed human↔agent messages can be linked, never retroactively pulled into the result. Commit metadata uses `Task-Name: <name>`, **not TASK ID**. A commit cannot contain its own SHA within its tree; record post-commit events without a self-referential commit loop.

Local `.ptbk/` holds live ownership/recovery, chat read markers and system diagnostics, while `chats/` holds durable conversations. A system diagnostic without a task is not given a fake task name. Trace copies are evidence, never executable Books. Preserve unresolved-effects evidence across restart, failure and Git revert without automatically repeating external work.

Redact before storing/displaying. Never version browser profiles or credentials; warn that permitted project/page content can still be sensitive. Retention limits and truncation must be visible and preserve pending-work evidence before optional capture. A missing path is not reported as saved.

## Acceptance outcomes

Run retry/recurrence, human wait and internal TEAM chat, then rename and reconcile a task. Preserve accurately attributed evidence and commit links by name and historical revisions without generated IDs. A shadowed duplicate cannot merge records. Recorded video is playable and redacted; optional capture failures report real evidence limitations without false files.
