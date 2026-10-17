# TASK DEPENDS ON

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Task.

Names prerequisite tasks through the common `@`/`{}` resolver. Several declarations accumulate required predecessors. Missing or wrong-kind winners and dependency cycles block affected tasks; deterministic duplicate-name shadowing is diagnosed, never merged. Priority cannot bypass a dependency.
