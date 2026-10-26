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

A successful panic records deliberate stopped intent and suppresses automatic respawn/startup, including watchdog/crash recovery, pending replacement starts and later OS reboot. Coordinate termination/persistence so the kill is not treated as a crash to undo. Ordinary per-engine force stop follows the same deliberate-stop rule.

Projects remain registered as `stopped`. Opening a dashboard or rebooting does not undo this intent. A later explicit individual/bulk start re-enables operation through the ordinary launcher. Panic does not forget projects or delete their files, tools, sessions or recovery state.

## Results

Attempt independent targets without waiting for another target's graceful response. Report actual terminated/failed/unconfirmed results, including any failure to persist startup suppression. Connection loss alone does not prove all owned processes ended. State permission-limited coverage honestly; never claim inaccessible engines stopped. One failed target must not prevent attempts for others.

No active engines is a successful zero-target result. Runtime/registry changes create no project Git commits. Panic finishes with its result without opening dashboards or starting replacements.

## Acceptance outcomes

Start projects through different installations/modes, including paused, draining and no-HTTP owners with active harness/browser children. Decline panic: nothing changes. Confirm and repeat with `--yes`: verified owned execution stops immediately without graceful completion, while unrelated Node/browser processes survive. Exercise unresponsive owners, stale/reused PIDs and one failed target without blocking others.

After panic, observe retained stopped entries, wait for supervisor recovery and reboot: none automatically restarts. Explicit individual/bulk start works again without data deletion or duplicate owners. Verify ordinary force stop shares owned-process and deliberate-stop semantics. Reject `--soft`/`--pause`; noninteractive invocation without `--yes` never prompts/mutates. Report permissions, termination uncertainty and startup-suppression failure truthfully.
