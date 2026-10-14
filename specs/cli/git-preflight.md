# Git preflight

[Main specification](../_main.md)

Read-only inspection may operate without Git. Project initialization and mutating task execution establish a valid working tree before writing bootstrap artifacts, installing project dependencies or making project model calls. Interactive startup offers missing initialization through the shared [init workflow](initialization.md); declining leaves no partial project setup. Explicit `ptbk init` authorizes creating a missing repository, including noninteractively, but not an unspecified nested-repository strategy. The earlier, separately authorized [engine self-update](updates.md) is not project bootstrap.

Detect and reuse existing repositories, including those without a first commit, nested project directories and worktrees where `.git` is a file. Preserve the current branch and history. Never create an accidental nested repository; the explicit ignored-child/submodule choices in [nested-project initialization](nested-projects.md) are the only setup exception. Distinguish missing Git, damaged repositories and bare repositories; do not disguise them as ordinary missing initialization.

Default successful basic initialization commits only authorized setup artifacts, as an initial commit or a new scoped `PTBK: ` commit in existing history. Preserve unrelated files and staged/unstaged changes; never blanket-stage them. Repeating already-satisfied setup creates no empty commit. Respect identity, hooks and signing; report persistence failures and outstanding work rather than claim initialization succeeded. Explicit `--no-commit` follows the uncommitted-mode contract and reports that the normal committed baseline has not been established.

Establish a committed baseline or explicitly owned bootstrap work before default unattended execution. Authoring operations establish their own baseline automatically; they do not routinely leave new tasks for the user to commit. Explicit uncommitted operation still checks source revisions and ownership. Do not add remotes, rewrite history, force-push or commit parent-repository metadata by default. See [workspace](workspace.md) and [Git persistence](git-persistence.md).
