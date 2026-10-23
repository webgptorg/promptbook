# Router

[Core agents](../core-agents.md) · [MODEL](../../book-language/commitments/model.md) · [Eligibility](../../cli/eligibility.md)

Router exists to choose a responsible agent and concrete execution parameters when they are not already determined. It is the ordinary editable core agent formerly called Manager, inheriting Adam by default, not a separate intelligent routing subsystem. The engine detects unresolved choices, supplies actual capabilities and schedules normal agent work; Router makes the judgment.

## Assignment and persistence

For a task, respect an explicitly selected agent; otherwise choose a suitable agent whose effective MODEL intersects the task's requirements and available authorized capabilities. Complete the harness, model, thinking and runtime selection within that intersection. A fully determined compatible assignment needs no Router call. Do not invent available models, prices, permissions or capabilities, or silently relax an explicit constraint.

Router updates `TASK AGENT` where needed and progressively specializes the task's **single MODEL commitment**, using the same syntax as an agent. Save and commit the decision as ordinary assignment work before execution. Replace the less-specific current value rather than retaining parallel requested/resolved fields, duplicate commitments or a routing-history object: Git preserves the earlier user's wording and Router's refinement. The agent's MODEL remains its durable constraint; task routing does not permanently specialize that agent.

Use one ordinary deduplicated prerequisite assignment task for each unresolved target. Show its real agent, progress and target relationship. After its checked result commits, reevaluate the target automatically without a restart or manual assignment. Recheck current source/capabilities before acting on a saved choice. If no compatible agent/combination exists, leave the original task unfinished and blocked and create a **separate ordinary repair task assigned to Fixer**, with context and evidence. Do not assign the impossible original work to Fixer as a shortcut.

## Timing and priority

Newly saved tasks can be assigned before their execution date, including future and recurring tasks. Assignment is pending schedulable work, not a synchronous call blocking every save. Its priority is the target's effective priority, or at most one numeric priority step higher; use target urgency and temporal distance so routing distant work waits behind important immediate work. Do not spend time routing a far-future backlog while urgent executable work waits. The target still respects its own earliest start and dependencies.

A recurring task keeps its committed assignment across occurrences. No periodic rerouting or Updater agent is introduced now. Tasker may exceptionally remove MODEL after a significant change according to its editable instructions; ordinary clarification preserves the existing choice.

## Bootstrap and conversations

Initialize Router with an already concrete MODEL from an enabled selected harness. With several initially selected harnesses, use the first suitable one in `tools` order and that plugin's coded model/thinking defaults, without another question. Resolve its endpoint from that tool. Router must not need to route itself. Detect incomplete bootstrap or cyclic self-assignment and report a recoverable setup problem through the common retry/repair path; never create an infinite Router chain or livelock.

For a user-led chat, the selected participant already determines the agent. If its parameters are incomplete, route after the first User message and before the first agent reply, and record MODEL at that chronological position in the chat Book. Fully specified agent parameters require no new selection. Current chats keep that choice; switching MODEL during a chat is future work. An agent-originated question from an already executing task uses its established execution context.

Chat and the Router work necessary to serve it remain available during other task execution and during scheduling pause. This does not start queued background tasks. See [chat routing](../../cli/chats.md) and [pause](../../cli/service-lifecycle.md). Router failures use the same cause-aware retry and ordinary Fixer repair as every subsystem, without Router-specific recovery machinery.

## Acceptance outcomes

Resolve partial and alternative MODEL constraints, commit one refined value and retain its prior value only in Git. Exercise an impossible intersection, future-task routing behind urgent work, recurring reuse and Tasker invalidation. Initialize a directly runnable Router, then remove its parameters and verify a bounded diagnostic rather than recursion. Route a first chat message while another task runs and during pause without dispatching queued work.
