# Execution lifecycle

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

1. Resolve the project, sources, configuration, any Git preflight and the mutation lease.
2. Synchronize Git and run initial checks according to explicit policy.
3. Reload the task, verify source revision and eligibility, and atomically claim the occurrence.
4. If isolation is selected, create an execution worktree and remap all project/source paths. The claim remains in coordinated operational state.
5. In the execution checkout, capture initial content, index, HEAD and owned scope; record `in-progress`/occurrence start and prepare the request, Books, context and TEAM.
6. Run the harness with an event stream and cancellation. Attribute changes to the implementation phase.
7. Perform scoped normalization and selected checks. For repairable validation failures, pass precise feedback to the same task.
8. Persist phase changes and the candidate result/trace; publish completion only after mandatory steps succeed.
9. If applicable, integrate the worktree, perform explicit test-server migrations and synchronize according to the preserved policy; distinguish all outcomes clearly.
10. Release resources, retain recovery state or a durable result, and continue according to mode and limits.

Whatever the ordering of optional integration/migration relative to final state, it must not report overall success if a required step did not finish. Completed local implementation and pending remote sync must be separate fields.

## Related specifications

- [Task eligibility](eligibility.md)
- [Project checks and repairs](checks.md)
- [Attempts, retries and provider limits](retries.md)
- [Change ownership and Git persistence](git-persistence.md)
- [Mutation lease, journal and recovery](recovery.md)
- [Task isolation in a worktree](isolation.md)
- [Traces and results](traces.md)
