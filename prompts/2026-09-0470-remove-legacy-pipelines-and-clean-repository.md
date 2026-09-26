[ ]

[✨🪻] Remove the legacy pipeline system and obsolete repository/dependency baggage while preserving the active Promptbook products.

-   Perform one comprehensive cleanup, including deletion of obsolete code and assets, removal of unused dependencies, simplification of drivers/adapters, and repair of build, package-generation, CLI, and documentation references.
-   The old pipeline-oriented system is intentionally being retired without backward compatibility. Do not retain its commands, public exports, compatibility wrappers, or dependencies merely so historical consumers keep working.
-   This is not permission to break or remove the active Coder, Agents Server, or Utilities functionality. First establish what the retained products actually use, then remove the legacy paths completely.

## Products and functionality to preserve

-   Keep the `ptbk` utility and its active commands, especially Promptbook Coder and its complete supported workflow. Remove the old pipeline-related commands from that CLI rather than deleting the CLI itself.
-   Preserve Coder initialization, authoring, execution, verification, harness integrations, Git behavior, agent Books, and supported operational controls. Preserve planning, role defaults, TEAM, and output/documentation work from related PRDs wherever those features have landed.
-   Keep [Promptbook Agents Server](../apps/agents-server) and [Promptbook Utilities](../apps/utils), including their actual web/API behavior, deployment paths, and dependencies.
-   Keep the [Coder landing website](../apps/coder-landing) as the active Coder's website/documentation and update it to reflect the retained product surface.
-   Preserve the modern Book agent language, parsing, inheritance/imports, commitments such as TEAM, and runtime capabilities that the retained products need. Old pipeline Books and current agent `.book` files are not the same system.
-   Preserve required shared code and assets even when they currently live outside these product directories. Move or extract the minimal current implementation when that allows a legacy subsystem to be deleted.
-   Other apps, experiments, examples, packages, and tools are not automatically protected just because they exist. Remove those outside the retained product boundary after checking direct and indirect consumers; document why any remaining support component is necessary.

## Inventory before deletion

-   Map each retained product's source entrypoints, CLI commands, package exports, static/runtime assets, dynamic imports, generators, tests, build steps, and deployment dependencies.
-   Classify candidate directories, modules, adapters, dependencies, and scripts as keep, migrate/extract, or remove. Include the reason and retained consumer for every non-obvious survivor.
-   Inspect both the root and app/package manifests and lockfiles. Include transitive dependency chains and generated package declarations, not only imports visible to a simple unused-code search.
-   Capture the existing install warnings, dependency graph, package contents, and relevant test/build results on the repository's supported environment before changing them. Distinguish pre-existing failures from cleanup regressions.
-   Produce a concrete removal/migration checklist as part of the implementation notes. This analysis is a starting point for completing the cleanup, not a substitute for actually deleting the obsolete system.

## Remove the legacy pipeline surface

-   Remove legacy pipeline-only execution, preparation, compilation, schemas/types, collections, provider selection, CLI handlers/options, generated exports, examples, fixtures, documentation, and generation scripts where they have no retained use.
-   Remove old pipeline command registrations and related help text from `ptbk`. An intentionally removed command should no longer be advertised or routed through a deprecated compatibility handler.
-   Remove obsolete LLM provider implementations, SDK dependencies, driver layers, and re-export barrels that exist only for the old system.
-   Do not delete all of `src/llm-providers` or every provider SDK by name without checking consumers. Modern agent/remote-agent code and TEAM still use parts of that area. Preserve or modernize the required implementation, then remove the obsolete layer beneath it.
-   Likewise, separate shared prompt/result/tool types or utilities from pipeline-only machinery. A current product using one shared type is a reason to extract that type, not to keep the entire retired engine indefinitely.
-   Remove dead branches, outdated fallback paths, unused configuration/environment examples, abandoned scripts, and obsolete generated files tied to the retired surface.
-   Remove legacy-only tests and fixtures together with their functionality. Do not remove active-product assertions or disable tests merely to make the cleanup pass.
-   Delete obsolete code instead of moving it into a new legacy/archive runtime directory or leaving commented-out implementations. Git history already preserves deleted source.

## Dependencies, drivers, and packaging

