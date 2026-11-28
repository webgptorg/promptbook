# Browser tools, shared profiles and login

[Main specification](../_main.md) · [Tools](tools.md) · [Live tool use](tool-runtime.md) · [Wallet](wallet.md) · [Live tab control](browser-tab-control.md)

A project may configure multiple named browser tools. The browser sub-engine belongs to that project; the **browser process for an actual profile can be shared by several project engines**. Browser sessions and harness/model authentication remain independent. Ordinary init keeps simple choices; additional profiles/accounts use shared tool management.

## Profile sources and modes

Each tool stores `profile.source` and applicable `profile.path`:

1. **MANAGED_GLOBAL (default):** persistent dedicated Chrome-compatible profile in the OS user's Promptbook app-data location, reused across that user's projects. Never implicitly use/copy personal Chrome.
2. **PROJECT:** persistent isolated profile under ignored project `.ptbk/`; separately configured instances have separate storage unless sharing is explicit.
3. **USER_EXISTING:** an explicitly selected ordinary Chrome-compatible profile/session.
4. **CUSTOM:** an explicit existing permitted profile path.

Resolve portable locations at runtime and preserve choices/sessions on reinit/migration. Do not copy cookies when switching. Multiple records resolving to one actual profile share one logged-in context; a project can explicitly choose isolation, but cross-project account/session interference is [known and deferred](known-limitations.md), not a reason to require isolation now.

`isHeadless` is independent of source and defaults to existing headless behavior. Legacy `--browser-profile`/`--browser-mode headless|headful` overrides need an unambiguous named target. Report effective mode of an already-running shared instance honestly; a changed saved mode does not silently restart every user. Sessions survive ordinary engine/OS restarts subject to actual site expiry.

## One process per profile, connected-engine pool

When an engine starts, attach/start **each enabled configured browser** without waiting for its first task. The first connection for a permitted inactive profile launches its browser; later engines connect to that same process. There is no first-engine master and no slave engine. Coordinate canonical profile identity, startup and connections so simultaneous starts never launch duplicate browsers or corrupt a profile.

Track the pool of connected engines. Pause retains the connection/browser. Stopping/disconnecting one engine releases only its connection and owned task activity; keep the shared browser alive for remaining engines. **Close a Promptbook-managed browser after the last engine disconnects**, preserving its profile data. Reconcile dropped/dead connections with verified ownership. A shared browser is a resource, not a global Promptbook engine or task scheduler. An externally owned personal/custom browser is never seized or terminated merely because the pool becomes empty.

Allocate task-specific tabs in the selected shared browser so independent tasks can work concurrently; do not create a separate browser process per task or require whole-profile exclusive task execution. Coordinate destructive browser-wide actions and do not casually close another active task's tabs. Tab separation does not isolate cookies/account changes.

## Configuration changes and connection reuse

After a saved profile change is observed, every **new acquisition** resolves the new configuration, including acquisition by a task that started earlier but had not yet acquired that browser. A cached connection under the same tool name is not sufficient evidence that its actual profile matches. Canonically equivalent profile paths may share their existing pool; a change resolving to a different profile must connect to that new profile before serving the acquisition. If the new profile is unavailable, report that failure/wait rather than silently serving the old account.

