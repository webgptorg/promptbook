# A failed final commit can leave a `ptbk coder` PRD marked done

Found while updating the Coder landing-page explanation of synchronized PRD status and code. This is outside that copy-focused task, so no workflow behavior was changed.

## What happens

[`finalizeSuccessfulPromptRound`](../scripts/run-codex-prompts/main/runPromptRound.ts) currently performs these operations in this order:

1. Calls `markPromptDone`, changing the PRD status to `[x]`.
2. Writes the PRD markdown file.
3. Calls `commitChanges` for both the PRD file and the files changed by the agent.

Normally this gives the intended result: the code and its `[x]` PRD status share one commit. However, if `commitChanges` fails (for example because of a Git hook or an unavailable signing key), the outer retry/failure handling cannot change the already-written `[x]` status back. [`writePromptStatusLine`](../scripts/run-codex-prompts/prompts/writePromptStatusLine.ts) only rewrites `[ ]` and `[^]` lines, so later calls to `markPromptInProgress` or `markPromptFailed` leave `[x]` untouched.

After all retries fail, the working tree can therefore contain a PRD marked done without the successful commit that should bind it to the implementation.

## Suggested fix

Only finalize the `[x]` status as part of a successful commit transaction. For example, preserve an in-progress status until the code and PRD update can be staged, or restore a failed status when committing throws. Add a regression test where `commitChanges` rejects and assert that the PRD does not remain `[x]`.

This matters because Coder's most valuable default invariant is that reverting a completed task's commit restores both its code and its PRD state together.
