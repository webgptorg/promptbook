# Unattended agenda operation

[Main specification](../_main.md) · [Start](start.md) · [Automatic repair principle](../concepts/automatic-repair.md)

Follow the engine's [autonomy and minimal-interruption principle](../concepts/engine-and-project.md#autonomous-operation-and-minimal-interruption). **Once started, the agenda should keep doing useful authorized work without routine human attendance.** An alive service silently waiting for trivial decisions does not satisfy this primary product requirement. The separate [automatic-repair contract](../concepts/automatic-repair.md) is a first-class foundation across scheduling, configuration, migrations, tools, execution, persistence and synchronization, not an incidental Fixer implementation detail.

## Attended setup, unattended work

Init is finite attended setup for intent, choices, known access and initially usable tools. It ends with background start, without needing an open launching terminal/dashboard. The cockpit observes and directs work; it is not an operator required to advance every task. The simple check placeholder is honest absent automated validation, not another setup question or readiness gate.

Begin Expert bootstrap and continue eligible work/follow-ups, Router assignment, recurrence and due discovery through the ordinary lifecycle. Respect schedules, cooldowns, explicit pause/stop, dependencies and legitimate idle. Autonomy does not mean pointless work or paid calls while waiting.

## Ordinary recovery before human decisions

Use task intent, project rules, existing context and granted authority to resolve routine choices. Do not repeat every task question, tool approval or permission for an already authorized recurring action. Harnesses use supported noninteractive execution within project scope; detect real hidden prompts/stalls without treating normal silence as failure.

Resolve deterministic problems safely, with bounded reconnect/retry/backoff, native refresh, tool fallback, profile ownership checks, check repair and correct-phase persistence retry. Known configuration spelling fixes commit their scoped changes. Difficult/ambiguous problems route to ordinary Fixer, which can consult other agents and by default User, learning verified preferences through normal Teacher work. The user may customize its all/some/no-consultation policy; no privileged worker or special question channel is introduced.

A missing/disabled/unavailable browser or harness is a concrete resource wait, not technical engine exit or pause. Refresh tools/configuration/`.env` before tasks and during active/idle states; newly added tools may serve current work. Do not undo deliberate disablement. Fixer also needs resources: preserve its pending problem rather than pretending it executes without a harness.

Git synchronization is independent of local execution. Failed pull/push stays pending with backoff while safe local tasks and commits continue. Preserve dirty work, use visible immutable merges and hand difficult conflicts to the shared repair path. Do not rerun successful external effects just because saving/publishing a result failed.

## Genuine human involvement and authority

An agent can ask its team when a problem requires help under its current instructions, such as a human-only login challenge, missing authority, an irreconcilable user edit or consequential ambiguity. Website username/password entry uses [Wallet](wallet.md), automatically applying stored credentials or requesting one protected input, never a chat password. Retain the ordinary attributed question with context and minimum needed action; suppress repeated unresolved notifications for the same condition. Transport/presentation follows existing [human interaction](user-interactions.md), not a new autofix-specific mechanism.

Minimal user interruption is a default policy, not permission to ignore explicit review instructions or remove the user from decision-making against their wishes. Authenticated access alone never authorizes unrelated purchases/publication/destruction, extra billing accounts or bypassing safeguards. No consultation policy can invent missing authority or treat silence as approval.

Checkpoint task-local blockers and release resources where safe so independent work can continue under the shared capacity and per-file ownership contract. Waiting is not completion. If shared edits or uncertain external effects make switching unsafe, report the actual affected files/effects instead of overlapping conflicting mutations; keep other safe work, supervision and controls available. A failed synchronization alone is not such a blocker; preserve/defer remote integration safely. Resume the correct phase after repair/reply without another Start/Run action.

## Continuity and acceptance

Persist work, waits, retry opportunities and effect evidence across restarts under [recovery](recovery.md) and [startup persistence](persistence.md). Deliberate stop remains effective until an authorized start. Distinguish active work, scheduled idle, resource/provider waits, automatic recovery, human waits and real unsafe ownership.

Retain per-task [traces](traces.md). Optional recording degradation must not unnecessarily halt safe work; report missing evidence honestly and keep resources/retries bounded. Extended unattended operation is not a guarantee that a sleeping machine, revoked account or unavailable provider can perform work.

With an awake supported host and an authorized recurring publishing agenda, simulate a month without dashboards: eligible work continues without routine confirmation and retained task/Git evidence explains outcomes. Inject provider/network failures, hidden prompts and restarts; recover without duplicated publication or idle paid loops. Inject genuine authentication/authority requirements and honor configured consultation policy. Disable the last tool, observe a running wait, then add one from another terminal and resume automatically. Preserve explicit pause/stop and review requirements throughout.

Completed setup with the agenda’s required integrations/access must suffice without a mandatory later dashboard configuration visit. An explicitly skipped optional integration remains an honest access limitation. Adapt authorized workflows to recoverable service/interface changes rather than ask for the same authority again. Immediate retry budgets lead to [cause-aware repair/rechecks](retries.md), not a routine “Should I retry?”. Preserve independent [action audit](action-log.md) even with ignored traces.

Acceptance also simulates a year-long publishing agenda with service changes and an accounting agenda with already-authorized submissions. Recover from outages longer than the immediate budget without routine reapproval, duplicate effects or paid idle loops.
