# Git preflight

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

A read-only command may operate on a directory without Git. A mutating command must resolve Git before installing a harness, generating files or making a paid call. An ordinary mutating action may offer `git init` in an interactive terminal; declining must leave no partial side effects. In noninteractive mode, a missing repository must exit with instructions. Explicit `ptbk init` / `coder init` is the exception: the command already expresses initialization intent and may initialize Git even with `--no-questions`, without further confirmation.

`git init` must never itself commit the user's original files. Any explicit initialization commit must include only initialization artifacts actually created/changed. A repository without its first commit is a valid supported state. Distinguish a missing Git executable, a damaged repository and a bare repository; do not hide any of these problems behind a new `git init`.

Never create a nested `.git` inside an existing repository. Preserve Git worktrees and the case where `.git` is a file. Defaults must not add a remote, force-push or overwrite someone else's history.

## Related specifications

- [Project paths and task sources](workspace.md)
- [Project initialization](initialization.md)
- [Change ownership and Git persistence](git-persistence.md)
