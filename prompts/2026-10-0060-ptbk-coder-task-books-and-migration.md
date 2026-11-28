[ ]

[✨📚] Introduce configurable task Books alongside legacy Markdown prompts and add ptbk coder migrate

Make `tasks/*.book` the preferred representation of Coder work without breaking `prompts/*.md`. Both sources must work together in the same project and feed one execution engine. Extend Book beyond agent definitions with an explicit task dialect, and provide a safe deterministic migration from the existing Markdown representation.

-   Implement the [not-before annotation contract](2026-10-0050-ptbk-coder-prompt-not-before.md) first and reuse its temporal parsing/eligibility. This PRD establishes one-shot task parity; [recurrence](2026-10-0070-ptbk-coder-recurring-task-books.md) is a separate follow-up exclusive to task Books.
-   This is a parallel transition, not an unconditional folder rename. Do not delete Markdown support, automatically convert a user's queue at startup, or require users to migrate before their existing tasks can run.
-   Do not introduce a second Coder runner, a second set of harness adapters, or a separate server/database requirement for task Books.

## Discovery and configurable task location

```bash
ptbk coder run --harness openai-codex
ptbk coder run --harness openai-codex --path ./my-project --tasks ./work-items
ptbk coder list --path ./my-project --tasks ./work-items
ptbk coder migrate --path ./my-project --tasks ./work-items --dry-run
ptbk coder migrate --path ./my-project --tasks ./work-items
```

-   Add a shared `--tasks <directory>` option. Its default is `tasks` in the selected project. Resolve relative values against the project selected by `--path`, not the package installation directory or enclosing Git root; accept absolute paths and paths containing spaces through the same path infrastructure.
-   Keep the legacy source fixed at the selected project's `prompts/`. The option changes the Book-task source/destination, not the project cwd, agent directory, additional context, or legacy source.
-   For mutating execution/migration, require the resolved task directory to stay inside the selected project's permitted workspace, including realpath/symlink checks. An absolute path inside that workspace is valid; an external path must fail clearly rather than write or commit across unrelated repositories. Keep the selected nested project's boundary explicit.
-   Pass one resolved task-source configuration through run/server, list/dry-run, task authoring/planning, initialization, verification/archive utilities, check-repair artifact creation and migration wherever those commands read or write task sources. Do not add an option which only the main loop honors while a helper still writes into hardcoded `tasks`.
-   Preserve the effective override for child workers, generated command configurations and isolated worktrees. Worktree execution maps the selected directory to the corresponding worktree path; it must not mutate the original checkout's tasks during an isolated round.
-   Load eligible top-level `.md` files from legacy `prompts/` and top-level `.book` task documents from the resolved task directory. Preserve the existing nonrecursive discovery policy unless separately requested; do not accidentally execute archive, template, trace, screenshot or documentation subdirectories.
-   Missing implicit source directories are empty sources, not errors or permission to create directories during listing. A supplied explicit task path that is absent or invalid is an actionable error for read/run commands; init/migrate may create their explicitly requested destination after validation.
-   Support legacy-only, Book-only, mixed and initially empty projects. De-duplicate resolved paths if an override aliases a source directory; apply each format adapter once. A Book agent or malformed task document found in the task source must never silently become executable work.
-   Give legacy users one non-blocking migration tip per invocation, with the correct `ptbk coder migrate` command and effective destination. Do not spam each queue refresh, prompt for a migration during execution, or suppress legacy work because the tip was shown.

## Proposed task Book notation

Use the existing Book style: a human-readable title on the first nonempty line, followed by uppercase commitment blocks with multiline content. The following is the proposed task dialect to implement and document, not an already supported agent Book:

```book
Refresh the supported model catalog

TASK
META ID model-catalog-refresh
STATUS todo
PRIORITY 2
AGENT {../agents/coding/developer.book}
HARNESS openai-codex
MODEL gpt-6-astra
AFTER 2026-10-30T09:00:00+01:00

PROMPT
Update the repository's supported model catalog and related documentation.
Preserve custom provider settings and add regression tests for changed mappings.

RULE
Limit changes to the catalog, its consumers, documentation and relevant tests.
```

