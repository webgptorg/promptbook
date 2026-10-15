# Shared project browser

[Main specification](../_main.md)

Each selected project has one browser configuration and, while in use, one shared browser instance. All its agents use that browser for external project context. This singleton is per project folder, not per agent, task or harness and not one browser for the entire machine. It is independent of the project's multiple [harness selections and native logins](harnesses.md).

## Profile and visibility

Choose one profile source:

- **Isolated project profile** (default): create a persistent profile in Git-ignored `.ptbk/`, isolated from other projects and the user's personal browser.
- **Other existing profile:** explicitly select a profile anywhere on the system, including another project's profile or a central profile shared by agents.
- **User's browser profile:** explicitly select an existing Chrome-compatible user profile and reuse its authenticated sessions.

Offer the existing/shared choices as secondary options; never select or copy a personal profile implicitly. Explain that choosing a shared profile grants access to its existing sessions and that actions can affect that profile.

Headless/headful is an independent choice available with each profile source. Save defaults in `ptbk.json`; `--browser-profile <path>` and `--browser-mode headless|headful` override them for one invocation without rewriting the file. Shared controls may adjust them at a safe boundary. Mode switching preserves the selected profile and active-task consistency. Profile switching is explicit and must not silently migrate cookies between identities.

## Sessions, safety and human access

Profiles are persistent, not disposable caches. Sessions survive process/system restart subject to site expiry. Promptbook does not collect website usernames/passwords as a credential database; keep profile contents, cookies and tokens out of Git, output, traces and model-visible artifacts.

Reuse valid sessions for the task's authorized actions without routine reconfirmation. Resolve known required login during attended setup where possible. When a genuinely necessary login, two-factor authentication or another human-only action remains, create a [user request](user-interactions.md) and bring the browser forward on an available desktop. The user acts on the real site, then agents continue with that session. A headless host cannot claim it displayed a window; remote screen transport is outside this contract. Follow [unattended operation](autonomous-operation.md), not repeated per-post approval by default.

Do not open competing instances over a profile, including when another project or a user browser owns it. Recheck transient ownership safely; when handover truly needs a person, request it or another profile without seizing or copying live data. Only one project task owns automation at a time; human intervention and TEAM consultation cannot create conflicting control. Stopping Promptbook must not terminate unrelated user browsers or delete any selected profile.

## Task-linked browser evidence

When enabled by [trace configuration](trace-configuration.md), record the browser activity of each owning task in its root-level `traces/<task-id>/` record. Reusing the shared browser must not mix unrelated tasks into one untraceable recording. Include playable recordings and identifiable segments for attempts/occurrences, covering actual page actions rather than merely reporting that browser tooling was invoked.

Apply [trace recording and privacy rules](traces.md#browser-recordings) in headless and headful operation, excluding sensitive authentication/session material. Recording policy is independent of profile selection, visibility and whether videos are committed. Do not open the dashboard or record unrelated desktop activity as a side effect of capturing the browser. Missing or failed recording is reported honestly without unnecessarily stopping safe agenda work.

See [configuration](configuration.md), [controls](controls.md) and [workspace](workspace.md).
