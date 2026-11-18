# Router

[Core agents](../core-agents.md) · [MODEL](../../book-language/commitments/model.md) · [Eligibility](../../cli/eligibility.md)

Router exists to choose a responsible agent and concrete execution parameters when they are not already determined. It is the ordinary editable core agent formerly called Manager, inheriting Adam by default, not a separate intelligent routing subsystem. The engine detects unresolved choices, supplies actual capabilities and schedules normal agent work; Router makes the judgment.

## Assignment and persistence

For a task, respect an explicitly selected agent; otherwise choose a suitable agent whose effective MODEL intersects the task's requirements and available authorized capabilities. Complete the harness, model, thinking and runtime selection within that intersection. A fully determined compatible assignment needs no Router call. Do not invent available models, prices, permissions or capabilities, or silently relax an explicit constraint.

Receive candidates from actual named connections and their [connection-scoped runtime catalogs](../../cli/inference-runtimes.md#connection-scoped-catalogs-and-capability-checks), not a single official-provider catalog per harness. Select a compatible model/runtime combination before applying ordered fallback among equivalent eligible connections. Local and hosted candidates of one harness are both selectable while healthy. Match actual model locality and capabilities; a local proxy can serve a hosted model. Ordinary soft local preferences guide judgment but never relax agent/task restrictions, and adding local support does not impose a preference or rewrite Books.

Router updates `TASK AGENT` where needed and progressively specializes the task's **single MODEL commitment**, using the same syntax as an agent. Save and commit the decision as ordinary assignment work before execution. Replace the less-specific current value rather than retaining parallel requested/resolved fields, duplicate commitments or a routing-history object: Git preserves the earlier user's wording and Router's refinement. The agent's MODEL remains its durable constraint; task routing does not permanently specialize that agent.

Use one ordinary deduplicated prerequisite assignment task for each unresolved target. Show its real agent, progress and target relationship. After its checked result commits, reevaluate the target automatically without a restart or manual assignment. Recheck current source/capabilities before acting on a saved choice. If no compatible agent/combination exists, leave the original task unfinished and blocked and create a **separate ordinary repair task assigned to Fixer**, with context and evidence. Do not assign the impossible original work to Fixer as a shortcut.

A compatible local combination with temporarily unavailable service/model/capacity waits for that resource rather than being rewritten to the cloud or treated as a new impossible-model repair on every refresh. Report the actual blocker and safe recovery action. Router's own connection and the context it receives are independent from the chosen agent's MODEL; respect content-sharing restrictions before sending sensitive task content to a hosted Router.

## Timing and priority

Newly saved tasks can be assigned before their execution date, including future and recurring tasks. Assignment is pending schedulable work, not a synchronous call blocking every save. Its priority is the target's effective priority, or at most one numeric priority step higher; use target urgency and temporal distance so routing distant work waits behind important immediate work. Do not spend time routing a far-future backlog while urgent executable work waits. The target still respects its own earliest start and dependencies.

A recurring task keeps its committed assignment across occurrences. No periodic rerouting or Updater agent is introduced now. Tasker may exceptionally remove MODEL after a significant change according to its editable instructions; ordinary clarification preserves the existing choice.

## Bootstrap and conversations

Initialize Router with an already concrete MODEL from an enabled selected harness. With several initially selected harnesses, use the first suitable one that passed init's real functional check in `tools` order and that plugin's connection-aware coded model/thinking defaults, without another question. Resolve its actual endpoint/model from that tool and discovered runtime. For a local-only selection, use the successfully prepared local model from the first check/name-generation calls onward; do not insert an official-provider default or require a cloud account. Router must not need to route itself. Detect incomplete bootstrap or cyclic self-assignment and report a recoverable setup problem through the common retry/repair path; never create an infinite Router chain or livelock.

For a user-led chat, the selected participant already determines the agent. If its parameters are incomplete, route after the first User message and before the first agent reply, and record MODEL at that chronological position in the chat Book. Fully specified agent parameters require no new selection. Current chats keep that choice; switching MODEL during a chat is future work. An agent-originated question from an already executing task uses its established execution context.

Chat and the Router work necessary to serve it remain available during other task execution and during scheduling pause. This does not start queued background tasks. See [chat routing](../../cli/chats.md) and [pause](../../cli/service-lifecycle.md). Router failures use the same cause-aware retry and ordinary Fixer repair as every subsystem, without Router-specific recovery machinery.

## Acceptance outcomes

Resolve partial and alternative MODEL constraints, commit one refined value and retain its prior value only in Git. Exercise an impossible intersection, future-task routing behind urgent work, recurring reuse and Tasker invalidation. Initialize a directly runnable Router, then remove its parameters and verify a bounded diagnostic rather than recursion. Route a first chat message while another task runs and during pause without dispatching queued work.

Route local GLM and hosted work through two connections of one harness while both are healthy, without cross-contaminating catalogs or changing global login. A task may narrow an agent's local-only MODEL but cannot relax it; conflicting constraints block. Test a temporary runtime outage/capacity wait, unknown-locality model, soft preference and an existing saved selection. Local-only bootstrap and necessary consultations work without cloud credentials; sensitive routing context is not sent to an unauthorized hosted route.

## Independent task purpose

Router may refine [TASK PURPOSE](../../book-language/commitments/task-purpose.md) using the project-relative [purpose knowledge and examples](../../concepts/minimal-interruption/work-purpose.md), available in its normal context. Append a changed purpose commitment instead of replacing its source history. This does not change the existing in-place MODEL refinement rule, grant authority, alter task priority or require a routing call for every unclassified task. Core provenance alone does not decide purpose or visual prominence.
