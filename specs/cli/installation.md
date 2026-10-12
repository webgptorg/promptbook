# Installation

[Main specification](../_main.md)

The repository publishes one npm package, `ptbk`, providing the `ptbk` command. It works outside its own repository over the user's selected project.

Install globally with `npm install -g ptbk`, then invoke `ptbk`. Alternatively, install locally in dependencies or devDependencies and use `npx ptbk` or an npm script; a local installation does not add the executable to the system PATH. Global and local Promptbook installations are independent of the always-global [harness installations](harnesses.md).

## Installation during init

Inspect the selected destination, not merely the folder from which init was launched. If it already declares and has a usable local `ptbk` in dependencies or devDependencies, preserve it without asking to add a second copy or moving it between sections. Repair a declared but missing installation without silently replacing its version choice.

Otherwise offer **Install Promptbook locally in this project's dependencies** (default) or **Use the global CLI**. This also applies when a locally installed Promptbook in a parent/other project initializes a fresh subfolder: that source installation is not the destination's own dependency.

The default performs the local installation, creating or updating package metadata and the applicable lockfile without disturbing unrelated dependencies or scripts. Add `ptbk` to regular dependencies at the exact running engine version, not an independently selected latest release. If that version cannot be installed, explain the failure rather than substitute another version. Choosing global use does not add a local dependency; verify/explain its availability rather than mislabel a parent-local executable as global.

The noninteractive equivalent supplies this decision in advance. Repeating an already-satisfied installation step does not reinstall or rewrite package files. [Self-update](updates.md) is a separate earlier decision about the invoked installation.

Projects may use different versions simultaneously. Local invocations and their background processes keep the selected installation across restarts instead of silently switching to a global or downloaded version. See [workspace](workspace.md), [initialization](initialization.md) and [startup persistence](persistence.md).
