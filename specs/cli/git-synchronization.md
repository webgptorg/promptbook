# Git synchronization

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

Pull/push have separate outcomes. A missing remote, divergence, conflict, authentication or network failure must not be confused with the implementation result. Local completion with a rejected push remains locally completed with synchronization pending; do not call the model again because of it.

Enabled auto-pull performs standard `git pull --rebase` before refreshing the queue between rounds, preserving ownership guards and using no autostash. In isolation, never push the temporary branch; push only from the original branch after successful integration. A pull conflict stops further unsafe mutations and preserves state for manual resolution.

## Related specifications

- [Change ownership and Git persistence](git-persistence.md)
- [Task isolation in a worktree](isolation.md)
- [Mutation lease, journal and recovery](recovery.md)
- [Traces and results](traces.md)
