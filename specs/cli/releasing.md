# GitHub Actions checks and publication

[Main specification](../_main.md) · [Operational quality](operations.md) · [Installation](installation.md) · [Windows installer](windows-installer.md)

The official repository's **Check ptbk** and **Publish ptbk** GitHub Actions workflows are expected to pass for their applicable commits and releases. Passing both workflows is a required release acceptance outcome. Passing local checks is useful evidence; completion also requires successful hosted checks for the exact source being accepted or released. A required job that fails, is cancelled or is skipped does not satisfy this requirement.

## Check workflow

Check branch pushes and pull requests with a frozen dependency installation and the complete project check command. Required coverage includes Node 22 and 24 on Linux, macOS and Windows, including type checking, behavioral fixtures and disposable local/global package installation checks. A failure in any required matrix job fails the workflow. Keep the other matrix jobs running so their diagnostics remain available.

Fixtures preserve the runner's tools and environment, handle canonical paths and platform path conventions, and provide their own Git identity and provider substitutes. They pass on a clean runner without a configured global Git author or signing identity. Await owned background work and close runtime resources before removing fixture projects. Observe the actual completion boundary with bounded waits. Fix failures and races without weakening assertions, removing required platform coverage or bypassing validation.

Reviewed planning saves produce their scoped `ptbk: ` commit on every supported platform, including nested task paths and paths with spaces. Check fixtures inspect the committed contents and preserve unrelated work. A written file without the required commit is pending persistence and fails acceptance. Real browser checks allow bounded startup under runner load and retain actionable, redacted startup failure evidence.

## Publish workflow

For an authorized release tag or manual dispatch in the official repository, validate the exact immutable tag across the complete check matrix before uploading the single `ptbk` package. The publication job remains blocked when validation fails. A skipped publication following failed validation is an unsuccessful release outcome.

Successful publication means the tagged version, matching manifest/lockfile and distributable are validated, npm accepts the package with provenance, and bounded public-registry verification confirms the expected version, tarball integrity and default installation channel. Disposable unversioned local/global installations must report that released engine version. The same version's Windows installer and both macOS DMGs must also be built, verified and downloadable from its GitHub Release under the requirements below. Required check and publication jobs finish successfully; logs retain actionable evidence for failures.

### Additional Windows release artifact

Automatically produce the [Windows installer](windows-installer.md) as an additional output of the ordinary versioned release build, alongside the existing package publication. Every newly published version receives it, including published prereleases with their corresponding release/channel labelling. Preserve existing npm distribution, provenance, validation and channel behavior; the installer neither replaces those outputs nor promotes a prerelease to stable. No separate manual packaging/upload step or second version source is allowed.

Build from the same immutable tag and derive the installer's advertised/target package version from the validated release version. Before publication, build and test against that exact package candidate rather than an unrelated registry latest. Keep public-registry-dependent verification after the corresponding package becomes available.

The matching GitHub Release contains a usable `.exe` or `.msi` asset with version/platform-identifying metadata or filename and a published integrity checksum. Verify the actual downloadable asset and its integrity, not just a temporary CI artifact or successful upload response. Its normal installation must obtain and report the exact published `ptbk` version. Release descriptions distinguish installation of the bootstrap prerequisites from subsequent CLI project initialization.

Required Windows installer checks cover a disposable clean supported environment without Node.js/npm/Git, compatible preinstalled prerequisites, a partial installation, repeated setup, preservation of project paths and the boundary between installation and the first desktop launch. A hosted runner with all tools preinstalled does not by itself prove the clean-machine path. Isolate these checks instead of removing the shared runner's tools. Use controlled project/provider substitutes so validating handoff does not require real user credentials or paid agent work. Retain useful diagnostics and run the installer-specific acceptance outcomes without weakening the existing cross-platform package matrix.

### Additional macOS release artifacts

Build a drag-to-Applications DMG on native Apple Silicon and Intel runners from the same validated tag. Both DMGs include the tagged engine and a matching native Node.js and npm runtime. The macOS job can run alongside npm publication because the app uses the tag's built engine directly. Keep the native desktop dependencies out of the npm package.

Before uploading, mount each DMG, copy its application and check the bundled CLI version and architecture, npm, the real Electron PTY and shared client behavior. Upload both DMGs with architecture and version in their filenames and a separate SHA-256 for each. Download and verify each published asset against its checksum. Run packaged smoke tests on both architectures in Check as well.

Stable macOS releases require Developer ID signing and Apple notarization with stapled tickets. A prerelease can use a clearly labelled `-unsigned.dmg` candidate with an ad-hoc signature when Apple credentials are absent. An incomplete signing configuration or failed signing or notarization fails the macOS job.

### Partial publication and retries

A missing, corrupt, mismatched or unverified installer means the combined release is incomplete even when npm publication succeeded. Report each output separately; do not mark the release successful or silently skip the installer job. Likewise, an uploaded installer does not compensate for a failed/unavailable npm publication.

Retry a temporary infrastructure failure against the same tag only when its source is still valid. Reuse and verify already-published matching package/assets rather than republish the same npm version or overwrite a different existing artifact. Retry the missing/failed stage and its verification without moving the tag. A code or test fix follows the ordinary commit process and requires a new version/tag; preserve existing release tags and published versions. Recheck that new tag before publishing it.

When reporting a GitHub Actions fix, identify the failing jobs and cause, verify the corrected behavior locally, and distinguish that evidence from hosted results. Until the corrected source has passed the required hosted jobs, report hosted verification as pending; an older successful run or a local pass cannot stand in for it.

### Optional desktop payload

The Windows installer includes the matching [desktop client](desktop.md) as a default-selected component. Derive its packaged version from the root release manifest, keep its dependencies outside the npm engine package, rebuild/package its native PTY for the Electron ABI and run Windows checks against the actual packaged executable. Exercise two windows, the embedded native CLI, graphical init cancellation and engine survival after clients close, with deterministic fixture harnesses. Package the external-Node controller adapter outside the Electron archive so system Node can execute it. CLI-only bootstrap checks remain independent.
