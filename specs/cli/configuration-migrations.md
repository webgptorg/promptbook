# Versioned project migrations: configuration and Books

[Main specification](../_main.md) · [Configuration](configuration.md) · [First tools migration](tools-migration.md) · [Automatic repair](../concepts/automatic-repair.md)

## Version contract

`ptbk.json.promptbookVersion` is the engine version that initialized or last successfully migrated the project, including configuration and affected Book sources. New initialization writes the actual running engine version. It is not a second independent schema-version counter and is not permanently frozen at the creation version.

Use one semantic-version comparator for engine/project compatibility and migration ordering. Compare major, minor and patch numerically, then prerelease precedence; numeric prerelease identifiers are numeric, not lexicographic. The project's release convention uses numeric prereleases, not invented alpha/beta labels. For example, `0.119.0-9 < 0.119.0-10 < 0.119.0 < 0.120.0`. Build metadata does not change precedence. Malformed versions are configuration problems, not permission to assume zero or downgrade.

Let C be the saved configuration version and E the executing engine version:

- **E = C:** no version migration or version-only commit. Independent deterministic normalization can still repair a noncanonical setting.
- **E < C:** before starting project work or modifying its configuration, explain both versions and offer to update the invoked installation through the ordinary [update workflow](updates.md). Preserve the project, do not downgrade it or pretend it is compatible. After updating, rerun with the new engine. Unattended use reports the required action without a hidden prompt.
- **E > C:** perform the ordered migration pass below before affected new work.

Read-only inspection can report compatibility and required migrations but never writes or commits them. Reloaded configuration is also checked, not only initial process startup. If a running older engine encounters a newer configuration, preserve active work and controls, stop taking incompatible new work and request the engine update; do not overwrite the newer format.

## Fixed legacy baseline

When `promptbookVersion` is absent, assume the fixed unversioned baseline **`0.119.0-21`**, the version inspected before this mechanism was introduced. Do not inspect the document's shape, guess its age, search Git history or invoke Fixer merely because the field is missing. This baseline never moves with future releases. Apply the ordinary forward migration chain from that point. Other genuine parse/validation problems still use automatic repair.

The first release implementing the versioned tools format must bind [its migration](tools-migration.md) to that release's exact version, greater than the baseline. Future releases retain both the baseline and that historical migration target. This specification change does not bump the package version or claim the migration is already implemented.

## Sparse, ordered migration chain

A migration belongs to a particular target engine version. Many releases have no migration. Select every registered step with `C < target <= E`, sort by semantic version and apply them in that order to the project. A deterministic step may transform `ptbk.json`, agent/task/chat Books, references and related source assets together. There is one migration coordinator and one project version, not independent configuration-versus-Book migration systems or per-Book version fields. A migration spanning ten releases may execute zero, one or many steps; gaps are normal and do not require dummy steps.

A step deterministically transforms its assigned project behavior. It must not advance `promptbookVersion`, create an independent commit or perform ordinary task work. The coordinator owns those actions: after all selected steps succeed, validate/canonicalize the complete prepared migration result (checking transformation invariants, not rejecting unrelated recoverable user-content warnings), set `promptbookVersion` to E and persist **one dedicated commit for the whole pass**, including all affected configuration and Book files. Even with no selected steps, changing the version is a real committed operation. Do not fold task changes, unrelated configuration edits or another operation's files into it.

Use an automatic `PTBK: ` subject describing migration from C to E; the body can identify the applied migration targets. This is the runtime engine's commit convention, distinct from commits that edit these specification documents. No empty commit is needed when E and C are already equal and nothing else changes.

## Safety and recovery

Coordinate migration with other configuration writers and project Git ownership. Preserve unrelated settings, explicit false values, custom paths, staging and work in progress. Prepare the complete result before exposing changed configuration or Books to new work. A failed step must not advertise an advanced version, expose a partially migrated project to work, discard the original or commit a partial success.

Keep enough bounded recovery information to resume or safely retry an interrupted pass without duplicate transformations/commits. If the commit fails, retain the prepared result as pending migration work and retry persistence, not already successful tasks or external actions. Report the actual failure through the shared automatic-repair path. A migration must not use blanket staging, destructive reset or history rewriting to force success.

Migration commits are required. An invocation explicitly forbidding commits must report the required migration and how to run it in committed mode before making migration writes; it must neither silently violate `--no-commit` nor apply an untracked migration. Subsequent task work may still use its separately selected persistence policy. Credential changes, if required, obey [environment-file safety](environment.md); secrets never enter the migration commit.

## Acceptance outcomes

Compare numeric patches/prereleases and stable releases correctly. Verify equal versions are a no-op, an older engine offers an update without writes, and a newer engine selects exactly the applicable ordered steps. Cover zero steps, gaps, many steps and one scoped commit including the final version. A versionless configuration always uses the fixed baseline without shape analysis. Inject a step failure, concurrent edit, failed signing/hook and crash around commit: preserve recoverability, do not stamp false success or include task changes. Repeated successful startup creates no migration commit.

## Deterministic scope and imported Books

All migration transformations are deterministic now: no migration agent, model call or judgment-based rewriting is part of a step. A possible migration agent is future scope. A failed ambiguous transformation uses the common diagnostic/repair path and preserves source; ordinary Fixer repair of the underlying issue is not a replacement migration implementation.

The project's saved version selects automatic steps. **Do not infer the age of an individual Book.** If an already current project later receives an older Book, do not add heuristic format-age detection, a Book version marker or an automatic import-time migration. Normal resilient parsing/diagnostics and ordinary Fixer work still apply to actual problems. An explicit requested conversion uses the same deterministic operations/coordinator with a stated source scope; it is not triggered by guessing a file's age.

Acceptance additionally covers one step changing JSON and several Books, a later-step failure without a false version advance or partial visible migration, and one commit for the complete successful pass. Import an old Book into a current project and verify no age detector/migration agent or automatic conversion runs. See [Book conversion](migration.md) and [routing/model conversion](routing-migration.md).

Dashboard removal retires `server.tunnel` and `service.qr`/`service.isQrShown` in one ordinary forward migration. Deterministic normalization also retires those obsolete fields in current-version projects. Neither path contacts a provider, installs software, reads old authentication files or changes local HTTP/persistence choices. Read-only inspection remains a preview.