-   Remove no-longer-needed direct dependencies and their obsolete transitive chains from all affected manifests and lockfiles.
-   Where a retained feature still depends on an outdated driver or library, migrate that feature to the current retained abstraction or a suitable maintained replacement, with focused regression tests. Do not replace working functionality with a stub.
-   Analyze installation warnings at their actual source, using the appropriate package-manager dependency explanation. Eliminate warnings caused by removable legacy dependencies and fix retained direct dependencies where feasible.
-   Do not hide warnings through log settings, blanket overrides, forced audit fixes, or skipped lifecycle scripts. Do not claim a warning-free installation when a documented third-party limitation remains.
-   Update generators and their sources of truth before regenerating packages, exports, documentation, or other generated outputs. Editing only generated files is not a completed cleanup.
-   Keep published CLI packaging, bundled Books/templates, executable entrypoints, and active shared package exports usable from an installed tarball outside this repository.
-   Review root/app build scripts, Rollup/package-generation configuration, TypeScript/Jest configuration, CI workflows, Docker files, and installation/deployment scripts for references to deleted paths.
-   Regenerate affected lockfiles with the repository's package manager. A clean installation must be reproducible; do not hand-edit lockfile fragments or rely on stale local `node_modules`.
-   Document intentional breaking removals and any necessary supported-environment changes. Do not combine this task with unrelated framework upgrades or a redesign of the retained applications.

## Protect retained products and user data

-   Keep retained public behavior stable except for the expressly requested legacy removals and separately specified features. Cleanup must not silently change active CLI flags, authentication, access control, billing, data handling, or task execution semantics.
-   Preserve Agents Server data, migrations needed for existing installations, secrets handling, and security protections. Removing legacy code is not authorization to reset databases or delete deployed user data.
-   Preserve the current PRD backlog, including this task and its related feature specifications. Do not solve stale references by deleting still-relevant requirements.
-   Keep licenses, attribution, and security documentation required by retained code. Update misleading product documentation and links without inventing capabilities.
-   Do not rewrite Git history, remove published tags, force-push, or publish/deploy breaking releases as an implicit part of repository cleanup.

## Acceptance criteria and verification

-   The removed pipeline system is absent from active source, CLI registration/help, generated/public exports, package manifests, shipped artifacts, build steps, and active documentation. No compatibility shim keeps it alive.
-   Every retained dependency and supporting component has an identifiable current consumer; the implementation report explains non-obvious retained legacy-looking modules.
-   Fresh installs at the root and relevant app/package boundaries succeed using the committed lockfiles. Compare warning output before and after and explain any unavoidable remaining warning with its actual dependency chain.
-   Run relevant type checks, linting, unit/integration tests, package-generation checks, and retained-app builds. Record exact commands and results; distinguish environmental or pre-existing failures rather than presenting them as successful tests.
-   Smoke-test the packaged `ptbk` CLI in a temporary external project: help, init, authoring/listing, default/explicit Book selection, and a mocked coding run. Verify bundled templates and Books are present. Include planning and TEAM checks once those features are implemented.
-   Smoke-test Agents Server and Utilities, including representative agent creation/chat/tool functionality, essential web/API routes, and deployment/build entrypoints. Exercise shared Book/TEAM capabilities so a seemingly unused provider removal cannot silently break them.
-   Validate generated exports and package contents, and check that clean builds do not recreate deleted legacy files.
-   Supply a before/after summary of removed subsystems, direct dependencies and affected transitive chains, migrated drivers, intentionally removed APIs/commands, install warnings, and verification results. Use measured results, not invented reduction targets.

## Context and related work

-   Inspect [CLI code](../src/cli), [Coder execution](../scripts/run-codex-prompts), [modern Book code](../src/book-2.0), [commitments](../src/commitments), [LLM providers](../src/llm-providers), [apps](../apps), [packages](../packages), [package generation](../scripts/generate-packages), [the root manifest](../package.json), and [build configuration](../rollup.config.js).
-   In particular, the root manifest still contains pipeline-related scripts and a skipped legacy Book-test command. Trace their consumers and generators before removing or replacing them; do not blindly delete all Book-related testing.
-   Coordinate with [Planner/plan](2026-09-0410-ptbk-coder-planner-and-plan.md), [default agents](2026-09-0420-ptbk-coder-default-agents.md), [helper initialization](2026-09-0430-ptbk-coder-helper-agents-init.md), [TEAM runtime](2026-09-0440-ptbk-coder-team-runtime.md), [output presentation](2026-09-0450-ptbk-coder-normal-and-raw-output.md), and [generated README](2026-09-0460-ptbk-coder-init-prompts-readme.md). Preserve their implemented functionality and do not erase their pending specifications.
-   Keep in mind the DRY _(don't repeat yourself)_ principle. Favor a smaller coherent active architecture over retaining obsolete abstraction layers.
-   Update retained product documentation and record the cleanup, intentional compatibility break, and verification summary in the [changelog](../changelog/_current-preversion.md).
