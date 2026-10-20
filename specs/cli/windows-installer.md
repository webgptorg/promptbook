# Windows installer

[Main specification](../_main.md) · [Installation](installation.md) · [Release publication](releasing.md) · [Initialization](initialization.md)

## Purpose and boundary

Give nontechnical users, initially a marketing agency, a short path from downloading Promptbook to the existing interactive `ptbk init`. They must not need to understand npm, install Git/Node.js manually, choose a project location from scratch or type the first command. Instructions and demonstration videos can begin with the initializer already open in a terminal.

This is an incremental onboarding aid, **not a complete graphical/customer-ready application**. Windows is the initial scope; installers for other operating systems are future work. Existing global/local npm installation and CLI workflows remain supported and unchanged.

The installer is a very thin bootstrap layer: prepare prerequisites, install the ordinary npm package, prepare an empty destination and launch the ordinary CLI. Do not fork the engine, reimplement the initialization wizard, configure project tools/authentication separately or introduce another scheduler/updater. Project semantics remain in the [shared domain logic](../coding-standards/shared-logic.md).

## Download and version contract

Every newly published Promptbook version includes a normal double-clickable Windows installer attached to its corresponding GitHub Release. An `.exe` bootstrapper or `.msi` is acceptable; the packaging framework and final format are implementation choices, not a requirement to maintain both. The entry point must work before Node.js, npm or Git is installed.

The artifact identifies its Promptbook version and supported Windows architecture/platform. Build it automatically from the same immutable release source as `ptbk`, as part of the ordinary release build/publication, not a separately maintained manual build. See [release checks and publication](releasing.md).

Install the exact advertised npm version, equivalent to `npm install -g ptbk@<release-version>`, rather than resolving an unpinned `latest`. Verify the installed version and executable that will be handed to the terminal. A different existing version is not silently accepted as the advertised version or silently downgraded; explain and obtain authorization for any replacement of the selected global installation. Leave other project-local installations alone. Subsequent optional CLI updates retain the existing [self-update](updates.md) rules.

The initial installer may download dependencies and the package; a fully offline bundle is not required. Explain network requirements and failures without presenting incomplete preparation as success.

## Prerequisite preparation

Inspect Node.js, npm and Git individually in the environment of the user who will run Promptbook. Verify executable usability and compatibility with the target package's declared requirements; finding a filename alone is insufficient. Reuse compatible existing installations without reinstalling them. Install only missing prerequisites, including npm when absent, using official distributions and validated downloads. Do not install a duplicate Node.js merely because npm is missing or an existing executable needs to be made available to the new terminal.

An unusable or incompatible existing installation needs an understandable repair/update decision, not a silent replacement of the user's toolchain. Preserve unrelated tools, package-manager settings, PATH entries and Git configuration. Do not invent a Git author or require a GitHub account in the installer; project Git setup belongs to init.

Prepare a usable global `ptbk` installation for the initiating user. Show concise progress and the planned dependencies/changes; technical output can be available as diagnostics rather than the main interface. Ordinary OS permission prompts are allowed where needed, but use elevation only for operations that require it. Project creation and CLI handoff run as the original user, not as an elevated administrator or a different administrator account.

Make the selected executables available immediately to the launched terminal, including fresh PATH changes, and to subsequent ordinary terminals. Do not require a log-out, manual environment-variable editing or a pre-existing Windows Terminal application. Never bypass OS security warnings or relax machine-wide execution policy to make launching work. An unavoidable platform/restart prerequisite is an explicit incomplete state with a recovery action, not a successful handoff.

## Project location

Propose a writable projects root beneath the initiating user's actual home, defaulting to `%USERPROFILE%\Promptbook`. Show the resolved path and allow a different location. Create it if missing, otherwise reuse it. This is an ordinary container for independent project directories, not itself a Promptbook project, Git repository or global engine workspace.

Offer **Create the first project** with an editable, sensible folder name and a way to skip it. Create one empty child directory for the accepted project. Folder naming is not a project brief; intent is still collected by init. Do not prepopulate Books, `ptbk.json`, package metadata or `.git` in either the projects root or its new child.

