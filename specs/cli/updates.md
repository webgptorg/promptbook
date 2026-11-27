# Engine-owned self-update

[Main specification](../_main.md) · [System tasks](system-tasks.md) · [Configuration compatibility](configuration-migrations.md) · [Installation](installation.md)

Every running project engine owns its update decisions and execution. The host control service may discover projects, relay their installation/policy information and launch/monitor processes; it does not choose releases, schedule updates or become a global updater. A short-lived helper needed to replace the running engine belongs to that engine's update mechanism. This is separate from [harness updates](harness-updates.md).

## Project policy and version selection

Save the policy in Git-versioned `ptbk.json` under `updates`. `updates.isAutoUpdateEnabled` defaults to **true**. Optional `updates.versionRange` constrains allowed versions using npm-style ranges or an exact version. Omission allows **minor and patch releases within the current major version**, including minor changes while the major is zero; do not substitute the more restrictive zero-major meaning of a caret range. Preserve explicit false, exact pins and narrower user ranges through init, migration and restart. No extra init question is required for these defaults.

Range constraints and release-channel eligibility are both enforced. A broad range does not itself opt a stable installation into prereleases. Compare versions through the same semantic-version comparator as migrations, including numeric prerelease ordering and ignoring build metadata for precedence.

| Current installation | Default automatic candidates |
| --- | --- |
| Stable, e.g. `0.119.0` | Newer stable patches/minors in major `0`; no `1.0.0` and no prerelease. |
| Prerelease, e.g. `0.119.0-39` | Newer stable or prerelease versions admitted by the range, including a later prerelease base such as `0.120.0-1`. Prefer its own stable `0.119.0` when published. |
| Stable after leaving that prerelease | Stay on stable candidates; do not enter the next patch/minor's prerelease automatically. |
| Exact version pinned | No automatic move away from that exact version, including an exact prerelease pin. |

When the current prerelease's stable base version is published, prefer that stable transition. Otherwise a prerelease installation can advance to the newest allowed stable or prerelease, including a different base; it is not stranded when development moves to a new line. Once a stable version is running, infer the stable channel again and never automatically re-enter a prerelease. Evaluate broad range limits against the candidate's base release with this explicit prerelease rule; an exact pin remains exact. An operator can deliberately select a prerelease again, after which the same transition rule applies. Disabling automatic updates and pinning a version are distinct choices. Advanced explicit ranges may allow a major upgrade; the default never does. No mandatory manual-approval mode for every individual release is introduced.

## Discovery and offers across installation methods

Infer the release channel from the actual running semantic version, independently of whether it came from npm, the shell bootstrap, a Windows EXE or a macOS DMG. Numeric prereleases use semantic ordering (`-10` is newer than `-9`); build metadata does not change precedence. An npm `latest` tag pointing to a prerelease is never permission to offer it to a stable installation. Init and engine discovery select from the published version history with the same policy; desktop discovery bundles that selector from the same source.

Availability checks and permission to install are separate. Turning `updates.isAutoUpdateEnabled` off keeps bounded periodic checks and **Check now** working. The engine snapshot's optional `available` field names a channel/range-eligible newer version; `target` remains the permitted automatic installation task. A notification alone does not enter the task queue or change project policy. Show the offer in the terminal Console and System → Engine updates, including current/available versions and how to enable installation when supported. The interactive global Console also checks the invoked installation even when no project engine exists. Its check is read-only; replacement of a shared installation remains engine-owned. Read-only commands do not install or migrate.

The initial engine check is delayed by one minute, successful checks repeat every six hours and failed checks retry after one hour. Manual checks are available immediately. Unavailable registries mean **unknown**, never up to date, and do not block ordinary work. Supported, unsupported and disabled installations may all discover releases; maintenance operations and Android retain their existing exclusions.

| Installation | Update offer and execution |
| --- | --- |
| npm local/global | Discover from npm version history; retain the existing exact-install, shared-policy, idle-boundary, restart and recovery path. |
| Shell VPS | Treat its dedicated npm prefix as global. A `ptbk-installation.json` marker outside the replaceable package identifies the method/root. Only that prefix is writable by the dedicated engine account; Node and bootstrap remain administrator-owned. Repeated bootstrap reads the actual package version rather than an obsolete installation receipt. |
| Windows desktop | Check the desktop version independently of the npm engine version. Offer the exact uploaded `Promptbook-Setup-<version>-windows-x64.exe` through the user's browser. The engine keeps its independent npm updater. |
| macOS desktop | Check the desktop version and offer the exact uploaded `Promptbook-<version>-macos-<arm64|x64>.dmg`, or an explicitly labelled unsigned experimental DMG. The marked bundled engine is never overwritten through npm; its runtime and desktop are replaced together by the installer. |

