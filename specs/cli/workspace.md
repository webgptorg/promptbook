# Project workspace

[Main specification](../_main.md)

A project is an operating-system directory in a Git working tree. The default is the invocation's current working directory; `--path` selects another. Resolve relative options from the invocation directory. The project, enclosing Git repository and installed package are distinct locations, including when the project is a subdirectory of a repository.

All project agents, tasks, context, checks and runtime state belong to that selected project. Promptbook uses files and Git, not a database. Project selection must apply consistently to every command and interface.

`agents/` contains agent Books; discovery is recursive, including hidden directories for reference resolution. [Hidden agents](../agents/core-agents.md) are excluded from ordinary automatic work selection. `tasks/` is the default task source, configurable with `--tasks`; `prompts/` also supports [Markdown tasks](task-markdown.md). Only top-level task files are executable sources. Templates, archives, traces and accompanying assets are not tasks.

An implicit missing task source is empty. An explicit invalid source is an error; initialization and migration may create their destination. Paths with spaces, nested projects and equivalent paths must work without duplicate discovery. Mutations must not escape the selected workspace through relative paths or symlinks.

`.ptbk/` holds project-local runtime records, logs, recovery information, caches and the persistent browser profile. It is Git-ignored, but not entirely disposable: restarting or cleaning caches must not delete login sessions, pending questions or recovery evidence. No Promptbook-owned runtime files are stored directly in `.git`. Only operating-system startup registration may live outside the project; it points back to this project and installation, not to a second store of project data.

See [Git preflight](git-preflight.md), [browser](browser.md) and [recovery](recovery.md).
