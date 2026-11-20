# Project initialization through Promptbook App

The engine can run before it has a project. A pending initialization has an engine ID and a private draft in the shared projects home. The draft keeps accepted answers, attachments and the current prompt. Closing App, Dashboard or the desktop client leaves the service available. With persistence enabled, it also resumes after a restart.

## Start and pair

### Engine-first setup

The App installer uses a published, exact engine version. The blocks below use the earlier reviewed `0.119.0-117` candidate as an example; the App must select a new published staging build for the zero-configuration signed UI described below. Later source revisions are not automatically available to installers. A complete walkthrough, including native provider sign-in, reboot and the approved UI bundle, remains a separate release check.

For Bash/zsh, the copied block installs the package and verifies the actual CLI on PATH before initializing. A failed install or an unexpected version stops the chain:

~~~sh
npm install --global ptbk@0.119.0-117 &&
{ ptbk_installed_version=$(ptbk --version) && [ "$ptbk_installed_version" = '0.119.0-117' ] || { echo 'Open a new terminal: ptbk version mismatch.' >&2; false; }; } &&
ptbk init --prepare-only --link '<pairing-url-from-app>'
~~~

PowerShell, including Windows PowerShell 5.1, requires explicit native exit-code checks instead of Bash chaining:

~~~powershell
npm install --global ptbk@0.119.0-117
if (-not $? -or $LASTEXITCODE -ne 0) { throw 'Promptbook installation failed.' }
$ptbkInstalledVersion = ptbk --version
if (-not $? -or $LASTEXITCODE -ne 0 -or $ptbkInstalledVersion -ne '0.119.0-117') { throw 'Open a new terminal: ptbk version mismatch.' }
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

The human-readable result directs paired installations to that first-access link and browser setup. It explicitly confirms pairing before project setup and presents `ptbk onboarding --id` as the terminal alternative. Closing the invoking terminal does not stop the background engine or discard the draft. JSON output and the standalone `init`/`connect` commands are unchanged.

~~~sh
ptbk init --prepare-only --link '<pairing-url>' --setup-link
~~~

On a clean Ubuntu host, use the version-matched bootstrap with `--prepare-only --link-stdin`. Promptbook App's copyable command can fill in its `{linkUrl}` placeholder after a supported engine version is published. Download the pinned installer and verify its SHA-256 before running it. Send the pairing URL on stdin so it stays out of sudo's arguments. The installer prints the owner setup link to the invoking session, outside the install log.

On the host, use `ptbk init --with-app` to start, pair or continue a pending initialization. The global Dashboard offers the same workflow on **I**. The App page of an existing project's Dashboard offers **L** to pair it. On Windows and macOS, choose **Set up with App** to open the wizard in the desktop terminal.

## Finish setup

Open the owner setup link from the host and register a passkey on the engine's own origin. The pending engine serves the platform's verified signed UI at that origin through the relay, behind the same passkey gateway as an initialized engine. The engine-built wizard is a fallback only when no verified bundle is available. Both use `onboarding@1` and `files@1` for the brief, files, harness selection, name, folder and confirmation. After handoff, the usual App UI loads at the same origin.

Selecting a harness allows the engine to install it and verify a real response under the service user. Codex and GitHub Copilot show the CLI's device code to enter on the provider's site. Claude Code presents the authorization URL from its own native CLI and accepts the returned code through the `harness-login` answer; the engine forwards it to that CLI's private PTY and verifies the account before proceeding. Gemini CLI, Qwen Code and OpenCode offer the no-link alternative "Use an API key instead", followed by a contract `secret` prompt with the provider's key-help URL. A failed verification stays on a new secret prompt with a generic error. A successful key setup saves an `API_KEY` tool whose secret lives in the new project's ignored `.env`. Keys never appear in the draft, prompt, activity, logs or readback.

The wizard offers the native sign-in terminal when the user requests it or when the preferred code flow cannot complete. Only the engine owner can open `/_ptbk/harness-terminal`; this route no longer accepts API-key actions or renders a key form. The host CLI and desktop use private IPC for the same step. Each terminal runs as the engine user. On return, the wizard checks the chosen account before proceeding. A verified harness can propose the project name. Install/check activity reports actual running, done and failed outcomes, retaining failed additional harnesses on the next prompt. The review prompt lists project, folder and selected AI tools in `details`.

The final confirmation builds the project in private staging with the ordinary initializer. The engine publishes the chosen child folder under the projects home, preserves its existing App identity and passkeys, and starts its agenda. The connection can briefly reconnect during handoff. Browser and trace settings start with the defaults. Wallet and optional Git synchronization can be set up after creation.

Use `ptbk onboarding --id <engine-id>` to continue on the host. With `--json`, it returns the same prompt shape as App. `--answer-file -` accepts a JSON reply on stdin and `--attach <path>` supplies a file ID for a brief reply. Use the current `promptId` for each reply. A stale reply has no effect. Before the project exists, `canDefer` is false and defer returns 409 `onboarding-not-deferrable`. Closing a client still preserves accepted answers and files. Every prompt includes `details` and `alternatives`, and every state includes `activity` and `canDefer`, even when empty. Heartbeats report only `setup: pending` until handoff, then `setup: done`.

See [App connection](connection.md) and [native harness sign-in](../cli/harness-authentication.md).

## Signed UI readiness

Engine version, relay reachability and UI version are independent facts. The platform source of truth is pinned to `webgptorg/app@60958c0b9290d89875087460d5b2333d2442d620`, prioritizing its 20 November staging build and 19 November browser setup requirements.

Until the production key ceremony, the npm publisher builds with `PTBK_BUILD_PROFILE=staging`. This is a build input only: the compiled constant fixes the profile and runtime variables cannot change it. Staging embeds the exact platform `trust-policy.staging.json` (build-checked SHA-256 `b642b6eb3236d986695d5951e91927642bb2d194d3cf1b02539d353a770c9f64`) and defaults to `https://ui.ptbk.link/` and `engines.ptbk.link`. It accepts this policy even with the service's `NODE_ENV=production`, refuses conformance trust and disabled TLS verification, and reports "UI trust: built-in staging policy" on first start and status. Source/development and production builds embed no staging policy; production still refuses a staging policy from a local file. The version command remains a bare version.

An explicit local `PTBK_UI_TRUST_POLICY_FILE`, mirror or engine domain remains an override; an invalid local policy refuses startup, without falling back to embedded trust. No fetched content chooses the profile or policy. Without any policy the loader never fetches or serves cached UI.

`ptbk init --prepare-only --link` approves the first bundle with `mode: manual`, skipping only its delay. Signature thresholds, pinned Sigstore provenance, log entry, fresh signed revocations, archive hashes, manifest and API compatibility still apply. After the first installation, a persisted marker prevents this exemption from being reused, including after a restart, corruption or withdrawal of all installed bundles. Later automatic updates obey their normal delay. A delayed release gets an extra check at eligibility plus up to five seconds of jitter, in addition to hourly checks.

The engine tests cover STG-01 through STG-14. Full clean-machine acceptance STG-20 through STG-24 needs the platform's engine-ui 0.2.4 release, a published matching engine package, real passkey/provider sign-in and reboot. Keep those results distinct from source tests.

Inspect the authenticated `GET /api/v1/security` response's `ui.version`, `ui.bundleSha256`, `ui.releaseLogIndex` and `ui.lastUpdateCheck`. A null release-log index with no accepted update indicates the built-in page, even if its version matches another engine. Verify the approved mirror/policy, manifest/API range, signature threshold, delay and revocations; never repair this by accepting unsigned code. Do not call the installation fully verified solely because the engine is online.
