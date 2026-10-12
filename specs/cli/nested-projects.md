# Initializing a child project inside Git

[Main specification](../_main.md) · [Initialization](initialization.md)

This special case applies when the user chooses a new child-project folder inside an existing Git working tree, including a worktree or a directory below the repository root. Initializing in place simply reuses the enclosing repository; it does not trigger creation of another repository.

Before creating the child repository or changing the parent, explain the versioning boundary and offer:

- **Go back:** return to destination selection without child or parent changes.
- **Independent, ignored project:** add the child's path to the enclosing repository's effective `.gitignore`, then initialize a separate repository and initial setup commit in the child. Ignore the whole child, not just its `.git` metadata.
- **Git submodule:** initialize/register a real submodule, with a committed child baseline and the parent's submodule metadata/reference. A bare embedded repository is not a successful submodule.

Never choose a nested-repository strategy implicitly. Noninteractive use must supply it explicitly or fail before mutation. Validate the target before changing either repository; do not silently reuse, overwrite or delete a nonempty destination. Already tracked content requires explicit resolution, not automatic removal from the parent's index.

For a submodule, make the source/location needed for later checkout explicit. Do not invent a remote, publish a repository or claim portable cloning without a usable source. Missing prerequisites must remain an explained incomplete step or allow a return to the other choices.

Preserve both histories, the current parent branch and unrelated staged/unstaged work. Child setup commits belong to the child. Report the precise parent metadata changes; leave parent changes uncommitted unless a parent commit is explicitly authorized. Partial failure identifies which steps completed so repeating init can safely finish without duplicate ignore entries or registration.

These are narrow, explicitly authorized exceptions to the normal workspace boundary and prohibition on accidental nested repositories. See [Git preflight](git-preflight.md) and [Git persistence](git-persistence.md).
