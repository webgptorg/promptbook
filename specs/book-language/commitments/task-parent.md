# TASK PARENT

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Task.

References a parent task through its normalized Book name, for example `TASK PARENT {Improve CSV export}`. This groups tasks but does not imply execution order; `TASK DEPENDS ON` does. Duplicate names use the resolver's first winner with collision diagnostics, never a generated task ID.
