# Repair budgets and provider waiting

[Main specification](../_main.md)

Distinguish check-feedback repairs from technical retries. Defaults allow three implementation/repair attempts for one task, and an initial technical attempt plus at most three technical retries. Show why each extra call occurs and account for the combined budget; nesting mechanisms must not silently multiply paid calls.

Authentication needs setup, not repeated model attempts. Quota waiting uses reported availability/reset information where available, otherwise bounded backoff. Recheck before resuming. Unknown quota is neither zero nor unlimited. Waiting respects pause, cancellation and user controls without paid idle polling.

Commit, signing, disk and push failures are not reasons to repeat successful model work. Resume the failed phase when safe; otherwise request recovery. The daemon stays available while blocked, and finite commands return a clear unsuccessful outcome.

See [checks](checks.md), [harnesses](harnesses.md), [recovery](recovery.md) and [traces](traces.md).
