# Remote Git synchronization

[Main specification](../_main.md)

`--auto-pull` and `--auto-push` explicitly enable remote synchronization; both are disabled by default. Synchronize at safe task boundaries without incorporating unknown dirty changes or interrupting an active task's verified result.

Pull refreshes the queue through the configured remote, using rebase without automatic stashing. Push publishes completed local work. In isolated execution, publish only the successfully integrated project branch, never the temporary branch.

Remote absence, divergence, conflict, expired authentication and network failures are distinct from task execution. A successful local commit with a rejected push stays locally complete with synchronization pending. Do not call the model or create a duplicate commit because push failed.

Preserve work on conflict. Start remains available, retries safe transient failures and requests input when necessary; it does not force history to continue. See [recovery](recovery.md), [isolation](isolation.md) and [controls](controls.md).
