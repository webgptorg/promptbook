# Repair budgets and provider waiting

[Main specification](../_main.md)

Distinguish check-feedback repairs from technical retries. Defaults allow three implementation/repair attempts for one task, and an initial technical attempt plus at most three technical retries. Show why each extra call occurs and account for the combined budget; nesting mechanisms must not silently multiply paid calls.

Authentication needs setup, not repeated model attempts. Quota waiting uses reported availability/reset information where available, otherwise bounded backoff. Recheck before resuming. Unknown quota is neither zero nor unlimited. Waiting respects pause, cancellation and user controls without paid idle polling.

An unanswered durable User request is a human wait, not failed acceptance requiring another implementation attempt. Do not rerun the agent or consume repair/technical retry budgets while that clarification is unresolved. Provider process/turn failures are evaluated at their terminal boundary: failed individual tool observations and echoed instructions cannot turn a valid completed turn into a process failure. Actual terminal errors, nonzero exits, signals and unmet requested-outcome evidence remain distinct and must not be stamped complete.

Commit, signing, disk and push failures are not reasons to repeat successful model work. Resume the failed phase when safe; otherwise request recovery. The daemon stays available while blocked, and finite commands return a clear unsuccessful outcome.

See [checks](checks.md), [harnesses](harnesses.md), [recovery](recovery.md) and [traces](traces.md).