-   `TASK` is an explicit document-kind declaration in the header immediately after the title. Do not infer kind from a filename, the presence of `MODEL`, or a word inside prose. Existing Books without this declaration remain agent Books with unchanged behavior.
-   `META ID` provides a stable task identity independent of filename, source directory and display title. Validate uniqueness within the workspace. New authoring and migration generate an ID once; read-only parsing must not generate or save IDs. Missing IDs may be diagnosed as incomplete, but must never produce a new identity on every load.
-   `STATUS` maps to the existing lifecycle: `todo`, `in-progress`, `done`, `failed`, `not-ready`. Preserve the historical alternative not-ready marker when reading Markdown, and preserve failed/in-progress/completed meaning during conversion. `PRIORITY` is the corresponding nonnegative integer, with zero as the default.
-   `AGENT`, `HARNESS` and `MODEL` are separate typed routing fields. Book-agent references use the existing name/path resolver and reference syntax; relative `./` or `../` references are relative to the task Book that declares them. Do not confuse an agent Book with a harness or compile task routing as an agent persona.
-   Feed typed execution requirements through shared selection/resolution. Explicit invocation filters and task requirements must be compatible; missing task fields use the existing defaults. Resolve task requirements before implicit fallbacks where selection is supported, but never silently override explicit flags or install/use an unconfigured paid provider.
-   `AFTER` is the same inclusive not-before restriction and accepted date/time grammar as the prerequisite. It is not agent inheritance: do not overload the existing `FROM` commitment with scheduling semantics.
-   `PROMPT` is the task's implementation body; optional `RULE` blocks are task-local constraints. Preserve their order and content when constructing the task request. They do not create a permanent agent or overwrite the selected agent's Book or additional `--context`.
-   Preserve legacy runner-token semantics explicitly. Add a repeatable task-dialect `RUNNER` compatibility commitment for opaque legacy selectors: several `RUNNER` values retain the current any-of normalized-substring matching. Do not guess that an arbitrary legacy token is specifically a model or an agent and accidentally change OR into AND. Date annotations migrate to `AFTER`, not `RUNNER`.
-   Newly authored explicit `AGENT`/`HARNESS`/`MODEL` requirements are independently named constraints, all of which must hold; a compatibility `RUNNER` group, when present, is an additional any-of filter. Migration normally uses that compatibility representation instead of inferring typed fields from ambiguous tokens.
-   Preserve human notes and runner/cost/timing attribution as non-executable notes or source metadata, not routing requirements. Rewriting `STATUS` must not erase them or turn reported historical model names into future execution constraints.
-   Define a lossless literal-body representation for imported Markdown. For example, the serializer may place a complete Markdown payload inside a fenced block under `PROMPT`, with a correctly chosen fence delimiter; the task-body reader then returns the original payload, not an extra code wrapper. Do not let literal lines such as `MODEL`, `RULE`, code fences or thematic breaks in the imported instructions become new commitments.
-   Keep singleton conflict validation, unknown-commitment diagnostics and escaping explicit. An unsupported scheduling/control commitment must block execution rather than be ignored as harmless prose.

## One shared architecture