Work that acquired the old revision may finish in its original profile under [retained-use rules](tool-runtime.md#retained-active-uses-not-frozen-registries). New work must be able to acquire the new revision while that old use drains; do not postpone the change until all tasks using the tool name finish. If the old connection has no active uses, invalidate/release it on refresh before assigning a new use. Removing and re-adding a name cannot revive its old connection for new work. Release connections according to actual profile/revision ownership, preserving other connected engines and never copying cookies between profiles. A mode-only change to the same shared profile still follows the existing requested/effective-mode rule and does not silently restart the shared process.

## Access and credentials

The configured/enabled tool grants normal browser control without a second permission/capability switch: list/open/switch/close tabs and windows, navigation, text/DOM including supported frames/open shadow roots, screenshots, trusted keyboard/mouse/scroll, rich-text entry, options and file upload. Task-specific programmatic JavaScript/CDP and connection endpoints remain available for authorized automation **subject to the Wallet secret boundary**. Missing ordinary controls are tool defects for automatic repair, not routine requests for the user to grant more access.

Task/agent instructions determine authority for consequential actions. A session does not authorize unrelated posting/payment/account use. Do not export cookies, tokens or stored passwords to Git, Books, prompts or services.

If already signed in, use the existing session. If not, request [Wallet](wallet.md): it applies saved credentials automatically or asks for protected input and returns only nonsecret outcome. Agents do not obtain/type the password. During trusted secret entry, observation/JavaScript/raw CDP paths, screenshots and traces must not reveal credential values; agent tooling cannot bypass that boundary. Preserve full ordinary browsing outside this protected operation. Direct unrestricted access cannot be claimed secret-isolated under [project encryption](project-encryption.md).

The user can [take control of a single tab](browser-tab-control.md) for manual sign-in or ordinary browser interaction, using its current headless or headful mode. Enforce the tab reservation across the profile pool and return the tab to automation only on explicit handoff. Wallet owns any [offer to remember a password](wallet.md#remembering-a-password-from-manual-sign-in).

When a page presents a CAPTCHA, the agent keeps responsibility for the task. Browser reads identify recognized visible challenges. If the widget blocks the chosen step, leave it in place and try a permitted source or an already authorized official integration that meets the original requirements. For example, read a public bulletin from its publisher when a search page requests verification. Check the result before claiming completion. A generic tab handoff for a detected challenge returns guidance to the agent. A separate device approval or personal consent can still require the owner, even if the page also has a verification widget. See the [decision examples](../concepts/minimal-interruption/decision-making.md#when-a-method-fails).

## Diagnostics, restart, kill and test tab

For each named tool show saved/effective variant, profile source/path, mode, actual process/connection health, connected engines, active task tabs/uses and retained context. Paths/endpoints are diagnostics for authorized control, never permission to export profile/secret contents. The home tile keeps a compact failure/count summary.

Use bounded automatic diagnosis/reconnect/retry and ordinary [automatic repair](../concepts/automatic-repair.md) with zero viewers. Unknown recovery times use shared [progressive waiting](../concepts/progressive-waiting.md), relevant profile/connectivity events and domain-safe checks rather than a tight retry loop. Manual controls call those same engine-owned operations:

- recheck/retry-start;
- **Restart browser**, preserving profile/session data;
- **Kill browser**, terminating the verified Promptbook-managed profile process without deleting its data;
- **Open test GitHub tab**, opening `https://github.com/` in that actual browser to check it works.

These target the selected **profile pool**, not an unrelated browser or the whole engine. A restart/kill affects **every connected engine**: show that scope/current uses, checkpoint affected work and coordinate one operation. Restart reconnects remaining clients; kill reports the interruption truthfully, and ordinary subsequent retry policy remains visible. Do not automatically replay uncertain website effects. Opening the test tab and taking control of a tab are separate actions.

Runtime controls do not remove/disable tools, delete sessions or create Git commits. Saved configuration changes retain immediate scoped tool commits and their in-use protections. An incompatible or externally owned process is diagnosed without a blanket Chrome kill. Force-stopping a project disconnects its pool participation; a shared process stays alive for other engines. Host panic targeting all connected engines closes their now-unused managed browser under the same pool rule.

## Evidence and acceptance

Record only attributable task-tab activity when enabled. Exclude unrelated tabs/projects, all secret entry and the full interval of user-controlled tab access. Keep named-tool/attempt provenance in the actual source-filename trace directory. Persistent profiles survive stopping/restart/kill.

Start two engines with the default profile: one browser process, two pool connections, task-specific tabs and no master/slave. Pause either and disconnect the engine that launched it: the other keeps working. Last disconnect closes the managed process. Test isolated/existing/custom sources, concurrent startup, dropped connections, effective mode and eager startup without a task. Restart/kill clearly affects all connected engines; test GitHub opens in the selected instance. Verify live tool changes, full headless/headful ordinary interaction, [manual control](browser-tab-control.md#acceptance-outcomes) and Wallet secrecy.

For live profile changes, use two distinguishable profile fixtures and assert the actual acquired connection/profile, not only the displayed saved path:

- Change an eagerly connected but unused tool from profile A to B; the next acquisition uses B.
- Let task A acquire profile A, then change that tool to B with the required acknowledgement. Task A keeps A; a new task and an already-running task with no prior acquisition both get B before task A finishes.
- Remove the tool while A drains and add the same name with profile B; releasing A preserves B and any other engine still connected to A.
- Make B unavailable; new acquisitions report B's failure and never reuse A. Repeat the applicable cases through saved management and a live external configuration refresh.
