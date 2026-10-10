# Read-only planning

[Main specification](../_main.md)

`ptbk plan` explores a project, discusses intent and proposes tasks without implementing application changes. Only a harness with enforceable read-only planning capability may run it; OpenAI Codex is the supported baseline. Unsupported harnesses refuse clearly rather than fall back to unrestricted execution.

The planner and its TEAM advisors cannot write application files, launch unrestricted shell work or delegate that authority. Only reviewed task proposals may be saved. Show their exact paths/content and reject stale previews after concurrent changes.

Support `/save` for ready work, `/draft` for not-ready work, `/discard` and `/exit`. EOF discards unsaved proposals while preserving saved files. A planning inference is limited to five minutes and 2 MiB of output. Commit only explicitly approved authoring changes; do not start the queue as a side effect.

This differs from the explicitly requested agenda-creation flow in [initialization](initialization.md), which creates and executes Expert's first task. See [TEAM](team.md) and [CLI](cli.md).