The desktop app checks in its main process one minute after launch, every six hours after success and one hour after unknown results, including while only its tray is open. Keep **Check for updates** in the application and tray menus. Show a compact **Update available** button in each window only while a matching installer is known. The button stays accessible when switching projects and opens the installer in the user's browser. Omit version and channel details from the offer. Label unsigned experimental macOS builds beside the button. A check that finds no update leaves the window quiet, including a manual check. Report lookup failures only for a manual check and keep its active project open. Coalesce overlapping checks.

Read published GitHub Releases, including prereleases; ignore drafts, malformed tags, uploads still in progress, empty artifacts and wrong OS/architecture. Follow pagination with a bounded total deadline (15 seconds, at most five pages of 100); truncated history is unknown rather than proof of no update. Use only canonical download URLs derived from the known repository, validated tag and exact installer filename. The renderer cannot provide arbitrary destinations. Missing assets do not produce a broken offer. A failed recheck can retain a previously known download link while marking the result unknown.

This delivery provides installer notifications/download links for desktop clients. It does not silently replace a running app, restart engines, or claim desktop installation has completed. Windows/macOS self-installing OTA remains a separate upgrade to the release/signing/recovery machinery. Android APK updates are outside this change. Existing desktops need one ordinary installation of a version containing this discovery mechanism before they can offer future releases.

The terminal dashboard and remote App invoke the same engine policy operations. The version-zero App needs only the automatic-update on/off switch; version display is useful but optional, advanced range forms and historical-version selection are not release requirements. An explicit policy change commits its own configuration change and cannot be silently overwritten by a platform account, relay or older client.

## A low-priority system task

Self-update is an engine-defined **system task**, visible through the common task inventory/detail/event model, with lower priority and the condition that the affected engine/installation has free hands. Use common task eligibility and priority, not a separate scheduler. It need not have a project Book or an agent executor.

An available or queued update does not stop ordinary task intake or reserve an idle window in advance. Higher-priority work can keep delaying it. There is no timeout, forced deadline or special starvation solution required now. Once an eligible update actually claims its safe maintenance boundary, coordinate against new work, configuration changes and other users of that installation; never replace loaded code mid-task or lose an in-flight chat. Progress distinguishes discovered, waiting, checking, installing, restarting, verified and failed/recovering outcomes without requiring those words as wire-format enums.

An update is not a new fifth live lifecycle state. Show its system-task progress alongside the existing lifecycle and restart intent. Manual pause/stop still blocks automatic background tasks. A maintenance helper or update-induced restart must preserve the latest manual intent; a pause/stop accepted during maintenance cannot be erased by a stale successful-update callback. An ordinary user Restart does not install a new version implicitly.

