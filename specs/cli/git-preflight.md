# Git preflight

[Main specification](../_main.md)

Read-only inspection may operate without Git. Initialization and mutating task execution establish a valid working tree before bootstrap writes, project dependency installation or model calls. Interactive start reuses the shared [init workflow](initialization.md) for genuine missing setup; explicit init authorizes a missing repository, not an unspecified nested strategy. The separately authorized [engine self-update](updates.md) is not project bootstrap.

Reuse existing repositories, including unborn branches, nested project directories and worktrees where `.git` is a file. Preserve the current branch/history. Explicitly use `main` only when creating a new repository. Never create accidental nested Git; use the existing [ignored-child/submodule choices](nested-projects.md). Distinguish missing Git, damaged and bare repositories from ordinary absent initialization.

Default init commits only authorized setup as an initial/scoped `PTBK: ` commit, preserving unrelated files/staging, hooks, identity and signing. Repeated satisfied setup produces no empty commit. Failed local persistence remains incomplete; explicit `--no-commit` labels its exception and obeys migration/synchronization compatibility rules.

Establish a committed baseline or explicitly owned uncommitted bootstrap before unattended work. Authoring normally creates its own scoped baseline. Validate source revisions and ownership in either mode; a newly committed tool change during another owned task is not unrelated dirt to erase.

Do not add/change remotes by default. The explicit opt-in [synchronization setup](synchronization-setup.md) may create a private-by-default GitHub repository or configure the supplied origin/upstream; remote publication failure remains separate from local readiness. Never rewrite history, force-push or accidentally commit parent metadata. Required configuration migrations use their own coordinated committed pass before affected work.

See [workspace](workspace.md), [configuration migrations](configuration-migrations.md) and [Git persistence](git-persistence.md).
