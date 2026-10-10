# Manager

[Agents](_index.md)

Manager is an editable core agent, inheriting Adam by default. In `ptbk start`, it fills execution choices missing from a task: responsible agent, harness, model and thinking level as needed. It considers task intent, available agents, harness capabilities and appropriate resource use. It must not invent unavailable models, capabilities, prices or permissions.

The engine creates an ordinary prerequisite task explicitly assigned to Manager. Its result updates the target task's [routing commitments](../book-language/commitments/task-agent.md). The assignment task is checked, completed and committed like any other task before the target runs. Its relation to the target remains visible.

Respect every explicit target requirement. Partial routing is completed, not replaced. A required unavailable agent/harness/model blocks that requirement and gives an actionable explanation rather than silently selecting something else. Automatic alternatives are allowed only within the user's authorized choices.

Internal Manager execution must have a directly usable bootstrap selection from available authorized harnesses; selecting Manager must not recursively create another Manager task. Deduplicate assignment work for the same unresolved target. Reload available capabilities and target constraints before using a recorded decision.

A finite [run](../cli/run.md) uses its invocation's selected execution configuration instead of this autonomous assignment workflow. See [harnesses](../cli/harnesses.md), [task relationships](../cli/task-relationships.md) and [consistency](consistency.md).