Include the [keep-awake handoff](power-management.md#restarts-and-updates) in the safe replacement boundary for a protected engine. If replacing it would allow a closed-lid MacBook to sleep before the replacement can take over, defer automatic replacement and show the reason.

## Local and shared global installations

Target the installation actually running, not another project copy or every package installation on the host. Preserve dependency versus devDependency placement for a project-local package. Unrelated global/local installations coexist and projects may run different loaded versions; restarts retain the chosen installation.

A project-local update affects its own installation. Replacing a shared global installation affects every project using that particular installation, including what those projects load at their next start. Therefore the target must satisfy all associated project policies: one exact pin effectively pins that shared installation for everyone. Never bypass it by letting another project update the same package, or silently move the pinned project to a different installation. Preserve explicit stopped/paused intent for associated projects.

Revalidate the shared installation, associated policies and required safe boundaries before the change. Coalesce competing proposals so only one engine-owned operation replaces a shared installation. The host service can supply registry/process/policy information, but all update decisions stay with the engine mechanism. Unknown compatibility/ownership is not permission to overwrite the installation. The exact lock/helper/cooperation design remains technical work.

Mixed conflicting policies over one global installation are an acknowledged edge case. Normal initial deployments are a separately managed computer or one project per VPS. Do not add a new onboarding branch, global settings object or extra App notifications to solve that edge case now. Separate local installs remain the explicit way to use independently managed versions.

## Verification, migration, audit and recovery

Before installation, verify the release's authenticity, integrity and compatibility under the agreed release contract. Disabling automation, manually selecting a version or using a helper does not bypass verification. Distribution artifacts, signatures/provenance, revocation, release delays and the UI/engine release relationship must be agreed with the platform/release team. The platform draft's 72-hour regular delay, 24-hour security delay and following 24-hour rollout are **proposals to reconcile, not approved numeric engine policy** in this specification.

Permission for an automatic update includes its necessary deterministic [project migration](configuration-migrations.md), without an additional confirmation for each migration or a new "irreversible migration" approval category in the first version. Capture the pre-change versioned content in Git before transformation, preserving authorized concurrent edits and scoped staging. Commit the successful migration of `ptbk.json`, affected Books and any changed local package/lock files through the shared migration/operation boundaries. System changes use the [categorized automatic format](git-persistence.md#commit-messages-and-history) without an invented agent. Do not claim that Git protects ignored files, Wallet keys, native sign-ins or external service state, or that a revert undoes an external action.

Verify the replacement's actual loaded version and usable service before reporting success. Keep sufficient prior installation/recovery information to autonomously restore functional operation after a failed update; simply stopping and asking the owner to fix it is not the default. Recover interrupted installation, launch and migration phases without replaying completed external work. Binary rollback must not run an older engine against incompatible migrated state or silently downgrade `promptbookVersion`; select a compatible recovery path and preserve evidence. Secrets keep their existing protection.

Use bounded technical attempts followed by cause-aware autonomous recovery/rechecks under shared [progressive waiting](../concepts/progressive-waiting.md), rather than an endless tight loop or a generic "try again?" question. Apply backoff to failed recovery, without changing the normal successful update-check cadence. Human host access is a last resort when autonomous recovery is genuinely insufficient. Manual pause/stop remains authoritative throughout recovery. The concrete replacement/rollback mechanism, cooperation between processes and updating the simple host service still need technical design; this document does not prescribe blue/green, containers or a second permanent updater.

## Early installation and compatibility gate

Before a new project exists, early interactive init can still offer an optional update of the invoked installation. Intent remains the first question and survives the decision. Show current/target versions and affected local/global scope, with Yes focused. No continues only if compatible. An explicitly accepted successful early update ends that invocation before target setup, preserves accepted intent/assets as a bounded recoverable draft and asks for a rerun; it must not pretend already loaded code changed in place. This attended installation path is distinct from a running engine's autonomous maintenance/restart.

If saved `promptbookVersion` is newer than the executing engine, preserve the compatibility gate before affected work/writes. When a compatible update is already allowed by the saved automatic policy, use the same engine-owned update/recovery path without a redundant confirmation. If disabled, pinned out, unsupported or unavailable, preserve the project and report the real constraint; never downgrade it or silently override policy. Noninteractive first-use decisions must be explicitly supplied; do not invent consent from an interactive default.

Release lookup is bounded/best-effort. Offline means unknown, not up-to-date, and does not stop otherwise compatible local work. Read-only commands perform no update or migration. Unsupported installation methods preserve the selected install and report the limitation, not mutate a different copy.

## Acceptance outcomes

- Default stable selection includes minor/patch within the same major, including `0.119.0` to `0.120.0`; it excludes all prereleases and a major change. Test numeric prereleases, later prerelease bases, transition to its stable release and no later automatic re-entry. Exact pins and explicit false survive reload/migration/restart. Disabled automation still discovers/offers updates without scheduling installation.
- Desktop offers require real uploaded matching assets, distinguish app and engine versions, remain available across windows/projects, and treat offline/rate-limited/truncated feeds as unknown. Bundled engines refuse npm replacement. Shell installations identify their own writable prefix and survive repeated bootstrap after an engine update.
- Independent local copies update independently; a pin in any project blocks a conflicting shared-global replacement. Concurrent update proposals produce one replacement and preserve the other projects' installation choices and manual state.
- Continuous higher-priority work defers update without closing task intake or forcing a deadline. A merely visible queued update neither drains work nor changes lifecycle. During actual maintenance, accepted pause/stop survives restart/recovery.
- Verify release and loaded replacement, capture/commit migration changes without secrets or a fictitious agent, and recover an interrupted/failed update autonomously where possible. Do not run an incompatible older binary against migrated state or repeat confirmed external effects.
- CLI/App policy changes share the operation; early attended init retains its distinct rerun/draft behavior. No global updater, separate scheduler, fifth live state, mandatory migration confirmation or claim of completed implementation is introduced.