-   Introduce a format-neutral task model containing stable identity, title/body/constraints, lifecycle state, priority, runner requirements, normalized trigger data, provenance and a typed source reference. Source references must retain enough location information to update the right Markdown section or Book commitment.
-   Implement Markdown and task-Book adapters behind a narrow parse/read/update/serialize contract. The existing Markdown parser remains the source of truth for its semantics; the task-Book adapter uses shared Book lexical/commitment infrastructure with task-specific validation.
-   Extract shared Book tokenization/prelude/block handling where needed instead of copying the agent parser into a new near-identical file. Scope commitment definitions by document kind, so task `STATUS`, `MODEL`, `AFTER` and later `REPEAT` do not alter existing agent semantics.
-   Do not send a task document through `createAgentModelRequirements`, automatically inherit Adam for it, register it as a chat agent, or derive an agent profile/avatar from its task title. Task and agent share syntax infrastructure, not identity or runtime responsibilities.
-   Both adapters feed one discovery/eligibility/priority queue, claim mechanism, harness execution/check-feedback service, Git ownership policy and result/trace model. Runtime code must not branch into separate implementations for `.md` versus `.book` execution.
-   Keep parsing/normalization pure and separate from filesystem mutations, scheduling, migration orchestration, Git and presentation. Migration must call the same adapters and normalized model as runtime; do not write a second migration-only regex parser or convert Books back to temporary Markdown to run them.
-   Update source status through its adapter and an optimistic source-version check. Preserve formatting/comments when possible; never overwrite a file edited since selection. Report conflicts without losing either version.
-   Preserve deterministic ordering and all existing eligibility exclusions. Use stable source-relative ordering and a documented tie-breaker for mixed formats after priority; do not arbitrarily prefer every Book over higher-priority legacy work.
-   Keep task-owned status/artifacts/commits in the same scoped lifecycle, including [separate check commits](2026-10-0040-ptbk-coder-separate-check-commits.md) once available. No format may bypass verification, interrupted-task recovery, dirty-tree handling or authorization.

## Migration command and preservation

-   Register `ptbk coder migrate` in the existing CLI and installed-package entrypoints. Required direction is legacy Markdown prompts to task Books. Bidirectional conversion is not required; this command is also unrelated to the existing database `--auto-migrate` feature.
-   Reuse shared `--path`, `--tasks`, Git preflight, scoped commits and noninteractive behavior. Migration is deterministic local conversion: no model, harness installation, implementation run, check execution, server launch, network request or database migration.
-   `--dry-run` parses and validates inputs and reports the planned source-to-destination mapping, preserved statuses and conflicts without creating directories, temporary artifacts, IDs in source files, commits or any other repository changes. Compute proposed deterministic identities in memory only.
-   Convert actual task sections using the legacy parser, including supported tasks without an explicit checkbox. For a file with several sections, create one `.book` task per section with deterministic collision-safe names and all shared context that section actually needs. Do not turn separators, README files, ignored documents or templates into tasks.
-   Preserve the implementation payload, title, emoji/commit identification, status, priority, runner alternatives, not-before instant under the same timezone context, notes and available attribution/history. Preserve effective relative links, image references, attachments and agent references when their containing directory changes; no naive global string replacement inside code or URLs.
-   Never turn an unfinished or excluded source into runnable work. Preserve its disabled/incomplete reason, and keep a genuinely in-progress task blocked for explicit recovery instead of resetting it to todo. Report any construct that cannot be represented losslessly and leave its source active and unchanged.
-   Use deterministic destination names and IDs plus migration-origin metadata/checksums. Re-running migration skips an unchanged completed conversion and creates no duplicate tasks or commits. A modified source, modified destination or identity collision requires an explicit diagnostic/reconciliation rather than overwrite.
-   Preserve the original bytes in a non-runnable archive or the established equivalent recoverable representation. Only retire a source from the active legacy queue after all of that file's sections have been written and reread successfully with equivalent normalized meaning. Keep referenced assets available rather than deleting the whole prompts directory.
-   A conversion must never leave both the original task and its migrated copy independently runnable, including after a crash. Use shared source identity/ownership and a recoverable migration transaction/journal; runtime and migration must agree which representation is authoritative. Conflicting copies are blocked visibly, not silently executed twice.
-   Validate before writing; stage each conversion unit safely and recover or roll back only its own writes if interrupted. Do not overwrite user edits during recovery. Coordinate with the same workspace mutation/claim lock as task execution and refuse migration of a live claimed task.
-   By default, persist a successful migration through one scoped local migration commit containing only its conversion/archive/essential metadata changes; respect `--no-commit` and other shared commit constraints. Push is not implicit. Report converted, skipped, blocked and failed items plus whether changes were saved, committed or left for review.
-   Do not auto-migrate this repository's entire existing backlog merely to demonstrate implementation. Test with temporary fixture projects; keep unrelated PRDs and completed archives unchanged.

