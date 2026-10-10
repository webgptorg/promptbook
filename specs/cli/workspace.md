# Project paths and task sources

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

The project root, Git working tree and installed package directory are three distinct paths. Changing `--path` must consistently affect Books, context, tasks, templates, subprocess cwd, checks and artifacts. Git operations use the enclosing repository discovered for the project, but must not move tasks to that repository's root.

## Task source configuration

`--tasks <directory>` defaults to `tasks` relative to the selected project. The legacy source remains `prompts`. An absolute path inside the project is allowed; paths containing spaces must work. For mutations, validate real paths and symlinks to prevent writes into another workspace.

A nonexistent implicit source is empty. An explicit missing or invalid `--tasks` is an error for read/run; `init` and `migrate` may create a validated destination. When paths alias each other, apply each adapter only once. All commands, child workers and isolated worktrees use the same resolved configuration.

Load only top-level `.book` files from the task source, nonrecursively like the legacy queue. Subdirectories containing templates, archives and traces are not discovery sources.

## Related specifications

- [Project initialization](initialization.md)
- [Git preflight](git-preflight.md)
- [Legacy Markdown tasks](task-markdown.md)
- [Task Books](task-books.md)
- [Task isolation in a worktree](isolation.md)
