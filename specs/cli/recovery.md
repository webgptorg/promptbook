# Interruption, ownership and recovery

[Main specification](../_main.md) · [Unattended operation](autonomous-operation.md)

Only one process may mutate or execute tasks in a project at a time. Coordinate related worktrees or nested projects when they affect the same Git checkout. Existing process records must be verified; neither a reused PID nor an old timestamp proves ownership.

Retain enough project-local information in `.ptbk/` to distinguish unfinished work, checked results, created commits, pending synchronization, unanswered human-chat messages and external effects. Link those records by current normalized task name and source revision to durable evidence in `traces/<name-key>/`, preserving previous names when intentionally renamed. Restart reconciles state, traces, actual files and Git before continuing. Do not discard uncertain state, replace earlier attempt evidence or reset it to empty.

Start automatically resumes a safe unfinished phase after interruption without repeating accepted work. A failed commit resumes persistence; a failed push resumes synchronization. Investigate ambiguous source edits or external outcomes using available evidence first. Open or continue a durable agent→User chat only when safe resolution remains unavailable, while the supervisor and controls stay available. Safely checkpointed task-local blockers need not stop independent work; unresolved shared ownership can block the project and must be explained.

`ptbk recover <task-reference>` inspects work without mutation. Explicit `--action resume|retry|acknowledge` selects safe continuation, deliberate retry or acceptance of a failed outcome; `--occurrence` disambiguates recurring work and `--dry-run` previews the action. Acknowledgement is not success. All actions use the same ownership and revision checks as automatic recovery. Routine recoverable failures must not require this manual command.

Never terminate unrelated processes, seize a live browser profile, overwrite user edits or repeat an external action solely to obtain a clean state. Git reverts do not undo browser effects; retain their task-linked evidence. See [process modes](process-modes.md), [persistence](persistence.md), [user interactions](user-interactions.md), [traces](traces.md) and [Git persistence](git-persistence.md).
