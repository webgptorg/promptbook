# Browser tools and profile selection

[Main specification](../_main.md) · [Tools](tools.md) · [Live tool use](tool-runtime.md) · [Initialization](initialization.md)

A project may configure **multiple named browser tools**. Each enabled/acquired instance has coordinated automation ownership shared by the project's agents, not a separate browser per agent/task/harness. Browser storage may also be shared across projects when explicitly selected. Browser website sessions and harness/model authentication remain independent.

Normal init still configures one browser through its familiar simple choices. More profiles, accounts and browsers are added later through the common [tool management](tool-management.md). No advanced pooling wizard is required.

## Four explicit profile sources

Each browser tool stores `profile.source` and, where appropriate, `profile.path`:

1. **MANAGED_GLOBAL (default):** a dedicated persistent Chrome-compatible profile in the OS user's Promptbook app-data location, reused by that user's projects. It is not personal Chrome, is not copied from it and does not live in a versioned project directory.
2. **PROJECT:** an isolated persistent profile under the project's ignored `.ptbk/`, with separate storage for separately configured instances unless sharing is explicit.
3. **USER_EXISTING:** the user's explicitly selected ordinary Chrome-compatible profile and sessions, never selected/copied implicitly.
4. **CUSTOM:** an explicit existing profile path on the permitted machine.

Resolve portable sources at runtime. Preserve existing selections/sessions on reinit and migration; never silently copy cookies when switching. Explain sharing/privacy tradeoffs. Multiple records referencing the same underlying profile do not constitute separate logged-in identities and still obey exclusive safe ownership. Distinct Facebook accounts require distinct profile/session contexts.

`isHeadless` is independent of profile source and defaults to the existing headless behavior. Temporary legacy `--browser-profile` and `--browser-mode headless|headful` overrides apply only when their target instance is unambiguous; with multiple browsers require an explicit named target rather than silently modifying all. Saved management uses per-tool fields. All sources retain sessions across engine/system restarts, subject to actual site expiry.

## Choosing and owning browsers

Use task purpose, tool names/descriptions, permissions and actual session state to choose the appropriate browser. A project can prefer its dedicated browser, then try an explicitly configured personal browser when the needed login is absent, or route Facebook and LinkedIn work to separate profiles. A fallback must still match the intended account and authorized action; a logged-in different account is not automatic permission to post/pay from it.

Coordinate use of each profile across instances/projects; never corrupt a busy profile, seize/copy it, kill an unrelated browser or bypass another owner. Keep actual in-use/draining state per named tool. Disabling/removal affects new selections; a previously acquired use may continue only under [in-use confirmation rules](tool-management.md). Removing a configuration record never deletes its profile.

Cookies, tokens and profile contents never enter Git, text traces, chat Books or model-visible credentials. Promptbook is not a password database. Resolve known login needs during attended setup where possible; later login/2FA uses ordinary human interaction. Headless hosts must not pretend a desktop window appeared.

## Inspection and recovery

Expose each tool's saved and effective variant/profile source, resolved path for authorized inspection, headless mode, launch/connection health, ownership and current/retained uses. Distinguish configured, enabled, not-started, usable and actually active. A path is diagnostic information, not permission to expose its contents. Also identify which browser the current task actually uses, rather than displaying the first saved browser as active.

Automatically diagnose launch failures, lost connections and ownership conflicts. Preserve actual redacted evidence, recovery attempts and outcomes; use bounded retries and the shared [automatic repair principle](../concepts/automatic-repair.md). Recovery cannot depend on an open dashboard or routine Restart clicks. Explain a remaining blocker and next retry/action.

Manual recheck, retry-start and restart target one named **project-owned browser** and call the same engine-owned recovery operations. Preserve profile/session state, task checkpoints and effect evidence. Do not switch to an empty profile, erase data, kill all browsers or restart the whole engine as a substitute for one-browser repair. Defer an unsafe restart to a safe boundary and label it; never terminate another project's/user's browser. Coordinate automatic/manual recovery to avoid duplicate owners or duplicate effects.

The [tools/browser detail view](dashboard-details.md) shows these controls with compact failure summaries in the main cockpit. Inspection and runtime repair create no commit; explicitly saved tool changes do. No enabled/usable browser is a running engine's resource wait, not evidence that the service is stopped.

## Task evidence and acceptance

Record only attributable activity from the browsers actually used by the task when [recording is enabled](trace-configuration.md). Separate tool/attempt attribution under the task's source-filename trace directory; exclude unrelated desktop and other-project activity and mask authentication data. Recording failure is explicit but need not block otherwise safe work. Stopping/restarting a tool or engine never deletes persistent profiles.

Verify default managed-profile reuse, isolated/personal/custom sources, multiple website/account profiles, preserved migration choices and safe shared-profile ownership. Add a new usable browser during a task and select it without restart. Test per-instance diagnostics, bounded automatic recovery, manual restart, retained in-use configuration and last-enabled-browser confirmation. No operation may silently change the target account, disclose secrets, duplicate effects or kill unrelated browsers.
