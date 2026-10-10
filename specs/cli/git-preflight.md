# Git preflight

[Main specification](../_main.md)

Read-only inspection may operate without Git. Mutating execution must establish a valid project working tree before installing tools, writing project files or making model calls. Interactive setup may offer Git initialization; declining leaves no partial project changes. Explicit `ptbk init` already authorizes initializing a missing repository, including in noninteractive mode.

Support a repository with no first commit, nested project directories and worktrees where `.git` is a file. Never create a nested repository inside an existing one. Distinguish missing Git, a damaged repository and a bare repository; do not disguise them as ordinary missing initialization.

Initializing Git must not commit unrelated existing user files. An initialization commit is scoped to authorized setup artifacts. Establish a committed baseline or explicitly owned bootstrap work before unattended task execution, explaining any action the user must take.

Do not add remotes, overwrite history or force-push by default. See [workspace](workspace.md), [initialization](initialization.md) and [Git persistence](git-persistence.md).
