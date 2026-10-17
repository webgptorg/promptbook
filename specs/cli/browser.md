# Shared project browser and profile selection

[Main specification](../_main.md) · [Initialization](initialization.md) · [Project configuration](configuration.md)

Each selected project has one browser configuration and, while active, one coordinated browser instance shared by its agents. The instance/automation ownership is **per project**, not one process per agent, task or harness; the underlying **profile storage may be shared across multiple projects** when explicitly selected. Browser website sessions and harness/model authentication are independent.

## Four explicit profile sources

Offer all **four** choices during attended init and equivalent configuration in noninteractive use:

1. **Promptbook-managed global profile (DEFAULT):** create a dedicated, persistent Chrome-compatible browser profile in the operating system's per-user Promptbook application-data location on first use; reuse that same Promptbook-only profile for another project on the **same machine/account**. It is **not** the user's regular Chrome profile, not copied from it, and not located in a particular project working directory.
2. **Isolated project profile:** create/reuse an independent persistent profile under this project's ignored `.ptbk/`. No other project is implicitly given that profile.
3. **User's existing Chrome profile:** explicitly reuse the user's ordinary Chrome-compatible profile and its already authenticated website sessions. Never select or copy it implicitly.
4. **Custom existing profile path:** let the user provide a path to another browser profile anywhere permitted on the machine.

Selection is per project and saved as a **portable source kind** in `ptbk.json`; the engine resolves its own managed global path for the current OS user at runtime. Do not write machine-specific global absolute paths or session secrets into Git. The isolated option has a project-relative location. Explicit custom paths follow configuration precedence and validate existence/ownership. Existing project settings survive reinit; the **new default** applies when no choice is already saved. Do not silently migrate cookies or sessions while switching modes. Explain sharing and privacy trade-offs clearly in the picker.

Headless/headful is independent of profile source; `--browser-profile <path>` and `--browser-mode headless|headful` remain temporary CLI overrides without modifying saved defaults. Shared controls may switch safely at a boundary. All four choices retain authenticated sessions across engine/system restarts subject to site expiration.

## Shared profiles and safe ownership

The global Promptbook profile is deliberately reusable across **different projects** on one machine, but simultaneous ownership does not authorize competing browser processes to lock or corrupt it. Coordinate access across projects with a safe handover/serialization policy; never forcibly seize or copy a profile or kill unrelated user browsers. A project still has one owner of automation at a time. Report busy/conflicting ownership and retry or request a genuinely needed user action. Choosing a custom/personal shared profile is similarly subject to ownership checks.

Browser profile contents, cookies and tokens never enter Git, trace text, chat Books or model-visible context as credentials. Promptbook is not a website-password database. Attended setup should resolve known login needs when possible; a new required login/2FA later becomes an agent-authored [human chat](user-interactions.md) and, on a desktop, a genuine browser action. Headless hosts must not pretend to have displayed a window. Keep authority and unattended-work constraints intact.

## Task evidence

When enabled, record only page activity attributable to the owning task, with distinct segments for attempts/recurrences, under its [name-derived trace record](traces.md). Include actual browser actions in headless/headful use, not unrelated desktop or other project activity; mask credentials/authentication frames. Recording and video Git inclusion remain independent of profile choice. Failure/unsupported recording is disclosed, not fabricated; optional evidence failure does not unnecessarily block safe work. Stopping Promptbook never deletes any selected persistent profile.

## Acceptance outcomes

Initialize two distinct projects on the same OS account using defaults: both choose and reuse one **Promptbook-managed global** profile across restarts without touching the user's real Chrome profile. Isolated project mode remains separate; explicit user and custom profile selections work and can be changed without implicit cookie migration. Concurrent projects cannot launch competing instances against the same shared profile. Headless/headful and recording flags remain independent and secure.
