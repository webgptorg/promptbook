# Live tool availability and active-work consistency

[Main specification](../_main.md) · [Tools](tools.md) · [Tool management](tool-management.md) · [Service lifecycle](service-lifecycle.md)

## Refresh without restart

Re-read applicable `ptbk.json` and `.env` changes and re-evaluate tool readiness **before every task**, not only at startup. Also detect and apply changes promptly while work is active or the engine is idle/waiting, including changes made manually, through another terminal, dashboard, or Git synchronization. A waiting engine cannot require a task to start before noticing the tool needed to start that task.

Share configuration version checks, tolerant canonicalization and validation. Expose the actual effective revision and diagnostics rather than a stale startup list. A transient/invalid external edit is reported and repaired; it must not silently change account identity, reuse a known revoked credential or crash the supervisor. Retain safe known state only where doing so does not contradict an explicit disable or removal.

A newly added or enabled usable tool becomes available to **the currently running task** at its next applicable tool selection. Do not freeze the whole tool registry for the duration of a task. For example, a user adds the browser with the intended website login while an agent is working; the agent can then use it without a task restart or replay. An already dispatched external call need not be magically rewritten, but subsequent selections see the new inventory.

## Retained active uses, not frozen registries

Once work has acquired a browser or harness tool, a confirmed modification/disable/removal may preserve that use's original configuration, credential context and safe owned resources until that work releases them. This is the meaning of tool-command `--force`, not termination. The changed saved configuration is committed immediately and governs new selections; the retained old instance is visibly draining/current-work-only. Other newly added tools remain usable during that same task.

Do not resurrect a removed tool into the saved configuration when the task completes. An externally revoked key, killed browser or removed authentication store may make continuation impossible; record the real failure and use normal recovery rather than pretending the snapshot guarantees access. Retained secret material is runtime-only and redacted, not copied into task Books, configuration, traces or Git.

For browser/harness tools, manual/external file edits cannot display a pre-edit CLI confirmation. Diagnose an affected in-use tool, honor the new configuration for future acquisition, and make the retained current use visible with the ordinary service force-stop action available. Do not invent implicit panic behavior. `ptbk stop --force` stops the whole engine and is the explicit emergency path; removing/disabling a tool alone is not proof an in-flight external effect was cancelled.

## Computer Control revocation and human priority

Computer Control does not retain desktop access after disable/remove. The live engine interrupts its active input, invalidates observations and blocks new screenshot/accessibility/clipboard/input calls before waiting for saved-operation persistence. Manual/Git changes are honored on live refresh and during native execution. `--force` never grants continuation of revoked desktop use. A cancelled or partial operation may already have changed the outside world; reconcile the real state before retrying.

Every project on one logged-in desktop shares human priority and bounded desktop episodes. Brief physical input interrupts automatic input, permits observation and returns automatically after five seconds of inactivity. Explicit pause/takeover stops automatic input and observation until owner resume; emergency stop stops both session-wide. These latches survive process restart and are distinct from whole-engine `ptbk panic`. Independent browser/terminal work can continue when only desktop control is paused. See the [desktop contract](computer-control.md).

## Running with no usable resources

Before each new task, require the baseline enabled/usable browser and harness and the task's specific routing, model, profile and authorization requirements. Failed baseline readiness prevents that new claim, not the engine's existence. An unavailable optional `COMPUTER_CONTROL` tool does not create a baseline tools wait; only work actually needing desktop access waits for it. An empty or unusable inventory is a normal observable **waiting for tools** reason alongside an empty queue or provider wait; it is not a fifth lifecycle state, technical pause or a failed start of an otherwise initialized service.

Keep dashboard/API controls, configuration refresh, bounded readiness rechecks and authorized maintenance alive. Unknown-availability waits use [progressive waiting](../concepts/progressive-waiting.md) and relevant configuration/readiness events; preserve domain-appropriate timing and never turn an unchanged unavailable tool into paid idle polling. Show which type/instance is missing, disabled, unavailable, signed out or quota-limited, and the concrete enable/add/repair action. Do not spin, make paid probes while idle or automatically re-enable deliberately disabled tools. Start may show this warning but still report the running service truthfully. Once usable resources appear, reevaluate and continue without another Start action, while respecting explicit pause/stop.

## Operation and Git ownership

Coordinate all configuration mutations and commits independently from concurrently executing tasks under [per-file ownership](concurrency.md). A supported history is: task begins; another client adds a tool and its own commit; the task uses that tool; the task's result commit follows. The tool commit contains no unfinished task changes and the result does not remove or duplicate the earlier commit. Preserve unrelated index/working-tree edits even when configuration and task work touch the same file; use scoped ownership/reconciliation rather than blanket staging or old-snapshot restoration.

Apply [same-variant fallback](tools.md) using the latest eligible inventory, with bounded health rechecks and actual instance/account attribution. Explicit task constraints and already completed external effects remain authoritative. Fixer uses these same resources and constraints; lack of a harness cannot be solved by pretending Fixer ran without one.

## Acceptance outcomes

Start with zero enabled browsers or harnesses: the service stays running and reports its resource wait. Add/enable from another terminal or edit the files while idle; work resumes without restart. Add a usable resource during a task and use it at its next selection. Modify/disable/remove an in-use tool with the required acknowledgements: keep the retained use distinct from the new saved state and never expose it to an unrelated new task. Test secret rotation, external revocation, two simultaneous writers and a task touching configuration, with isolated commits and truthful recovery.

Computer Control acceptance separately verifies immediate revocation, physical-input interruption/automatic return, explicit pause including observation, and cross-project emergency stop without interrupting independent browser/terminal work.
