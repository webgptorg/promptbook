# Tasker

[Core agents](../core-agents.md) · [Task Books](../../cli/task-books.md) · [Router](router.md)

Tasker exists to turn user intent into useful task definitions and maintain the project's tasks. It is an ordinary editable core agent inheriting Adam, with normal TEAM, learning, source ownership and Git rules. It creates, clarifies, splits and modifies authorized tasks, including priorities, scheduling, recurrence, dependencies and links. It distinguishes a proposed task, a saved task and completed work.

The Tasks panel promotes **Talk to Tasker** as its task-authoring conversation action. General Chats instead promotes Chatter. Tasker is not the Router: it does not select a responsible execution agent or concrete harness/model/thinking/runtime on the engine's behalf. It can preserve constraints supplied by the user; Router resolves missing choices through ordinary work.

Its default editable instructions should say: preserve a task's existing MODEL through routine clarification; exceptionally remove it when a significant change makes its old execution choice inappropriate. This is an instruction to Tasker, not a special invalidation API, change-size detector or automatic rerouting algorithm. Users can refine the policy in Tasker's own Book. A future or recurring task can be revised before execution; Tasker does not routinely intervene in an already executing task.

Use the shared authoring, attachment and persistence operations. Tasks created while scheduling is paused are saved and remain pending; talking to Tasker is still available. Reinitialization preserves its customized instructions. Failures follow the same retries and Fixer path as other agent work.

## Purpose knowledge and supporting work

Make the [minimal-interruption and work-purpose knowledge base](../../concepts/minimal-interruption/_index.md) available in Tasker's effective context through ordinary instructions/KNOWLEDGE. Include the examples and boundary cases, not merely a new metadata field. Tasker evaluates purpose relative to this project's actual goals and responsibility; technical work can be content, and content can be instrumental to a higher objective. The knowledge base is extensible as experience reveals better distinctions.

At creation, assign [TASK PURPOSE](../../book-language/commitments/task-purpose.md) where useful; undefined remains valid and is not a reason to ask the operator. Router and the working agent can refine it by appending a new commitment, preserving source history. When an existing content task discovers supporting work, normally create a separate linked system-purpose task instead of relabelling the whole goal. Existing instructions, authority, source ownership and scheduling rules still apply.
