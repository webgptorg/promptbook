# TASK ORIGIN

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Task.

Records where the task came from, including human input, another task, engine-generated enquiry or conversion. `TASK ORIGIN Chat {Full chat name}` records chat-created work's source through the shared resolver; retain links under [chat/task relationships](../../cli/chat-tasks.md). Provenance is informational: all origins use the same lifecycle and permissions, not separate hard task types. See [task origins](../../cli/task-origins.md).

Later modification provenance belongs to TASK CHANGE and its control record/source link. Do not overwrite the original creation origin each time a different chat changes the task. Verified forwarding preserves actual user authority; descriptive provenance alone does not grant it.