## Authoring, documentation and compatibility

-   Prefer task Books for newly initialized projects and generated task templates. Preserve existing customized scripts/templates and legacy-only workflows; do not silently rewrite their configuration. An explicit task-directory override must appear in generated runnable commands where needed.
-   Update `coder add`, planning output, check-repair task creation and relevant queue utilities to use the shared authoring/source policy rather than new hardcoded paths. Preserve the PRD-only permissions of planning: changing the output format must not grant permission to implement application code.
-   Keep metadata/source inspection and dry-run usable without an installed harness. Add task-aware syntax/documentation support through existing shared Book tooling where relevant; do not require building a new editor application.
-   Preserve installed CLI behavior outside this monorepo, default agent Books, `--context`, TEAM resolution and existing agent imports. Compatibility with an older Coder that cannot read task Books must be explained; do not claim the migration is transparent to old binaries.

## Acceptance criteria

-   Equivalent Markdown and task-Book fixtures normalize to equivalent execution requests, eligibility and lifecycle outcomes. A mixed queue executes each eligible task once through the same mocked runner/check services.
-   Cover all statuses, priority, legacy any-of runner tokens, explicit typed routing, date-plus-model combinations, notes/history, absent status lines and multi-section files. Completed/incomplete/ignored inputs never become runnable by accident.
-   Round-trip the task Book example and migrated literal bodies, including embedded code fences, uppercase commitment-like lines, non-ASCII text and links/assets. Updating status preserves scheduling, notes and task identity.
-   Default and custom task directories work across run/list/dry-run/server, init/authoring, migration and isolation. Test relative/absolute paths, nested projects, spaces, missing paths and symlink escapes. An override never falls back silently to the default tasks directory.
-   Migration is idempotent, lossless under the normalized model and duplicate-safe. Test destination collisions, changed sources/destinations, crashes between write/retirement/commit, multi-section partial failure and a competing live worker. Original content remains recoverable.
-   Verify dry-run has zero side effects and that migration does not run a task, contact a model or perform database migrations. Git fixtures prove scoped commits and preservation of unrelated staged/unstaged work, including rejected commits.
-   Regression-test existing agent Books and legacy-only Coder workflows, and run an installed-package smoke test outside this repository. Use deterministic local fixtures and mocks rather than paid model calls.

## Context and related work

-   Inspect [legacy source loading](../scripts/run-codex-prompts/prompts/loadPromptFiles.ts), [Markdown section parsing](../scripts/run-codex-prompts/prompts/parsePromptFile.ts), [runner matching](../scripts/run-codex-prompts/prompts/isPromptCompatibleWithRunner.ts), [queue orchestration](../scripts/run-codex-prompts/main/runCodexPrompts.ts), and [round execution](../scripts/run-codex-prompts/main/runPromptRound.ts).
-   Inspect [Book parsing](../src/book-2.0/agent-source/parseAgentSourceWithCommitments.ts), [lightweight agent parsing](../src/book-2.0/agent-source/parseAgentSource.ts), [commitment registry](../src/commitments/index.ts), and the existing [Developer Book](../agents/coding/developer.book). Reuse syntax infrastructure without conflating task and agent compilation.
-   Follow [shared project/context selection](2026-09-0500-ptbk-cli-default-agent-path-and-context.md) and [generated workflow instructions](2026-09-0460-ptbk-coder-init-prompts-readme.md). Integrate with the current server; the [planned unified server](2026-09-0490-ptbk-server-unified-workspace-agent-server.md) is not a prerequisite.
-   Keep the implementation DRY with small, separately testable modules. Update CLI help, [Coder documentation](../scripts/run-codex-prompts/README.md), Book language documentation, relevant [Coder website](../apps/coder-landing) examples and the [changelog](../changelog/_current-preversion.md) when implemented.
