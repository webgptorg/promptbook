# Interruption, ownership and recovery

[Main specification](../_main.md)

Only one process may mutate or execute tasks in a project at a time. Coordinate related worktrees or nested projects when they affect the same Git checkout. Existing process records must be verified; neither a reused PID nor an old timestamp proves ownership.

Retain enough project-local information in `.ptbk/` to distinguish unfinished work, checked results, created commits, pending synchronization, unanswered requests and external effects. Restart reconciles this record with actual files and Git before continuing. Do not discard uncertain state or reset it to empty.

Start automatically resumes a safe unfinished phase after interruption, without repeating accepted work. A failed commit resumes persistence; a failed push resumes synchronization. An ambiguous source edit or external action requires investigation or user input, while the supervisor and its controls remain available.

`ptbk recover <task-reference>` inspects work without mutation. Explicit `--action resume|retry|acknowledge` selects safe continuation, deliberate retry or acceptance of a failed outcome; `--occurrence` disambiguates recurring work and `--dry-run` previews the action. Acknowledgement is not success. All actions use the same ownership and revision checks as automatic recovery.

Never terminate unrelated processes, seize a live browser profile, overwrite user edits or repeat an external action solely to obtain a clean state. See [process modes](process-modes.md), [persistence](persistence.md), [user interactions](user-interactions.md) and [Git persistence](git-persistence.md).
