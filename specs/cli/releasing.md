# GitHub Actions checks and publication

[Main specification](../_main.md) · [Operational quality](operations.md) · [Installation](installation.md)

The official repository's **Check ptbk** and **Publish ptbk** GitHub Actions workflows are expected to pass for their applicable commits and releases. Passing both workflows is a required release acceptance outcome. Passing local checks is useful evidence; completion also requires successful hosted checks for the exact source being accepted or released. A required job that fails, is cancelled or is skipped does not satisfy this requirement.

## Check workflow

Check branch pushes and pull requests with a frozen dependency installation and the complete project check command. Required coverage includes Node 22 and 24 on Linux, macOS and Windows, including type checking, behavioral fixtures and disposable local/global package installation checks. A failure in any required matrix job fails the workflow. Keep the other matrix jobs running so their diagnostics remain available.

Fixtures preserve the runner's tools and environment, handle canonical paths and platform path conventions, and provide their own Git identity and provider substitutes. They pass on a clean runner without a configured global Git author or signing identity. Await owned background work and close runtime resources before removing fixture projects. Observe the actual completion boundary with bounded waits. Fix failures and races without weakening assertions, removing required platform coverage or bypassing validation.

## Publish workflow

For an authorized release tag or manual dispatch in the official repository, validate the exact immutable tag across the complete check matrix before uploading the single `ptbk` package. The publication job remains blocked when validation fails. A skipped publication following failed validation is an unsuccessful release outcome.

Successful publication means the tagged version, matching manifest/lockfile and distributable are validated, npm accepts the package with provenance, and bounded public-registry verification confirms the expected version, tarball integrity and default installation channel. Disposable unversioned local/global installations must report that released engine version. Required check and publication jobs finish successfully; logs retain actionable evidence for failures.

Retry a temporary infrastructure failure against the same tag only when its source is still valid. A code or test fix follows the ordinary commit process and requires a new version/tag; preserve existing release tags and published versions. Recheck that new tag before publishing it.

When reporting a GitHub Actions fix, identify the failing jobs and cause, verify the corrected behavior locally, and distinguish that evidence from hosted results. Until the corrected source has passed the required hosted jobs, report hosted verification as pending; an older successful run or a local pass cannot stand in for it.
