# Repair budgets, fallback and provider waiting

[Main specification](../_main.md) · [Unattended operation](autonomous-operation.md) · [Automatic repair](../concepts/automatic-repair.md)

Distinguish check-feedback repairs, deterministic technical recovery and selection of an already authorized fallback tool. Defaults allow three implementation/repair attempts for a task and an initial technical attempt plus at most three technical retries. Explain extra calls and account for the combined budget; nested mechanisms must not multiply paid attempts invisibly.

On a named harness failure/quota limit, use the eligible [same-variant fallback chain](tools.md) in array order, respecting task/account/model constraints and paid authority. Do not wait through an exhausted first account's reset while an authorized appropriate fallback is available. Different variants can be selected for suitability under routing constraints. Ambient credentials or installed integrations never create an unapproved fallback.

Reuse valid authentication and supported safe refresh. Genuinely missing login/2FA needs the ordinary human/authentication path, not repeated model calls. If no candidate is usable, wait using reported reset/availability where known or bounded backoff; recheck without paid idle polling. Unknown quota is neither zero nor unlimited. A recovered earlier instance regains priority at later selection without interrupting already acquired work. New tools can resolve a wait without restart.

An unanswered durable User request is a human wait, not failed acceptance requiring another model attempt. Do not consume that task's budgets while unresolved; safe independent work may continue. Detect unexpected hidden prompts and real stalled subprocesses rather than hang on unattended stdin. Lack of output during legitimate activity alone is not proof of stall.

Evaluate provider process/turn failure at its terminal boundary. Individual failed tool observations or echoed instructions do not automatically turn a completed turn into process failure. Actual terminal errors, nonzero exits, signals and unmet task outcomes remain distinct and cannot be stamped complete.

Commit/signing/disk/push failures do not rerun successful model work or effects. Resume the failed phase with ownership and evidence preserved. Remote synchronization retries have their own bounded coordinator/backoff and do not block otherwise safe local tasks/commits. Preserve normal pause/stop intent throughout.

Apply deterministic corrections first and hand unresolved/judgment-dependent problems to ordinary Fixer under the core automatic-repair principle. Its Book/TEAM governs consultation, not a new channel or unconditional user prompt. With no execution resources, retain the visible pending repair rather than claiming Fixer ran. The daemon stays controllable; finite commands can return an honest incomplete outcome. See [checks](checks.md), [harnesses](harnesses.md), [recovery](recovery.md) and [traces](traces.md).
