# Unattended agenda operation

[Main specification](../_main.md) · [Start](start.md)

**Once started, the agenda must keep doing useful authorized work without routine human attendance.** Keeping a daemon alive while its queue silently waits for a trivial question is not successful autonomous operation. This is a primary product requirement across scheduling, agents, harnesses, browser use, repairs and persistence.

## Attended setup, unattended work

[Initialization](initialization.md) is a finite attended phase for project intent, configuration, known access requirements and usable tools. It ends by starting the service. After that, neither the launching terminal nor a terminal/browser dashboard needs to remain open. The dashboard is a monitoring/control point, not an operator required to advance each task.

Begin the initial Expert task automatically and continue with eligible tasks and their follow-ups. Perform Manager assignment, due recurrence and goal discovery through the existing normal lifecycle. Respect legitimate future schedules, cooldowns, explicit pauses, task dependencies and an empty queue; autonomous does not mean inventing pointless work or making paid calls while idle.

## Avoid routine approval stalls

Use project intent, task instructions, established rules, available context and already granted permissions to resolve ordinary choices. Do not ask the user to repeat the task, confirm every tool call, choose routine implementation details or reapprove each instance of an explicitly authorized recurring action. For example, an authorized agenda for publishing AI news to a specified Facebook account should publish under its established rules without asking "May I post?" on each occurrence.

Selected harnesses run in their supported noninteractive/autonomous mode within the project's authority. Their permission configuration must not secretly turn unattended execution into a terminal prompt. Detect stalled subprocesses and unexpected input requests, retain diagnostics, and recover or classify the affected task rather than hang forever on invisible stdin. Do not treat ordinary lack of output during real work as proof of a stall.

Resolve recoverable technical problems automatically within bounded budgets: reconnect, back off for provider/network availability, reuse valid authentication, recheck transient browser ownership, repair check failures and resume failed persistence at the correct phase. A provider reset, remote-tunnel outage or temporary sharing error is not automatically a question for the user. Never repeat successful external effects just because saving a result failed.

## Exceptional human involvement

Create or continue an **agent-authored [human chat](user-interactions.md)** only for a concrete condition the system cannot safely resolve, such as required login/2FA, genuinely missing authority, an irreconcilable user edit, or a consequential ambiguity not settled by the task. Explain what is blocked, what recovery was attempted and the minimum action needed. Retain one actionable waiting conversation and notify through the configured channels; do not repeatedly ask the same question or require a dashboard to be open for its record to exist.

Autonomy is not blanket permission: authenticated access alone does not authorize unrelated publication, purchases, destructive changes or spending. Preserve task/project boundaries, paid-use limits, explicit review requirements and platform safeguards. Silence is never a new approval. Do not bypass authentication or weaken rules to avoid reporting an exceptional blocker.

Checkpoint blocked work and release its resources when safe so independent eligible work can continue, still with at most one executing project task. Waiting tasks are not completed tasks. If owned edits, an unresolved external effect or a shared resource make switching unsafe, report that specific project-wide blocker; never overlap mutations or hide the risk merely to keep the queue moving. After a reply or recovered prerequisite, resume the correct phase automatically without another Start/Run action.

## Continuity and observability

Persist work, waits, retry opportunities and effect evidence across process restarts. Use [recovery](recovery.md) and [startup persistence](persistence.md) rather than routine manual restarts. An explicit stop remains effective until an authorized start, including the start operation in a subsequent explicit init. Distinguish working, scheduled idle, automatic recovery, waiting for provider, task-local human wait and a genuine project-wide blocker.

Provide per-task [audit traces](traces.md), not merely a global log. Optional monitoring, tunnel or recording degradation must not unnecessarily stop otherwise safe work; report any missing evidence honestly. Resource use and retries remain bounded. A month-long unattended run is a product scenario, not a promise that a sleeping/offline machine or an expired external account can execute work.

## Acceptance outcomes

With an awake supported host, available dependencies, an authenticated selected browser and a configured, authorized recurring AI-news publishing agenda, leave all dashboards closed for a simulated month. Scheduled work and follow-ups continue without routine confirmation; returning users can inspect each result, task name, Git history and retained logs/video. Include temporary network/provider failures and restarts: work resumes without duplicated posts or model calls for idle waits.

Inject an avoidable harness confirmation and a recoverable technical failure: neither silently stops the agenda awaiting an operator. Inject genuine expired authentication or missing authority: retain one clear agent-authored waiting chat, preserve effects and continue independent work where safe. Resume after resolution without manual dispatch. Explicit review requirements and stop/pause controls remain respected.