Validate writability and valid Windows names before handoff. A collision must not overwrite content: offer another name or explicit reuse of an existing empty directory. Do not silently initialize a nonempty directory, create a duplicate project on retry, or interpret a project name as a path escaping the selected root. Spaces, Unicode and shell-special characters in valid paths must be handled safely without changing their meaning or executing them as commands.

Skipping the first project leaves the CLI installed and reports that no project was initialized. It must not initialize the projects root as a fallback. Show how to return to ordinary project initialization; no separate graphical project manager is required.

## Terminal handoff

For an accepted first project, the normal completion action opens a visible interactive terminal **and starts `ptbk init` automatically** in that directory. Pass the same destination explicitly through the existing `--path` selection so init reuses it instead of asking the user to choose another current-directory/subfolder location. Resolve the intended installed CLI rather than accidentally invoking another version or downloading one through an unpinned command.

The terminal supports the existing interactive wizard with working input/output. Show the command being run, keep the terminal open after success, cancellation or error, and leave the user in the project directory. Users continue in the CLI; there is no requirement for a graphical version of init. From this point, the normal intent-first wizard owns local/global package choice, Git preparation, tools and login, configuration, setup commits and background start.

Installer completion does not mean project initialization, authentication or the first task has completed. Do not start a second engine or dashboard around init; its ordinary completion and `ptbk dashboard` hint remain authoritative. Closing the installer must not terminate the handed-off terminal or an engine subsequently started by init.

If automatic terminal launch is unavailable, report the failed handoff distinctly and provide Retry plus the exact project directory and correctly quoted command to run. A merely prepared/copied command is a recovery path, not the normal successful automatic-handoff experience. Cancelling init preserves its normal resumable behavior rather than causing an installer retry loop.

## Retry and preservation

Separate preparation, directory creation and terminal handoff outcomes. A failed download, denied permission or package installation must stop the dependent steps, show the failed stage and a useful retry action, and retain readable diagnostics without secrets. Never launch an initializer against missing/unverified dependencies or claim a project is ready merely because the installer finished.

Repeating setup rechecks and reuses satisfied prerequisites, the requested package version and approved empty destination. Do not duplicate PATH entries, reset project configuration, delete existing user files or launch duplicate initializers from repeated completion actions. Resume already-started project setup through ordinary CLI behavior with explicit user intent, not by treating its now-nonempty directory as a new empty project. Reinstallation, repair and any removal of the bootstrap layer preserve user projects and shared Node.js/npm/Git installations.

## Acceptance outcomes

- **Clean Windows:** Without Node.js, npm, Git or Windows Terminal, downloading and running the supported installer prepares the dependencies and exact released CLI, offers a home-based first project, and opens its working interactive initializer without manual shell commands.
- **Existing or partial prerequisites:** Compatible tools are unchanged; only missing prerequisites are installed. Missing npm, stale PATH, incompatible versions and an existing different `ptbk` version have explicit outcomes without silent toolchain replacement/downgrade.
- **Paths and collisions:** A home/project path containing spaces, Unicode and valid shell-special characters works; unwritable/invalid paths are diagnosed, nonempty collisions preserve every file, and the projects root never becomes an implicit Git/Promptbook project.
- **Normal CLI parity:** The selected directory is reused, intent remains the first project-setup input, and ordinary local-install, Git, authentication, update and completion behavior is retained. There is one initializer and at most the ordinary single project engine, with no installer-specific project format or extra start.
- **Interrupted/repeated setup:** Download failure, denied elevation, cancellation and a second installer run retain progress safely. No required failed step is reported as successful, no user data is removed, and retries do not duplicate projects or launches.
- **Handoff or skip:** The normal path executes init and keeps its terminal open; launch failure supplies a visible recovery action. Skipping project creation installs the CLI without initializing any directory. Closing the bootstrapper leaves an already-handed-off terminal/engine alone.
- **Release integration:** Every published version has a downloadable matching installer as well as the existing npm package. A missing, corrupt or mismatched artifact makes the release incomplete; clean-machine checks and retry behavior follow [release publication](releasing.md).
