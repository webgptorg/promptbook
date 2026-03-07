[ ]

[✨✩] Coding script: auto-push commits + ensure Vercel builds for Hejny & AI agent

-   Currently the coding script can create commits, but it does not reliably **push** them to the remote repository.
-   Additionally, even when commits are pushed, **Vercel builds are being ignored** for some commits (likely due to author/identity filters, Git provider configuration, or Vercel “ignored build step”/deploy settings).
-   Goal: every commit produced by the coding script must be pushed automatically, and Vercel must build commits authored by user **Hejny** and by **Hejny’s AI agent**.

## Scope

-   Update the **coding script** to automatically push after every successful commit.
-   Update the **Vercel configuration** (and/or GitHub integration settings, and/or repository settings) so that builds are triggered for:
    -   commits authored by `Hejny`
    -   commits authored by `Hejny AI agent` (exact identity to be finalized)
-   Add change log entry.

## Requirements

### 1) Coding script automatically pushes

-   After the script creates a commit, it must run `git push` automatically.
-   The push must target the correct upstream/branch.
    -   If the local branch has an upstream, push to it.
    -   If it does not, set upstream on first push.
-   If push fails:
    -   the script must clearly report the error
    -   it must not silently continue
    -   it should provide actionable hint (auth issue / remote rejected / branch protection / diverged history)
-   The script must be idempotent: if there is nothing to push, it should exit without error.

### 2) Use correct Git identity for commits

-   The coding script must set a predictable commit identity (name/email) so downstream CI (Vercel) can attribute commits consistently.
-   Define two supported identities:
    -   Hejny (human)
    -   Hejny AI agent
-   Implementation detail is @@@:
    -   whether identity is decided by environment variable
    -   or always uses AI agent identity
    -   or uses GitHub App / bot user

### 3) Ensure Vercel builds are not ignored

-   When commits are pushed by the coding script, Vercel must trigger builds (Preview/Production depending on branch) instead of skipping them.
-   Ensure this works at minimum for:
    -   default branch builds
    -   PR builds (if PRs are part of the workflow)
-   Fix/adjust the mechanism that currently causes Vercel to ignore some commits. Possible causes to investigate:
    -   Vercel “Ignored Build Step”
    -   Vercel Git deployment settings (e.g. only build for certain branches)
    -   GitHub integration doesn’t include bot user / GitHub App permissions
    -   author/committer email mismatch
    -   monorepo root / framework detection issues

### 4) Observability / verification

-   Add a simple way to verify end-to-end:
    -   run coding script → commit created → push done
    -   Vercel deployment created automatically
-   Document where to look for failures:
    -   script logs
    -   `git status` / `git log` / `git remote -v`
    -   Vercel deploy logs / skipped deploy reason

## Acceptance criteria

-   Running the coding script on a clean repo results in:
    -   at least one commit created (when there are changes)
    -   commit is pushed automatically to remote
    -   user sees success output including pushed ref/branch
-   For commits authored by Hejny and by Hejny AI agent:
    -   Vercel creates a deployment (build is not ignored)
    -   deployment finishes (success or fail), but it is not skipped
-   A failure to push produces a clear error and non-zero exit code.

## Non-goals

-   Changing overall deployment strategy (e.g. migrating away from Vercel) is out of scope.
-   Solving unrelated CI issues (tests failing) is out of scope; only “builds being ignored/skipped” is in scope.

## Notes / open questions

-   What is the exact Git identity for the AI agent?
    -   name: @@@
    -   email: @@@
    -   GitHub user / bot: @@@
-   Which branch(es) should trigger Production vs Preview deployments?
    -   production: @@@
    -   preview: @@@
-   Where is the “coding script” located and how is it invoked? (repo path / package / binary)
    -   @@@

---

[-]

[✨✩] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨✩] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨✩] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
