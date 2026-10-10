# Shared project browser

[Main specification](../_main.md)

Each running project has one shared browser instance and a persistent Chrome-compatible profile. Agents use it to work with external project context, including authenticated sites. The default profile lives in Git-ignored `.ptbk/`; it is not a disposable temporary profile. Browser sessions survive process and system restarts, subject to the site's own session expiry.

Promptbook does not collect or store website usernames/passwords as its own credential database. When login, two-factor authentication or another human action is needed, create a [user request](user-interactions.md) and bring the browser to the foreground on an available desktop. The user acts on the real site, then the agent continues with that session. Browser cookies and session tokens are sensitive: keep them out of Git, output, traces and model-visible artifacts.

Support headless and headful operation, selectable through CLI options and the [shared controls](controls.md). Switching must retain the profile and the active task's consistency. Headless operation supports servers as well as desktop hosts; remote screen transport is not part of this contract. A headless host must not falsely claim that it displayed a login window to the user.

Use the project profile by default, or explicitly select an existing operating-system browser profile to reuse its sessions. Report the selected profile and preserve its data. Do not open competing instances over the same profile or silently commandeer a browser already using it; request a safe handover when needed.

Only one project task owns browser automation at a time. Human intervention and TEAM consultation do not authorize conflicting concurrent browser control. Browser visibility and profile selection are configurable without losing the project's single-browser identity. Stopping Promptbook must not terminate unrelated user browsers.
