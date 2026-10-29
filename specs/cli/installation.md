# Installation

[Main specification](../_main.md)

The repository publishes one npm package, `ptbk`, providing the `ptbk` command. It works outside its own repository over the user's selected project.

Install globally with `npm install -g ptbk`, then invoke `ptbk`. Alternatively, install locally in dependencies or devDependencies and use `npx ptbk` or an npm script; a local installation does not add the executable to the system PATH. Global and local Promptbook installations are independent of the always-global [harness installations](harnesses.md).

## Windows installer entry point

Each version also ships a thin [Windows installer](windows-installer.md) on its GitHub Release. It prepares missing Node.js/npm/Git prerequisites, installs the corresponding ordinary global `ptbk` package, proposes a home-based projects root and offers an empty first-project directory. The normal handoff opens a terminal in that project and automatically runs the existing interactive `ptbk init` with its destination selected.

This is an additional distribution/onboarding path, not a replacement for npm or a separate engine/graphical initializer. Reuse compatible existing prerequisites, preserve unrelated installations and follow the installer's exact-version, permission, retry and safe-directory rules. Global use is preferred in ordinary init; project-local installation remains an explicit alternative. Automatic artifact creation and publication are part of [releasing](releasing.md).

## Server deployment entry point

The README and localized website installation page expose matching [server deployment options](../../deploy/README.md), with DigitalOcean first, plus Azure and AWS. Preserve each provider's real form, script-copy or template-upload steps and account/cost confirmation; do not label a guided deployment as a nonexistent one-click Marketplace image. These paths prepare a persistent Ubuntu 24.04 x86-64 VM and use the same prerequisite bootstrap as an existing compatible VPS. A provisioned host is not yet an authenticated, initialized agenda.

Run the engine as the dedicated non-sudo user. Keep dashboard/API/browser-debugging ports private and allow SSH only from the selected client source in the Azure template. Project and per-user files remain on persistent storage; private backups must include ignored state and native sign-ins, not only Git. Setup and provider authentication remain attended over verified access. Enable user lingering so the engine's ordinary per-project startup registration can work before login; reuse its lifecycle rather than adding a second supervisor that overrides intentional stop. This bootstrap is an installation path, not an automatic updater or the remote-control app.

For an attended SSH session on a clean supported VPS, provide one copyable shell command that prepares missing prerequisites and the published engine, then automatically enters ordinary `ptbk init` as the engine user. The user must not first install Node.js/npm, switch accounts manually or run a separate initializer command. Preserve the live terminal and the existing init/start/dashboard semantics under [VPS onboarding](vps-onboarding.md). Unattended provider bootstrapping remains a distinct prerequisite-only outcome, followed by the same attended continuation.

## Installation guidance and AI-assisted entry

README and localized website guidance distinguish **Node.js/npm already available** (ordinary npm installation) from **a clean supported VPS** (the complete shell bootstrap). State supported OS/architecture, required administrator access and the remaining attended setup. Publish a working command only when the corresponding installer supports the promised handoff; a target specification is not evidence that a released command already does so. Keep the inspectable script and detailed guide available alongside the short path.

The website's first installation tab is **Claude Code / Codex / AI**. It offers separate, fully copyable human-readable prompts for **My computer** and **VPS**, localized in Czech and English. Both are given to an agent on the user's own computer. The local prompt inspects that computer, installs missing supported prerequisites and Promptbook, then guides the owner through ordinary init. The VPS prompt uses the selected server over SSH, prepares it and continues setup there under its engine account. Ask for missing destination/access details, reuse authorized SSH access and leave native sign-in/consent to the owner through supported flows. Do not ask for private keys, passwords or tokens in the prompt. Both prompts verify actual readiness and distinguish installation, initialization and service launch rather than claim success after downloading files. Keep direct installation choices available and their commands consistent with README and the server guide.

## Installation during init

Inspect the selected destination, not merely the folder from which init was launched. If it already declares and has a usable local `ptbk` in dependencies or devDependencies, preserve it without asking to add a second copy or moving it between sections. Repair a declared but missing installation without silently replacing its version choice.

Otherwise offer **Use the global CLI** first and as the preferred/default choice, followed by **Install Promptbook locally in this project's dependencies**. This also applies when a locally installed Promptbook in a parent/other project initializes a fresh subfolder: that source installation is not the destination's own dependency.

Choosing local installation performs that installation, creating or updating package metadata and the applicable lockfile without disturbing unrelated dependencies or scripts. Add `ptbk` to regular dependencies at the exact running engine version, not an independently selected latest release. If that version cannot be installed, explain the failure rather than substitute another version. Choosing global use does not add a local dependency; verify/explain its availability rather than mislabel a parent-local executable as global.

The noninteractive equivalent supplies this decision in advance. Repeating an already-satisfied installation step does not reinstall or rewrite package files. [Self-update](updates.md) is a separate earlier decision about the invoked installation.

Projects may use different versions simultaneously. Local invocations and their background processes keep the selected installation across restarts instead of silently switching to a global or downloaded version. See [workspace](workspace.md), [initialization](initialization.md) and [startup persistence](persistence.md).
