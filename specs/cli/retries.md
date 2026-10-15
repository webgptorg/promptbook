# Repair budgets and provider waiting

[Main specification](../_main.md) · [Unattended operation](autonomous-operation.md)

Distinguish check-feedback repairs from technical retries. Defaults allow three implementation/repair attempts for one task, and an initial technical attempt plus at most three technical retries. Show why each extra call occurs and account for the combined budget; nesting mechanisms must not silently multiply paid calls.

Reuse valid authentication and safe native refresh capabilities. Genuinely missing login or required human authentication needs setup, not repeated model attempts. Quota waiting uses reported availability/reset information where available, otherwise bounded backoff. Recheck automatically before resuming; provider availability returning must not require another Run action. Unknown quota is neither zero nor unlimited. Waiting respects pause, cancellation and user controls without paid idle polling.

An unanswered durable User request is a human wait, not failed acceptance requiring another implementation attempt. Do not rerun that task's agent or consume its repair/technical retry budgets while unresolved. This does not forbid safe independent work. Unexpected hidden harness prompts and stalled subprocesses are detected and classified, not left indefinitely waiting on unattended stdin.

Provider process/turn failures are evaluated at their terminal boundary: failed individual tool observations and echoed instructions cannot turn a valid completed turn into a process failure. Actual terminal errors, nonzero exits, signals and unmet requested-outcome evidence remain distinct and must not be stamped complete.

Commit, signing, disk and push failures are not reasons to repeat successful model work. Resume the failed phase automatically when safe, preserving task identity, effect evidence and distinct attempt records. Escalate only the specific condition that remains genuinely unresolved; do not make manual recovery the normal response to transient failure. The daemon stays available, continuing independent work where safe; finite commands return a clear incomplete or unsuccessful outcome.

See [checks](checks.md), [harnesses](harnesses.md), [recovery](recovery.md) and [traces](traces.md).
