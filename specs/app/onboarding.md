# Project initialization through Promptbook App

The engine can run before it has a project. A pending initialization has an engine ID and a private draft in the shared projects home. The draft keeps accepted answers, attachments and the current prompt. Closing App, Dashboard or the desktop client leaves the service available. With persistence enabled, it also resumes after a restart.

## Start and pair

### Engine-first setup

The App installer uses a published, exact engine version. As checked on 18 November 2026, `0.119.0-114` is available in npm and has matching Windows EXE and macOS DMG assets. This is a prerelease, not a stable release. Later source revisions are not automatically available to installers. A complete production walkthrough, including native provider sign-in and the approved UI bundle, remains a separate release check.

For Bash/zsh, the copied block installs the package and verifies the actual CLI on PATH before initializing. A failed install or an unexpected version stops the chain:

~~~sh
npm install --global ptbk@0.119.0-114 &&
{ ptbk_installed_version=$(ptbk --version) && [ "$ptbk_installed_version" = '0.119.0-114' ] || { echo 'Open a new terminal: ptbk version mismatch.' >&2; false; }; } &&
ptbk init --prepare-only --link '<pairing-url-from-app>'
~~~

PowerShell, including Windows PowerShell 5.1, requires explicit native exit-code checks instead of Bash chaining:

~~~powershell
npm install --global ptbk@0.119.0-114
if (-not $? -or $LASTEXITCODE -ne 0) { throw 'Promptbook installation failed.' }
$ptbkInstalledVersion = ptbk --version
if (-not $? -or $LASTEXITCODE -ne 0 -or $ptbkInstalledVersion -ne '0.119.0-114') { throw 'Open a new terminal: ptbk version mismatch.' }
ptbk init --prepare-only --link '<pairing-url-from-app>'
~~~

Neither block depends on the shell's working directory. Do not add `mkdir`, `cd`, `--path`, an agenda or a second interactive initializer to this path. The commands retain quotes around the URL fragment. The URL is an issuance-time pairing capability; do not put a real value in committed examples or reports. A pasted command can remain in shell history, including when its handoff to sudo uses stdin.

App also offers a localized AI prompt for this computer or an existing Ubuntu VPS, retaining the exact pairing context and verified release. The prompt defers agenda/harness decisions to `onboarding@1`. The Windows EXE has no pairing deep link: finish it, close an unsolicited standalone project wizard, then run the checked PowerShell block from App in a new terminal. Repeating it resumes the corresponding draft or reports the completed project. Ordinary `ptbk init` and `ptbk connect` remain separate supported commands.

Run the ordinary initializer when you want to choose a project location from a terminal. To start the engine first, use the following commands.

~~~sh
ptbk init --prepare-only
ptbk connect --onboarding <engine-id> --link '<pairing-url>'
ptbk connect --onboarding <engine-id> --setup-link
~~~

A single invocation can start the service, pair it and show the owner setup link. In an interactive terminal the paired initializer shows it automatically, with a QR, and opens it on the local desktop. `--setup-link` also requests explicit JSON output for automation; `--no-open` keeps it in the terminal.

~~~sh
ptbk init --prepare-only --link '<pairing-url>' --setup-link
~~~

On a clean Ubuntu host, use the version-matched bootstrap with `--prepare-only --link-stdin`. Promptbook App's copyable command can fill in its `{linkUrl}` placeholder after a supported engine version is published. Download the pinned installer and verify its SHA-256 before running it. Send the pairing URL on stdin so it stays out of sudo's arguments. The installer prints the owner setup link to the invoking session, outside the install log.

On the host, use `ptbk init --with-app` to start, pair or continue a pending initialization. The global Dashboard offers the same workflow on **I**. The App page of an existing project's Dashboard offers **L** to pair it. On Windows and macOS, choose **Set up with App** to open the wizard in the desktop terminal.

## Finish setup

Open the owner setup link from the host and register a passkey on the engine's own origin. The pending engine serves the wizard at that origin through the relay. It uses `onboarding@1` and `files@1` for the brief, files, harness selection, name, folder and confirmation. After handoff, the usual App UI loads at the same origin.

Selecting a harness allows the engine to install it and verify a real response under the service user. Codex and GitHub Copilot show the CLI's device code to enter on the provider's site. Gemini CLI, Qwen Code and OpenCode offer a form for an explicit provider API key. A successful key setup saves an `API_KEY` tool whose secret lives in the new project's ignored `.env`.

The wizard offers the native sign-in terminal when the user requests it or when the preferred device flow cannot complete. Claude Code uses its terminal directly for subscription sign-in under Anthropic's terms. Only the engine owner can open the terminal or submit a key at `/_ptbk/harness-terminal`. The host CLI and desktop use private IPC for the same step. Each terminal runs as the engine user. On return, the wizard checks the chosen account before proceeding. A verified harness can propose the project name.

The final confirmation builds the project in private staging with the ordinary initializer. The engine publishes the chosen child folder under the projects home, preserves its existing App identity and passkeys, and starts its agenda. The connection can briefly reconnect during handoff. Browser and trace settings start with the defaults. Wallet and optional Git synchronization can be set up after creation.

Use `ptbk onboarding --id <engine-id>` to continue on the host. With `--json`, it returns the same prompt shape as App. `--answer-file -` accepts a JSON reply on stdin and `--attach <path>` supplies a file ID for a brief reply. Use the current `promptId` for each reply. A stale reply has no effect. **Continue later** keeps accepted answers and files.

See [App connection](connection.md) and [native harness sign-in](../cli/harness-authentication.md).

## Signed UI readiness

Engine version, relay reachability and UI version are independent facts. The loader requires an approved local `PTBK_UI_TRUST_POLICY_FILE` and the matching HTTPS release mirror `PTBK_UI_RELEASE_URL`; an optional `PTBK_UPDATE_POLICY`/`PTBK_PINNED_VERSION` controls installation. A release build refuses a conformance trust file. It does not download or serve even a cached bundle without a trust policy. Pending initialization uses the engine-owned authenticated onboarding page, then hands over to the approved UI if available.

Inspect the authenticated `GET /api/v1/security` response's `ui.version`, `ui.bundleSha256`, `ui.releaseLogIndex` and `ui.lastUpdateCheck`. A null release-log index with no accepted update indicates the built-in page, even if its version matches another engine. Verify the approved mirror/policy, manifest/API range, signature threshold, delay and revocations; never repair this by accepting unsigned code. Do not call the installation fully verified solely because the engine is online.
