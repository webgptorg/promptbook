# Emergency stop: `ptbk panic`

[Main specification](../_main.md) · [Global controls](global-dashboard.md) · [Service lifecycle](service-lifecycle.md) · [Startup persistence](persistence.md)

`ptbk panic` immediately force-stops all accessible active Promptbook engines on the local host, independently of CWD, installation and package version. Include foreground/background owners in `running`, `pausing`, `pause` and `stopping`, including pending restarts. Use the same whole-engine force-stop operation as `ptbk stop --force` and global Force stop all.

## Confirmation and input

Before changing anything, explain that all affected local engines and owned execution processes will be forcibly terminated and require explicit confirmation. One confirmation covers the operation. Declining/cancelling changes neither processes nor startup intent.

`ptbk panic --yes` explicitly skips confirmation and starts the emergency action immediately. Noninteractive/redirected invocation requires `--yes`; otherwise fail actionably without hidden input. No initialized project or working engine API is required. Diagnose conflicting project selectors rather than silently restricting scope.

There are **no `--soft` or `--pause` variants**; diagnose those unsupported flags. Graceful Stop all and Pause all use the global dashboard's shared ordinary operations.

## Termination and durable stop

Use verified [host discovery](global-dashboard.md), not process-name matching or blanket Node/Chrome kills. Terminate each selected engine and every execution process it owns, including active harnesses, helpers and exclusively owned browsers. Shared-profile browser connections are released under [pool ownership](browser.md); when all connected engines are stopped, the now-unused managed process closes. Preserve any remaining unrelated/external users. No owned worker may continue merely because its parent exited. Unrelated processes/browsers and externally owned resources stay outside that scope.

Do not wait for tasks, checks, chat turns or graceful draining. An unresponsive engine or unavailable HTTP endpoint must not make emergency termination depend on an acknowledgement. Shared force stop handles verified owned termination and bounded best-effort cleanup; an uncatchable kill has no cleanup guarantee. Preserve available interruption evidence and never mark unfinished work complete.

A successful panic records inactive work intent, terminates the current service and suppresses immediate watchdog/pending replacement. Keep enabled persistence registration: next OS startup restores these projects directly paused for control, never to execute queued tasks. Per-project force stop has the same contract.

Projects remain registered as actually stopped after the command. Opening a dashboard never starts them. A later explicit Start can launch sooner; Start paused launches only availability, and Resume of a restored paused owner is subject to Health. Preserve all files, tools, sessions and recovery state.

## Results

Attempt independent targets without waiting for another target's graceful response. Report actual terminated/failed/unconfirmed results, including any failure to persist startup suppression. Connection loss alone does not prove all owned processes ended. State permission-limited coverage honestly; never claim inaccessible engines stopped. One failed target must not prevent attempts for others.

No active engines is a successful zero-target result. Runtime/registry changes create no project Git commits. Panic finishes with its result without opening dashboards or starting replacements.

## Acceptance outcomes

Start projects through different installations/modes, including paused, draining and no-HTTP owners with active harness/browser children. Decline panic: nothing changes. Confirm and repeat with `--yes`: verified owned execution stops immediately without graceful completion, while unrelated Node/browser processes survive. Exercise unresponsive owners, stale/reused PIDs and one failed target without blocking others.

After panic, verify no immediate supervisor/pending replacement, then reboot: registered persistent services are inspectable paused with zero queued claims until explicit Resume. Removed/no-persist entries do not auto-launch. Preserve owned termination and data; reject soft/pause variants and hidden noninteractive confirmation.
