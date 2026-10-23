# First configuration migration: unified tools

[Configuration migrations](configuration-migrations.md) · [Tools](tools.md) · [Naming](../coding-standards/naming.md)

This is the first concrete migration in the versioned configuration chain. Register it at the exact first engine release shipping this format; the coordinator, not this step, writes the final `promptbookVersion` and commits the complete pass. Unversioned input uses the fixed baseline defined by the migration mechanism, without structural age detection.

## Preserve existing browser and harness choices

Replace the separate top-level `harnesses` configuration and singleton `browser` configuration with the ordered `tools` array. Produce one named HARNESS instance for each previously configured integration, preserving its selection/enabled state, account setup and non-secret connection options. Preserve the meaning of explicit legacy model/thinking preferences through the shared [MODEL conversion](routing-migration.md), not as per-instance tool defaults or allowlists. Adapter capability/model metadata stays with the plugin. Preserve the old order deterministically. Retain explicit disabled entries as `isEnabled: false`, not as active tools. Do not invent installed/authorized harnesses when none were selected.

Convert the existing browser, including its effective saved/default choice, into one named BROWSER tool. Keep the selected Chrome-compatible implementation/executable and profile; never move, copy or reset profile data or log the user out. Convert legacy `browser.profile` values `global`, `isolated` and `user` to profile sources `MANAGED_GLOBAL`, `PROJECT` and `USER_EXISTING`; an explicit path becomes `CUSTOM` with its path retained. Convert `browser.mode: "headless"` to `isHeadless: true` and `"headful"` to false. Preserve the existing default when the old value was omitted.

Give generated instances stable readable kebab-case names, for example `project-browser` and `openai-codex`, with deterministic suffixes only when generating a genuinely new name requires disambiguation. Preserve already explicit user identities; do not silently rename colliding existing tools. Normalize variants to their canonical enums, such as `openai-codex` to `OPENAI_CODEX`, `claude-code` to `CLAUDE_CODE`, `github-copilot` to `GITHUB_COPILOT`, `cline` to `CLINE`, `opencode` to `OPENCODE`, `gemini` to `GEMINI` and `qwen-code` to `QWEN_CODE`.

Convert a legacy `apiKeyEnv: "VARIABLE"` into `apiKey: "${{ env.VARIABLE }}"`, never its resolved value. Preserve explicitly recorded API/native authentication intent; merely finding a key in the environment does not authorize a new paid route. When no durable API-mode authorization exists, keep native authentication and retain the reference as inactive metadata, not an automatic fallback. New explicitly configured API fallback instances are a later authorized tool-management operation. Do not change the user's native account or overwrite its authentication store during migration.

Known routing references retain their meaning after the move: canonical variant requirements remain variant requirements, and any instance references target the corresponding saved name. Do not broaden a restricted task to a different account/provider. Existing legitimate `tools` records are not duplicated or overwritten on recovery. Conflicting legacy/new records are a real repair problem, not a reason to guess or discard one.

## Canonical configuration spelling

Apply the [naming contract](../coding-standards/naming.md) to known migrated fields. In addition to tool `enabled` becoming `isEnabled`, use these explicit legacy-to-canonical boolean mappings:

| Legacy path | Canonical path |
| --- | --- |
| `execution.commit` | `execution.isCommitEnabled` |
| `execution.isolate` | `execution.isIsolated` |
| `execution.normalizeLineEndings` | `execution.isLineEndingNormalizationEnabled` |
| `execution.allowCredits` | `execution.isCreditFallbackAllowed` |
| `execution.questions` | `execution.isQuestionsEnabled` |
| `execution.preserveLogs` | `execution.isLogPreservationEnabled` |
| `execution.autoMigrate` | `execution.isAutoMigrateEnabled` |
| `traces.commit` | `traces.isCommitted` |
| `traces.ignoreVideos` | `traces.isVideoIgnored` |
| `traces.recordVideo` | `traces.isVideoRecordingEnabled` |
| `server.enabled` | `server.isEnabled` |
| `server.tunnel.enabled` | `server.tunnel.isEnabled` |
| `service.persist` | `service.isPersistent` |
| `service.qr` | `service.isQrShown` |
| `discovery.enabled` | `discovery.isEnabled` |
| `learning.enabled` | `learning.isEnabled` |

Preserve the value, including false, for each such rename. Canonicalize known Promptbook-owned enum values: check-before modes to `NO`/`YES_AND_FAIL`/`YES_AND_FIX`, dirty-work policies to `FAIL`/`IGNORE`/`CONTINUE`, harness-update policies to `AUTO`/`OFF`, tunnel providers to `CLOUDFLARE_QUICK`/`CLOUDFLARE_NAMED`, and engine-defined thinking selectors to `LOW`/`MEDIUM`/`HIGH`/`XHIGH`/`MAX`. Provider-native model/effort identifiers and external strings remain provider data, not invented enums.

Introduce root-level **`isAutoSync: false`** for migrated projects lacking that explicit new choice. Do not enable synchronization just because `origin` exists or a legacy auto-pull/auto-push option was present. Retire the superseded persisted `execution.autoPull` and `execution.autoPush` fields and record that change in the migration explanation; do not retain two competing sources of synchronization policy. An already explicit canonical `isAutoSync` value survives idempotent recovery.

Move/rename only fields understood by this migration. Preserve all unrelated configuration and meaningful extension data; conflicting old/new values go through automatic repair. Remove superseded browser/harness fields only after their information has been represented safely. Existing real checks are untouched; introducing the init placeholder is not permission to replace them. No dependency installation, provider login, remote publication or task execution belongs to this migration.

## Acceptance outcomes

Migrate the existing unversioned singleton-browser/per-harness-map format, including multiple integrations, disabled entries, custom executables/profiles, native login and environment references. Verify unchanged profile data, no secret values, preserved false values, canonical names/enums and autosync off. Run through a later engine with several additional steps and observe one coordinator commit. Retry after interruption without duplicate tools. A conflicting preexisting name or legacy/new setting is preserved for repair, not silently overwritten. Unknown unrelated fields and real project checks survive.
