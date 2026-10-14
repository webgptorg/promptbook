# Project workspace

[Main specification](../_main.md)

A project is an operating-system directory in a Git working tree. The default is the invocation's current working directory; `--path` selects another. Resolve relative CLI paths from the invocation directory and paths in `ptbk.json` from the selected project. The project, enclosing Git repository and installed package are distinct locations, including when the project is a subdirectory of a repository.

All project agents, tasks, context, checks and runtime state belong to that selected project. Promptbook uses files and Git, not a database. Project selection applies consistently to every command/interface. The versioned `ptbk.json` stores [project configuration](configuration.md); it is distinct from the runtime directory.

`agents/` is the preferred agent-Book directory, not the only reference source. [Agent resolution](../book-language/references.md) checks built-in non-agents, then this directory recursively, the non-ignored remainder of the project, and finally ignored content such as node_modules. Include hidden agent definitions for reference resolution; exclude Git metadata and `.ptbk/` runtime/browser/trace data. [Hidden agents](../agents/core-agents.md) and dependency-provided agents are not automatically selected for ordinary goal discovery merely because they can be resolved.

`tasks/` is the default task source, configurable with `--tasks`; `prompts/` also supports [Markdown tasks](task-markdown.md). Only top-level task files are executable sources. Templates, archives, traces and accompanying assets are not tasks. Expanded agent lookup must not expand the executable task queue into ignored directories or dependencies.

An implicit missing task source is empty. An explicit invalid source is an error; initialization and migration may create their destination. Paths with spaces, nested projects and equivalent paths must work without duplicate discovery. Project mutations must not escape the selected workspace through relative paths or symlinks. Reference lookup also stays within its project boundary. Explicit [nested-project setup](nested-projects.md) authorizes only its stated parent Git metadata changes.

`.ptbk/` holds project-local runtime records, logs, recovery information, caches and the default persistent browser profile. It is Git-ignored but not entirely disposable: restarts or cache cleanup must not delete sessions, pending questions or recovery evidence. No Promptbook-owned runtime files are stored directly in `.git`.

Operating-system startup registration may live outside the project and points back to it. Global harness installations/native authentication, the actual engine installation being updated and an explicitly selected external browser profile also live outside the workspace; they are not duplicate project runtime stores or general permission to modify unrelated files.

See [Git preflight](git-preflight.md), [browser](browser.md), [installation](installation.md) and [recovery](recovery.md).
