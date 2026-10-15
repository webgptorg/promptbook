# Per-task execution traces

[Main specification](../_main.md) · [Task identity](task-identity.md) · [Trace configuration](trace-configuration.md)

Every executed task has its own audit trail in `traces/<task-id>/` at the selected project's root, alongside the default `tasks/` directory. This is the primary task evidence location, whether Git-tracked or ignored, not a global log under `.ptbk/` or a traces folder inside the task source. Its directory name is the same stable ID present in the task source and task-related Git commits.

## Evidence belonging to one task

Create the record from the first attempt and retain it for successful, failed, interrupted and waiting work. Keep attempts, recurring occurrences, repairs, TEAM consultations and resumed phases distinguishable under the same task identity; do not overwrite a failed attempt with a successful retry. Child/follow-up tasks have their own IDs and trace directories with visible parent/origin links.

Each task's trace directory contains:

- One consolidated readable text file of the harness output exposed to Promptbook, including exposed reasoning/diagnostic traces, messages and tool observations. Preserve the available full stream in chronological order, with harness, attempt and occurrence boundaries; a final-answer summary alone is not a substitute.
- Task-linked event logs and outcome/context information: source and assignment, actual agent/harness/model/thinking selection, engine and harness versions, start/end and waits, actions, checks, attempts, usage, external-result references, errors and persistence/integration/synchronization outcomes. Link relevant saved artifacts and result commits.
- Playable browser video when enabled and the task uses the project browser, plus an explicit recording status when video is disabled, not applicable, unavailable, incomplete or failed.

File names and supporting log formats are implementation choices; the root `traces/<task-id>/` contract and consolidated harness text are not. Status, task inspection and results expose the same task ID and paths so a user can navigate from a task or Git commit to its log and video without guessing by title or timestamp. Label unknown data and estimates; do not fabricate progress, cost, model identity or missing footage.

Capture reasoning only to the extent the harness actually exposes it. Do not claim access to hidden internal reasoning, reconstruct it as fact, or substitute a model-generated explanation for a captured trace. Mark unavailable channels and redactions explicitly. Teacher uses the available evidence and can report insufficiency.

## Browser recordings

When recording is enabled, capture the browser activity attributable to the task from its first browser use through its last relevant action. This applies to the shared persistent browser, including headless/headful operation; reusing its instance does not justify omitting recording. Include relevant tab/page transitions and enough context to replay what was actually done. Multiple segments are allowed when sessions, attempts or occurrences require them, with their order and gaps identified.

Scope video to the project browser and owning task, not the user's entire desktop, unrelated browsers or the next task. Retain successful and failed action evidence. A month later, a problematic post should be traceable to its task, commit, exposed harness output and browser replay. Recording does not replace verification that the external action actually succeeded.

Finalize available video before the result commit when it is selected for versioning. Disabling video means no new video capture, not disabling text logs. Unsupported capture, storage exhaustion or recorder failure is a visible evidence limitation; preserve available logs and continue otherwise safe work unless the task explicitly requires that evidence for acceptance. Do not claim a nonexistent recording or pause the whole agenda over optional capture.

## Git and recovery

Apply the saved [trace policy](trace-configuration.md). When included, a task's finalized pre-commit evidence and eligible video belong in the same result commit as its accepted changes, completion/checkmark and generated follow-up definitions. Every task-related commit carries its task ID under [Git persistence](git-persistence.md), even when traces are ignored. Ignored traces remain locally accessible and survive restart.

Resolve the result commit SHA from Git and the stable ID; a commit cannot contain its own final hash in its own file tree. Retain post-commit/push/recovery events without creating a self-referential chain of bookkeeping commits or falsely claiming that later events were present in an earlier snapshot. Uncommitted mode keeps task identity and local evidence but never invents a commit SHA. Git revert does not undo a recorded external effect or justify repeating it.

Keep necessary live ownership, recovery indexes and pending-request state in `.ptbk/`, referencing task traces rather than making `.ptbk/` the only evidence store. Initialization/startup/update diagnostics without a task remain separate system diagnostics under [errors](errors.md); do not invent a task ID for them. Existing recoverable legacy evidence must remain reachable when storage conventions change.

## Sensitive data and retention

Redact credentials, tokens, passwords and sensitive session data before storing or displaying them, including raw harness output. Never copy browser profiles or secret environment values into Git, tasks or trace artifacts. Protect video too: exclude or mask authentication/secret-entry material, recording any intentional gap rather than leaking it. Explain that ordinary page content may still contain sensitive project data before enabling Git inclusion.

Keep retention, storage limits, archival and any truncation visible. Do not silently rotate away the audit period promised to the user or evidence needed for unresolved effects, recovery or Teacher. Bound storage without silently deleting pending-work records; degrade optional capture before losing essential recovery state. Recording failure or read-only inspection reports the actual limitation and available redacted diagnostics, never a fictitious saved path. Trace copies are evidence, not executable task/agent definitions.

## Acceptance outcomes

Execute two identically titled tasks: their sources, commits and `traces/<task-id>/` paths remain unambiguous. Retry one, resume it after restart and execute a recurring occurrence: all evidence stays distinguishable without ID changes or loss of older attempts. Record a browser task and inspect its video alongside the actual result commit. Exercise every trace-policy combination, no browser use, disabled recording and capture/storage failure. No ignored video is accidentally committed, no missing recording is reported as present, and no failure reruns an already successful external action.
