# Work and completion in one commit

[Main specification](../_main.md)

With automatic commits, each completed task or recurring occurrence produces one result commit. It contains the task's accepted changes, check/formatter changes, completion stamp and newly generated follow-up definitions. Do not split one task into implementation and checker commits. Failed attempts remain recoverable evidence, not completed task commits.

The task title is the commit subject; its descriptive assignment, including task-local rules, is the body. Preserve that correspondence rather than substitute a generic summary or execution metadata. The task record identifies completion time. Even work that requires no content improvement can commit its completion record.

Commit only changes attributable to the task and authorized setup, preserving unrelated staged and unstaged work. Do not use blanket staging, destructive cleanup, automatic stashing, history rewriting or force-push to manufacture success. Respect hooks, signing and ignore rules. Validate the content being committed; unexpected edits after checking require reconciliation.

Start may refuse a dirty initial workspace. After startup it manages its own uncommitted changes and recovers interruptions rather than treating every owned change as a fatal dirty-tree error. Concurrent user edits remain protected. An ambiguous boundary blocks unsafe progress while the supervisor stays available.

For finite run, preserve `--git-changes fail|ignore|continue`: refuse unrelated dirty state by default, retain it under ignore, or resume exactly one proven interrupted task under continue. No option transfers ownership of unknown changes. Explicit `--no-commit` reports completed-but-uncommitted work and cannot be used for the automatic start loop.

Respect configured Git identity/signing, including `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, `CODING_AGENT_GIT_SIGNING_KEY` and `CODING_AGENT_GPG_KEY_ID`; report the effective identity when falling back to Git configuration.

A full revert reverses both result and completion when both were in the commit. If the task was also created there, it may be removed instead of reopened. Git does not undo browser actions or other external effects; never repeat them solely because a completion stamp disappeared.

See [checks](checks.md), [recovery](recovery.md), [Git synchronization](git-synchronization.md) and [isolation](isolation.md).
