# Shared project browser and profile selection

[Main specification](../_main.md) · [Initialization](initialization.md) · [Project configuration](configuration.md)

Each selected project has one browser configuration and, while active, one coordinated browser instance shared by its agents. Automation ownership is **per project**, not one process per agent/task/harness; underlying **profile storage may be shared across projects** when selected. Browser website sessions and harness/model authentication are independent.

## Four explicit profile sources

Offer all four choices during attended init and equivalent noninteractive configuration:

1. **Promptbook-managed global profile (DEFAULT):** create a dedicated persistent Chrome-compatible profile in the OS user's Promptbook application-data location on first use, and reuse that Promptbook-only profile for other projects on the same machine/account. It is not the regular Chrome profile, is not copied from it and does not live in a project directory.
2. **Isolated project profile:** create/reuse an independent persistent profile under the project's ignored `.ptbk/`. No other project implicitly gets that profile.
3. **User's existing Chrome profile:** explicitly reuse the ordinary Chrome-compatible profile and its authenticated sessions. Never select/copy it implicitly.
4. **Custom existing profile path:** use a user-supplied path elsewhere on the permitted machine.

Save the per-project selection as a portable source kind in `ptbk.json`; resolve the managed global path for the current OS user at runtime. Do not version machine-specific global absolute paths or session secrets. Isolated storage is project-relative. Explicit custom paths follow precedence and existence/ownership checks. Existing selections survive reinit; the new default applies only when no choice is saved. Do not silently migrate cookies/sessions while switching; explain sharing/privacy tradeoffs.

Headless/headful is independent of profile source. `--browser-profile <path>` and `--browser-mode headless|headful` are temporary overrides, not saved-default writes. Shared controls switch safely at a boundary. All four sources retain sessions across engine/system restarts, subject to site expiry.

## Shared profiles and safe ownership

A global Promptbook profile can be reused across projects, but sharing never authorizes competing processes to lock/corrupt it. Coordinate safe handover/serialization. Never seize/copy a busy profile or kill an unrelated user browser. Each project still has one automation owner at a time. Report known busy/conflicting ownership and retry or request genuinely necessary user action. Personal/custom shared profiles require the same checks.

Profile contents, cookies and tokens never enter Git, trace text, chat Books or model-visible context as credentials. Promptbook is not a password database. Attended setup resolves known logins when possible; later login/2FA needs become attributed [human chats](user-interactions.md), with a genuine browser action on a desktop. Headless hosts must not pretend a window appeared. Preserve authorization and unattended-work constraints.

## Inspection, automatic diagnosis and recovery

The engine exposes its **effective** browser/profile source, resolved profile path, selected browser, headless/headful mode, known launch/connection health and ownership/busy state to authorized controls. Distinguish active configuration, saved defaults and pending changes. A profile path is diagnostic data, not permission to disclose its contents or credentials. Unknown/not-started state is labelled rather than inferred from a saved configuration.

Detect launch failures, lost connections and known ownership conflicts automatically. Retain the actual redacted cause/evidence, recovery actions and outcomes; use bounded safe retries/repair under ordinary [retry](retries.md) and [unattended-operation](autonomous-operation.md) rules. A healthy recovery must not depend on an open dashboard or routine human Restart clicks. Explain the remaining blocker and next retry/action when automatic repair cannot safely succeed.

Shared controls provide diagnostic recheck, retry startup and restart of the **project's owned browser**. Manual controls call the same engine-owned diagnosis/recovery operations, with visible accepted, deferred, successful or failed outcomes. Preserve selected profile and sessions; do not silently switch to a fresh profile, erase login data, kill all Chrome/Node processes or restart the engine as a substitute for browser repair.

If browser use or profile ownership makes an immediate restart unsafe, wait for a safe boundary or explain why it cannot proceed. Never terminate another project's/user's browser to satisfy a restart request. Preserve the active task's checkpoint/evidence and avoid replaying external effects after reconnect. Coordinate simultaneous automatic/manual repair so it cannot launch duplicate owners or restart the browser twice unknowingly.

The [browser detail panel](dashboard-details.md) presents this information and controls separately from compact main status. A significant failure remains visible in main attention/activity while details are closed. Runtime-only diagnostics/restarts create no Git commits; explicitly saved configuration follows normal authoring rules.

## Task evidence

When enabled, record only attributable task browser activity in headless/headful use, with separate attempts/occurrences under the task's [source-filename-based trace directory](traces.md). Mask authentication material and exclude unrelated desktop/other-project activity. Recording/video Git inclusion remain independent of profile choice. Unsupported/failed recording is explicit; optional capture failure does not unnecessarily block safe work. Neither stopping Promptbook nor restarting its browser deletes a persistent profile.

## Acceptance outcomes

Initialize two projects with defaults: both reuse the dedicated managed global profile without touching personal Chrome. Verify isolated, personal and custom sources, preserved choices on reinit, independent headless/headful/recording flags and safe concurrent ownership. Inspect the actual resolved profile in each mode. Inject launch/connection failure, observe automatic bounded recovery with no dashboard, then use recheck/retry/restart manually. Report true outcomes and deferred busy ownership; retain sessions and task provenance without unrelated kills, duplicate browser owners or secret disclosure.
