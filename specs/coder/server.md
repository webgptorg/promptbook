# Persistent coder server

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

Preserve the local overview of the queue, task contents, ongoing work, states and controls. The current coder server's default port is `4441`. The server may remain running after the current queue is exhausted and respond to new files or due times; it uses the same claim/execution services as `run`.

The server must not start a nested CLI process for each task or keep its own copy of the parser or Git rules. Its specific responsibility is supervision, wake-up and event delivery to the UI. The UI, terminal and source snapshots must observe the same state.

**New decision:** the base web server binds only to loopback. Protect mutating local APIs with a session token/origin check, payload limits and realpath confinement including symlinks. Task edits use optimistic version checks and the same mutation policy as files. The current implementation lacks sufficiently explicit host/auth/path guards; that characteristic is not a compatibility requirement.

Do not present options that the current server does not expose in the same way as `run` (such as `--isolate`, `--limit`, `--check-before`) as existing parity. **New decision:** unify shared options in the target CLI only where their meaning is the same; if needed, explicitly reject a limit for the persistent supervisor with instructions to use a finite run. Help and tests must verify this distinction.

## Related specifications

- [Execution lifecycle](execution.md)
- [Task eligibility](eligibility.md)
- [Recurring task Books](recurrence.md)
- [Mutation lease, journal and recovery](recovery.md)
- [Terminal and run controls](terminal.md)
