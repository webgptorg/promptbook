# Manager

[Agents](_index.md)

Manager is an editable core agent, inheriting Adam by default. In `ptbk start`, it fills execution choices missing from a task: responsible agent, harness, model and thinking level as needed. It considers task intent, available agents, harness capabilities and appropriate resource use. It must not invent unavailable models, capabilities, prices or permissions.

Missing assignment is a trigger for automatic work, not a reason to leave the agenda idle or ask the user to assign an agent manually. When an otherwise actionable task lacks routing, the engine creates and schedules an ordinary prerequisite task explicitly assigned to Manager. Do not require the target to already have a usable agent before creating this prerequisite. Its result updates the target task's [routing commitments](../book-language/commitments/task-agent.md). Check, complete and commit the assignment task like any other task, then reevaluate and run the target when eligible in the same start session, without a manual restart or resume.

Show the assignment task, its Manager and its relation to the target as actual current work, not an unexplained blocked task. Respect every explicit target requirement. Partial routing is completed, not replaced. A required unavailable agent/harness/model blocks that requirement and gives an actionable explanation rather than silently selecting something else. Automatic alternatives are allowed only within the user's authorized choices.

Internal Manager execution must have a directly usable bootstrap selection from enabled, authorized harnesses; selecting Manager must not recursively create another Manager task. Ensure this execution path during initialization. Deduplicate assignment work for the same unresolved target, including across retries and restart. Reload capabilities and target constraints before using a recorded decision. A bootstrap failure is a concrete setup/runtime error, not an infinite assignment chain.

A finite [run](../cli/run.md) uses its invocation's selected execution configuration instead of this autonomous assignment workflow. See [harnesses](../cli/harnesses.md), [task relationships](../cli/task-relationships.md) and [consistency](consistency.md).
