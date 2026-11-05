# Windows installer

[Main specification](../_main.md) · [Installation](installation.md) · [Release publication](releasing.md) · [Initialization](initialization.md)

## Purpose and boundary

Give users a short path from downloading Promptbook to opening the local application. The Windows wizard prepares required software, installs the exact released engine and CLI, and offers the [local desktop client](desktop.md) as a default-selected component. Existing global/local npm and CLI-only workflows remain supported. Harness selection, sign-in, Git configuration, and project creation belong to ordinary init.

Project setup starts inside the desktop application, using the same experience as macOS. The installer has no project location or name fields, creates no project directories, and never runs `ptbk init` itself.

## Download and version contract

Every newly published Promptbook version includes a normal double-clickable Windows installer attached to its corresponding GitHub Release. An `.exe` bootstrapper or `.msi` is acceptable; the packaging framework and final format are implementation choices, not a requirement to maintain both. The entry point must work before Node.js, npm or Git is installed.

The artifact identifies its Promptbook version and supported Windows architecture/platform. Build it automatically from the same immutable release source as `ptbk`, as part of the ordinary release build/publication, not a separately maintained manual build. See [release checks and publication](releasing.md).

Install the exact advertised npm version, equivalent to `npm install -g ptbk@<release-version>`, rather than resolving an unpinned `latest`. Verify the installed version and executable that will be handed to either client. A different existing version is not silently accepted as the advertised version or silently downgraded; explain and obtain authorization for any replacement of the selected global installation. Leave other project-local installations alone. Subsequent optional CLI updates retain the existing [self-update](updates.md) rules.

The initial installer may download dependencies and the package; a fully offline bundle is not required. Explain network requirements and failures without presenting incomplete preparation as success.

## Prerequisite preparation

Inspect Node.js, npm and Git individually in the environment of the user who will run Promptbook. Verify executable usability and compatibility with the target package's declared requirements; finding a filename alone is insufficient. Reuse compatible existing installations without reinstalling them. When Node.js or npm is missing, unusable or incompatible, automatically prepare a verified per-user Node.js 22 runtime including npm without removing the existing installation. Reuse that compatible runtime on retries. Install missing Git from its official distribution with download verification.

An incompatible Node.js installation remains intact; the installer selects its private compatible runtime for Promptbook. An unusable Git installation needs an understandable repair decision. Preserve unrelated tools, package-manager settings, PATH entries and Git configuration. Do not invent a Git author or require a GitHub account in the installer; project Git setup belongs to init.

Before installation, show the actual detection results: compatible software already available and the missing Node.js/npm or Git that will be installed. Required missing dependencies cannot be deselected; do not ask users to decide whether a tool is installed or present generic "install if missing" options.

Prepare a usable global `ptbk` installation for the initiating user. Keep preparation in the installer window, with an animated progress bar and current stage, while capturing technical output in diagnostics. Do not open PowerShell, command prompt or download progress windows during preparation. Ordinary OS permission prompts are allowed where needed, but use elevation only for operations that require it. The desktop application opens as the original user after successful preparation.

Make the selected executables available immediately to the launched application and to subsequent ordinary terminals, including fresh PATH changes. Do not require a log-out, manual environment-variable editing or a pre-existing Windows Terminal application. Never bypass OS security warnings or relax machine-wide execution policy to make launching work. An unavoidable platform/restart prerequisite is an explicit incomplete state with a recovery action, not a successful handoff.

## Client handoff

With desktop selected, open the application through its ordinary launch entry point after successful installation. It discovers known projects and uses its normal first-launch behavior. The desktop initializer owns [intent, location and name](initialization.md#initial-input-and-destination). With CLI-only selected, point users to the Start menu’s **Promptbook terminal** and `ptbk init` when they are ready.

Report desktop launch failures separately with a retry and the Start menu recovery path. Installation success reports software availability. The application reports project initialization, authentication and engine startup through their ordinary flows.

## Retry and preservation

Separate software preparation and desktop launch outcomes. A failed download, denied permission or package installation stops dependent steps and shows the failed stage, error and a useful retry action directly in the installer. Keep readable, redacted diagnostics and verify downloads before use. Unexpected PowerShell exceptions use the same result channel.

Every handled preparation error and installed-version decision offers **Copy report**. The selectable report includes the installer version, OS/PowerShell, failed stage/code, recovery action and recent diagnostics. Copying keeps the dialog open and report access remains available on the incomplete final page. If PowerShell or report creation fails, the native dialog still provides a minimal report.

Repeating setup reuses satisfied prerequisites and the requested package version. Preserve user projects, their configuration and shared Node.js/npm/Git installations across retries, repairs and uninstall.

## Acceptance outcomes

- **Clean Windows:** Prepare missing prerequisites and the exact released CLI. With desktop selected, open the same application experience as on macOS.
- **CLI only:** Install the CLI and explain how to invoke `ptbk init` from Promptbook terminal later.
- **Existing or partial prerequisites:** Reuse compatible tools and report incompatible or different installations without silently replacing them.
- **Interrupted or repeated setup:** Preserve progress and existing user data. Project directories remain untouched, including where a previous default location contains an ordinary file.
- **Release integration:** Every published version has a verified matching Windows installer alongside the npm package.

## Windows discovery and completion

Show the Promptbook logo and license acceptance before installation. Create `Promptbook terminal` and `ptbk` Start menu shortcuts for the ordinary context-aware CLI, with the verified runtime and user home. Resolve the per-user Programs known folder without requiring it to exist yet, create missing directories through literal paths, and reuse those shortcuts on repeated setup, including redirected profiles. With desktop selected, add `Promptbook` for the graphical client and register only its tray controller at sign-in. Uninstalling desktop removes that registration and its own files without stopping or deleting the separate engines/projects. Preserve lowercase `ptbk` in command examples. Failed or declined preparation must change the final page to an explicit incomplete result and return a nonzero setup exit code. Codex and Claude Code remain choices in ordinary init.

## Unattended installer verification

For reproducible Windows checks, `/PrepareOnly=yes` suppresses opening the desktop application after verifying and installing the selected software. It composes with Inno Setup’s standard silent and component switches and retains nonzero incomplete outcomes.
