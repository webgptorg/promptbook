[ ]

[✨✩] Coding script: auto-push commits + ensure Vercel builds are both for Hejny & AI agent

-   Currently the coding script can create commits, but it does not reliably **push** them to the remote repository.
-   Additionally, even when commits are pushed, **Vercel builds are being ignored** for some commits (likely due to author/identity filters, Git provider configuration, or Vercel “ignored build step”/deploy settings).
-   Goal: every commit produced by the coding script must be pushed automatically, and Vercel must build commits authored by user **Hejny** and by **Hejny’s AI agent**.

## Scope

-   ./src/cli/test/ptbk.ts coder
-   Update the **coding script** to automatically push after every successful commit.
-   Update the **Vercel configuration** (and/or GitHub integration settings, and/or repository settings) so that builds are triggered for:
    -   commits authored by `@hejny`
    -   commits authored by Hejny AI agent (The identity of the coding scipt)
-   Add change log entry.

## Requirements

### 1) Coding script automatically pushes

-   After the script creates a commit, it must run `git push` automatically.
-   The push must target the correct upstream/branch.
    -   If the local branch has an upstream, push to it.
    -   If it does not, set upstream on first push.
-   If push fails:
    -   the script must clearly report the error into the log file
    -   Use current structure of coding script fail
    -   it must not silently continue
    -   it should provide actionable hint (auth issue / remote rejected / branch protection / diverged history)
-   The script must be idempotent: if there is nothing to push, it should exit without error.

### 2) Ensure Vercel builds are not ignored

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
