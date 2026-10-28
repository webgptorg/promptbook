# Installation

[Main specification](../_main.md)

The repository publishes one npm package, `ptbk`, providing the `ptbk` command. It works outside its own repository over the user's selected project.

Install globally with `npm install -g ptbk`, then invoke `ptbk`. Alternatively, install locally in dependencies or devDependencies and use `npx ptbk` or an npm script; a local installation does not add the executable to the system PATH. Global and local Promptbook installations are independent of the always-global [harness installations](harnesses.md).

## Windows installer entry point

Each version also ships a thin [Windows installer](windows-installer.md) on its GitHub Release. It prepares missing Node.js/npm/Git prerequisites, installs the corresponding ordinary global `ptbk` package, proposes a home-based projects root and offers an empty first-project directory. The normal handoff opens a terminal in that project and automatically runs the existing interactive `ptbk init` with its destination selected.

This is an additional distribution/onboarding path, not a replacement for npm or a separate engine/graphical initializer. Reuse compatible existing prerequisites, preserve unrelated installations and follow the installer's exact-version, permission, retry and safe-directory rules. Global use is preferred in ordinary init; project-local installation remains an explicit alternative. Automatic artifact creation and publication are part of [releasing](releasing.md).

## Installation during init

Inspect the selected destination, not merely the folder from which init was launched. If it already declares and has a usable local `ptbk` in dependencies or devDependencies, preserve it without asking to add a second copy or moving it between sections. Repair a declared but missing installation without silently replacing its version choice.

Otherwise offer **Use the global CLI** first and as the preferred/default choice, followed by **Install Promptbook locally in this project's dependencies**. This also applies when a locally installed Promptbook in a parent/other project initializes a fresh subfolder: that source installation is not the destination's own dependency.

Choosing local installation performs that installation, creating or updating package metadata and the applicable lockfile without disturbing unrelated dependencies or scripts. Add `ptbk` to regular dependencies at the exact running engine version, not an independently selected latest release. If that version cannot be installed, explain the failure rather than substitute another version. Choosing global use does not add a local dependency; verify/explain its availability rather than mislabel a parent-local executable as global.

The noninteractive equivalent supplies this decision in advance. Repeating an already-satisfied installation step does not reinstall or rewrite package files. [Self-update](updates.md) is a separate earlier decision about the invoked installation.

Projects may use different versions simultaneously. Local invocations and their background processes keep the selected installation across restarts instead of silently switching to a global or downloaded version. See [workspace](workspace.md), [initialization](initialization.md) and [startup persistence](persistence.md).
