# Project initialization through Promptbook App

The engine can run before it has a project. A pending initialization has an engine ID and a private draft in the shared projects home. The draft keeps accepted answers, attachments and the current prompt. Closing App, Dashboard or the desktop client leaves the service available. With persistence enabled, it also resumes after a restart.

## Start and pair

Run the ordinary initializer when you want to choose a project location from a terminal. To start the engine first, use the following commands.

~~~sh
ptbk init --prepare-only
ptbk connect --onboarding <engine-id> --link '<pairing-url>'
ptbk connect --onboarding <engine-id> --setup-link
~~~

A single invocation can start the service, pair it and print the owner setup link.

~~~sh
ptbk init --prepare-only --link '<pairing-url>' --setup-link
~~~

On a clean Ubuntu host, use the version-matched bootstrap with `--prepare-only --link-stdin`. Promptbook App's copyable command can fill in its `{linkUrl}` placeholder after a supported engine version is published. Download the pinned installer and verify its SHA-256 before running it. Send the pairing URL on stdin so it stays out of sudo's arguments. The installer prints the owner setup link to the invoking session, outside the install log.

On the host, `ptbk dashboard --global` offers **I** to start, pair or continue a pending initialization. The App page of an existing project's Dashboard offers **L** to pair it. The desktop app's global CLI exposes the same workflow on Windows and macOS.

## Finish setup

Open the owner setup link from the host and register a passkey on the engine's own origin. App presents the brief, files, harness selection, name, folder and confirmation from `onboarding@1` and `files@1`. The engine ships a small same-origin page for setup while a verified App UI bundle is unavailable. Both use the passkey gateway and the same permissions.

The engine checks native accounts under its service user. A Codex device code is presented to the owner and entered on OpenAI's site. Claude Code sign-in is completed in the native CLI on the host. Selecting a harness allows the engine to install it for its OS account and verify a real response. A verified harness can propose the name during setup.

The final confirmation builds the project in private staging with the ordinary initializer. The engine publishes the chosen child folder under the projects home, preserves its existing App identity and passkeys, and starts its agenda. The connection can briefly reconnect during handoff. Browser and trace settings start with the defaults. Wallet and optional Git synchronization can be set up after creation.

Use `ptbk onboarding --id <engine-id>` to continue on the host. With `--json`, it returns the same prompt shape as App. `--answer-file -` accepts a JSON reply on stdin and `--attach <path>` supplies a file ID for a brief reply. Use the current `promptId` for each reply. A stale reply has no effect. **Continue later** keeps accepted answers and files.

See [App connection](connection.md) and [native harness sign-in](../cli/harness-authentication.md).
