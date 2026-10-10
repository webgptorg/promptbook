# Installation

[Main specification](../_main.md)

The repository publishes one npm package, `ptbk`, providing the `ptbk` command. It works outside its own repository over the user's selected project.

Install globally with `npm install -g ptbk`, then invoke `ptbk`. Alternatively, install in a project with `npm install --save-dev ptbk`; a regular dependency is also supported. Use `npx ptbk` or an npm script for that local installation: installing locally does not add the executable to the user's system PATH.

Projects may use different installed versions simultaneously. A project-local invocation and its background process must keep using that project's selected installation, including after restart, rather than silently switch to a global or newly downloaded version.

See [workspace](workspace.md), [initialization](initialization.md) and [startup persistence](persistence.md).
