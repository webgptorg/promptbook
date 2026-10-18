# TASK

[Commitments](_index.md) · [Syntax](../syntax.md) · [Task Books](../../cli/task-books.md)

**Document:** Task; required first commitment, exactly once.

`TASK <name>` declares a task whose nonempty, single-line display name is `<name>`, not literally `TASK <name>`. Normalize the name content only. This is the canonical task declaration, not a legacy-only header and not a separate task ID. Plain name headers, ENTITY TASK and folder-based classification do not replace it.

Subsequent commitments describe the task's intended result, constraints, owner, scheduling, relationships and completion. Put descriptive work under an appropriate instruction commitment such as GOAL; do not turn continuation prose into part of the name. Task Books do not inherit Adam. TASK AGENT and the other multiword TASK commitments are not additional root declarations.

New system-created task names include readable creation date/time under [generated-name policy](../../cli/generated-names.md); dates are ordinary name text, not a TASK syntax requirement. Existing normalized-name collision and reconciliation behavior remains unchanged. Additional root declarations are invalid.
