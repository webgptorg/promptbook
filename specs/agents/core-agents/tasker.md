# Tasker

[Core agents](../core-agents.md) · [Task Books](../../cli/task-books.md) · [Router](router.md)

Tasker exists to turn user intent into useful task definitions and maintain the project's tasks. It is an ordinary editable core agent inheriting Adam, with normal TEAM, learning, source ownership and Git rules. It creates, clarifies, splits and modifies authorized tasks, including priorities, scheduling, recurrence, dependencies and links. It distinguishes a proposed task, a saved task and completed work.

The Tasks panel promotes **Talk to Tasker** as its task-authoring conversation action. General Chats instead promotes Chatter. Tasker is not the Router: it does not select a responsible execution agent or concrete harness/model/thinking/runtime on the engine's behalf. It can preserve constraints supplied by the user; Router resolves missing choices through ordinary work.

Its default editable instructions should say: preserve a task's existing MODEL through routine clarification; exceptionally remove it when a significant change makes its old execution choice inappropriate. This is an instruction to Tasker, not a special invalidation API, change-size detector or automatic rerouting algorithm. Users can refine the policy in Tasker's own Book. A future or recurring task can be revised before execution; Tasker does not routinely intervene in an already executing task.

Use the shared authoring, attachment and persistence operations. Tasks created while scheduling is paused are saved and remain pending; talking to Tasker is still available. Reinitialization preserves its customized instructions. Failures follow the same retries and Fixer path as other agent work.
