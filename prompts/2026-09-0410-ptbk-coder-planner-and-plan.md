[ ]

[✨🪷] Add a project-owned Planner agent and an interactive `ptbk coder plan` command.

```bash
ptbk coder init
ptbk coder plan --harness openai-codex
ptbk coder plan --harness openai-codex --agent agents/planner.book
```

-   Add `plan` to the existing `ptbk coder` command group. The command name is `ptbk coder plan`, not a new top-level `ptbk plan`, `grill`, or `great` command.
-   This is one complete feature: initialize the Planner's editable Book source in the target repository and provide the CLI conversation that uses it to author PRDs.
-   Planner is a planning specialist, not an implementation agent. Developer implements changes; Planner discusses and specifies them. Both must inherit from Adam through the existing Book inheritance mechanism.

## Initialize the Planner

-   Add a bundled `agents/default/planner.book` and initialize it as `agents/planner.book` in the target project, alongside `agents/developer.book` and `agents/.core/adam.book`.
-   Keep shared Adam instructions in the shared core Book. Do not copy Adam's full instructions into each role or make Planner inherit Developer's implementation-specific goal.
-   Verify the effective inheritance of both Developer and Planner, including the current implicit Adam inheritance, rather than introducing a second incompatible inheritance convention.
-   Make initialization work in empty, already initialized, and partially initialized repositories. Ensure missing role Books are created even when package scripts already exist; preserve existing project-owned Books, scripts, settings, and context files.
-   Include Planner in the same packaging and bundled-asset resolution as Developer. Initialization must work from the published CLI package, not only from a checkout of this monorepo.
-   Add a useful `coder:plan` script when absent and report created versus unchanged artifacts in the existing initialization summary. Do not overwrite an existing script.

## Interactive planning

-   Start a multi-turn conversation in the current project. Preserve the discussion context across turns so the user can explain a feature, answer questions, change a decision, and discuss another feature in the same session.
-   Let Planner read the repository, relevant documentation, existing PRDs, and read-only Git information before proposing requirements. Repository context should improve the specification, not trigger implementation.
-   Planner should identify the user's goal, expected behavior, scope boundaries, important edge cases, acceptance criteria, and dependencies. Ask useful clarification questions when needed without repeatedly asking for information already supplied.
-   Support creating one or several PRD Markdown files, revising existing PRDs, and splitting a larger request into related tasks. Do not force every conversation into exactly one file or overwrite an existing PRD merely because a new topic has a similar name.
-   Follow the target repository's existing PRD style and templates. Reuse the existing filename numbering, emoji-tag, priority, and prompt-section utilities instead of implementing another authoring format.
-   Save agreed, implementation-ready tasks as pending prompts. Keep unresolved drafts out of the runnable queue using an actually supported not-ready marker; do not invent status syntax.
-   Preserve existing task identity, metadata, and unrelated sections when editing a PRD. Do not mark a task implemented or silently reopen completed work; represent genuinely new follow-up work as a new task unless the user explicitly requests otherwise.
-   Make created and edited paths and the resulting changes visible to the user, and allow further revisions in the conversation. Do not write a new ready-to-run PRD after every casual message without an authoring decision.
-   Handle cancellation, EOF, harness failures, and non-interactive input without hanging or leaving half-written PRDs. An interactive-only invocation without a suitable terminal must explain the requirement rather than wait indefinitely.

## Planning-only boundary

-   The planning session may author PRD Markdown files in the project's prompts directory. It must not edit application source, tests, package manifests, lockfiles, deployment configuration, agent Books, or other implementation artifacts.
-   Enforce this as an execution/tool boundary, not just a sentence in Planner's prompt. An explicit custom `--agent`, a shell command, a symlink, or a delegated teammate must not turn `plan` into an implementation command.
-   Read-only inspection is allowed. Installing dependencies, running mutating build scripts, launching the implementation queue, and making application changes are not part of planning.
-   Prepare required agent Books through `ptbk coder init`, not by silently modifying them during a planning conversation. Keep any necessary local session artifacts in existing ignored runtime locations, outside the PRD queue.
-   Reuse the existing authoring-command Git-sync opt-ins where applicable. A requested planning commit must contain only PRDs changed by that session, not unrelated user changes. Do not implicitly push or start `coder run` when the discussion ends.
-   Keep `ptbk coder add` as the lightweight description-to-prompt command. Its optional interactive description entry is not a substitute for a repository-aware, multi-turn planning session.

## Acceptance criteria

-   A fresh initialization creates a usable local Planner; repeating initialization preserves customized Books and scripts.
-   One conversation can discuss two features, revise the first, and save multiple correctly numbered PRDs using the repository's conventions.
-   Existing PRDs can be inspected and edited without losing unrelated content or lifecycle metadata.
-   Fixture-based conversation tests verify that only the expected PRD Markdown files change. Attempts to modify source directly, through a custom agent, or through delegation are rejected before the write.
-   Cancellation and a failed harness do not corrupt a saved PRD or cause implementation to begin.
-   Test the feature through the packaged CLI as well as repository-local entrypoints, using mocked harnesses for deterministic tests.

## Context and related work

-   Command-dependent default agents and explicit overrides are specified in [the default-agent PRD](2026-09-0420-ptbk-coder-default-agents.md). Coordinate shared resolution with that task; the default planning role is Planner.
-   Default Lawyer and Copywriter Books and their TEAM declarations are specified in [the helper-agent PRD](2026-09-0430-ptbk-coder-helper-agents-init.md); actual teammate invocation is specified in [the TEAM runtime PRD](2026-09-0440-ptbk-coder-team-runtime.md).
-   Start with [coder commands](../src/cli/cli-commands/coder), [project initialization](../src/cli/cli-commands/coder/initializeCoderProjectConfiguration.ts), [Developer initialization](../src/cli/cli-commands/coder/ensureCoderDeveloperAgentFile.ts), [Adam initialization](../src/cli/cli-commands/common/ensureAdamAgentBook.ts), and [prompt authoring](../src/cli/cli-commands/coder/add.ts).
-   Keep in mind the DRY _(don't repeat yourself)_ principle. Analyze the existing agent resolver, harness abstractions, prompt authoring, and Git-sync behavior before implementing.
-   Update CLI help, relevant developer scripts in [terminals.json](../.vscode/terminals.json), and the [Coder landing website](../apps/coder-landing) where the new planning workflow is documented.
-   Add the changes into the [changelog](../changelog/_current-preversion.md).
