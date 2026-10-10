# Agent and automatic-work consistency

[Agents](_index.md)

Validate the following before execution, and again when relevant definitions change:

- Normalized agent names are unique across all discovered Books. Project agents cannot use reserved non-agent names Void, Null, `0`, User or Expert.
- Required core agents exist; create only missing defaults. Report malformed or conflicting existing definitions with their source locations.
- Inheritance and textual inclusion terminate. An agent without FROM inherits Adam; every chain must reach an explicit empty or engine-defined foundation rather than cycle. Adam may inherit a custom ancestor, provided the full chain terminates. It need not directly inherit Void.
- User cannot be an inheritance parent. Teacher's own Book must end in CLOSED. Report an open Teacher as unsafe configuration, explaining the self-teaching loop; do not run that loop.

TEAM references may be reciprocal or cyclic. That is valid and does not create an inheritance error, but actual consultations have bounded depth, count, time and cancellation.

Manager assignment, teaching and goal discovery are ordinary generated tasks, yet the engine must prevent automatic-work recursion and duplicate generation. Core dispatch cannot require an infinite chain of dispatch tasks; teaching cannot recursively teach Teacher; empty results cannot cause a busy loop. Cyclic task dependencies block the affected work with an explanation.

Malformed configuration must never be repaired by erasing custom source. A running supervisor exposes the problem and remains controllable. See [recovery](../cli/recovery.md), [TEAM](../cli/team.md) and [goal discovery](../cli/goal-discovery.md).
