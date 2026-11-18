# Environment references and non-destructive secret editing

[Main specification](../_main.md) · [Tools](tools.md) · [Tool management](tool-management.md) · [Git persistence](git-persistence.md)

## References, never inline keys

An API tool stores `apiKey: "${{ env.VARIABLE_NAME }}"` in `ptbk.json`. Resolve it at execution time from the process environment or the project's ignored `.env`; an explicitly supplied process-environment value takes precedence over the file. Report which source is effective without revealing its value. Changing a parent shell cannot magically change an already running process's inherited environment; project `.env` edits and tool changes must nevertheless be reloaded without restart.

Support only this bounded environment-reference notation, including optional surrounding whitespace inside the delimiters. It is not the GitHub Actions expression language, a JavaScript evaluator, shell expansion or permission to execute code. The variable name must be a valid supported environment identifier. A missing/empty required value makes that instance unavailable and invokes normal fallback/repair; never send the reference string as the actual credential or fall back to an unrelated key.

The versioned configuration, commits, traces, API snapshots and diagnostic output retain the reference only. Never persist a resolved key there, echo it in an error, include it in a commit message or interpolate it into logged commands. Inline credential values are invalid and handled without reproducing the secret. Native login stores, browser sessions and process-level credentials remain separate from `.env` editing.

Wallet website usernames/passwords use [encrypted project storage](wallet.md), not plaintext `.env` entries. Its project root, recovery words and host unlock secrets are not exported as environment references. Existing harness API keys retain the present contract; this version does not silently move them into Wallet.

## Audit trail inside .env

Because `.env` is not in Git, every engine-authored addition or modification must include an adjacent comment with an unambiguous timestamp (including timezone), reason and affected operation/tool where applicable. Put that comment immediately above the added assignment or the newly commented-out assignment. The comment contains no secret value.

Never delete an existing assignment or its history. To change a value, retain the old assignment commented out with a timestamped explanation, then add the new active assignment with its own explanation. To retire an unused credential after tool removal, comment it out and explain when and why. Keep unrelated lines, comments, formatting, quoting, newline conventions and content intact; do not parse the file into a dictionary and regenerate it destructively. Never source/execute the file as shell code.

Disabling a tool never comments out or removes its credentials. Removing one tool does not imply its environment variable is unused: consider every remaining reference, including disabled tools, project scripts and other known consumers. If **anything** uses it, or complete non-use cannot be established safely, leave it active. Do not alter an inherited process variable or another application's/native account store. An engine-managed reference with proven no remaining consumer may be retired by commenting, never deletion.

Evaluate the **whole post-operation `ptbk.json`**, not only its remaining `tools` array. A check command or another configuration field using the variable is a consumer, including when that use is an uncommitted working-copy edit. Exclude the removed tool's own reference, not the entire configuration file. Failed/incomplete consumer discovery is uncertainty, not proof of non-use. Recheck consumers at the coordinated write boundary before retiring an assignment.

Ambiguous duplicate assignments, incompatible syntax, stale concurrent edits or uncertain value ownership are repair problems; do not choose a destructive interpretation. Preserve existing environment-variable names rather than applying tool-name normalization to them.

## Coordinated changes and secret input

Use one shared safe editor for init, CLI and dashboard, with coordinated writers, revision/conflict detection and atomic file replacement where available. Prepare and validate the intended configuration/environment changes together, preserve restricted file access, and leave a recoverable outcome if either persistence step fails. Do not report a tool as ready when its required secret was not safely stored. Retrying must not duplicate assignments or audit comments for the same completed edit.

Coordination covers the complete read/modify/replace operation across separate CLI processes as well as a running engine; an in-process Git lock or an atomic rename alone is insufficient. Detect a changed on-disk revision before replacement, including edits from an external editor. Re-read and safely reapply independent changes, or report a recoverable conflict without overwriting the newer content. Two successful independent edits must preserve both results and their audit history. Apply the same protection during recovery after a later persistence failure.

Ensure `.env` and sensitive local stores are ignored before writing secrets. If a file is already tracked, ignore rules alone do not untrack it: preserve it, report the problem and require safe remediation; never commit the secret or silently rewrite Git history. Configuration/ignore-rule changes belong to their scoped commit; `.env` itself never does.

This protection also applies when **only the secret value changes** and the tool's serialized configuration is unchanged. Persist and verify any required effective ignore rule before storing the secret, and commit the authorized ignore-rule change even when `ptbk.json` needs no edit. Merely preparing an ignore-rule patch is not protection and must not produce a success message. If protection cannot be established, leave the previous `.env` content intact and report the failure. A successful secret-only rotation with no versioned changes records its audit inside `.env` and creates no empty Git commit.

Prefer existing environment references. New secrets are accepted through concealed interactive input or an explicitly selected protected stdin path, not ordinary command-line arguments that enter shell history. Dashboard responses must not echo submitted values. Annotate additions just like removals and replacements. Tool management commits only non-secret configuration and related authorized metadata.

## Acceptance outcomes

Resolve a reference from environment and from `.env`, verify precedence and refresh, and reject missing/invalid references without secret disclosure. Add, rotate, remove and disable tools sharing a key; preserve all historical assignments and annotate each real edit. A disabled or unrelated known consumer keeps the variable active; uncertainty also keeps it active. Race two edits, interrupt persistence, and inspect malformed/duplicate assignments and an already tracked `.env`: preserve content and report recovery, with no secret in Git, logs, output or API state.

The following regression cases are required through the shared editor/management operations:

- Rotate an existing API tool's key without changing its reference or any tool field, with `.env` untracked but not ignored. The effective ignore rule is saved before the secret, its versioned change receives a scoped commit, and unrelated work remains uncommitted. With protection already present, the same rotation produces no empty commit. An injected protection-write failure leaves the previous secret file unchanged and reports no successful protection/rotation.
- Remove the only tool referencing an engine-managed key while a `ptbk.json` check command still uses it. The key remains active. Repeat with that consumer present only in the working copy and with consumer discovery failing: neither case may retire the key. A proven unused engine-managed key is still retired by commenting, preserving history.
- Start two writers from the same `.env` revision, including separate processes, adding different variables. If both report success, both assignments and audit comments survive. Insert an external edit between read and replacement and verify it is preserved. Conflicting writes must be detected and safely retried or reported as conflicts; atomic replacement must never conceal a lost update.
