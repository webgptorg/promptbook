# TASK AGENT

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Task.

Names the responsible agent, for example `TASK AGENT @Developer`. TEAM consultations can assist without creating another active task. In start, Router fills an absent assignment; an unavailable explicit assignment is blocked rather than replaced. Internal tasks may explicitly target hidden core agents or Expert.

For an authorized change, append the new valid value with TASK CHANGE scope/provenance, retaining the previous source layer. The last valid applicable value in source order is effective; invalid or unresolved conflicting input is diagnosed and cannot silently change active work. Reconcile an active task/session under [task control](../../cli/task-control.md) before treating the change as applied. This scalar rule does not replace additive TASK DEPENDS ON or TASK RUNNER semantics.

Reassignment does not create two task owners: checkpoint/reconcile the previous agent and its affected sessions, then acquire the new agent's reservation before execution. A newly saved assignment is not proof that the running worker has handed over. Preserve prior ownership/effect provenance.
