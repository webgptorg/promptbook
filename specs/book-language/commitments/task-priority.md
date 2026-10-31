# TASK PRIORITY

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Task.

Accepts a nonnegative number or a natural-language description of importance. Higher numeric values run first; absence means ordinary priority zero. Interpret textual importance consistently and expose its effective rank. If interpretation requires Router, create an ordinary planning/assignment task and preserve the original wording when recording its resolution. Read-only views report unresolved priority without calling a model. Dependencies and earliest-start constraints still apply.

For an authorized change, append the new valid value with TASK CHANGE scope/provenance, retaining the previous source layer. The last valid applicable value in source order is effective; invalid or unresolved conflicting input is diagnosed and cannot silently change active work. Reconcile an active task/session under [task control](../../cli/task-control.md) before treating the change as applied. This scalar rule does not replace additive TASK DEPENDS ON or TASK RUNNER semantics.
