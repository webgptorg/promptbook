[ ]

[✨🪺] Resolve a default Book agent for each Coder action while keeping `--agent` optional and overridable.

```bash
ptbk coder run --harness openai-codex
ptbk coder plan --harness openai-codex
ptbk coder run --harness openai-codex --agent agents/my-developer.book
ptbk coder plan --harness openai-codex --agent agents/my-planner.book
```

-   `--agent` selects the Book agent whose persona, instructions, inheritance, team, identity, and applicable prompt routing are used for the action. It is not the model or the underlying coding harness.
-   Without `--agent`, `ptbk coder run` must use the project's Developer, normally `agents/developer.book`.
-   Without `--agent`, `ptbk coder plan` must use the project's Planner, normally `agents/planner.book`.
-   An explicitly supplied `--agent` must override the command's default. Users can choose a different Book for either action without changing the default files or generated scripts.

## Resolution and command consistency

-   The current Commander option is already syntactically optional, and the current resolver returns no Book when the option is omitted. The required change is effective default-role resolution, not merely removing a required-option declaration.
-   Keep Book selection distinct from `--harness`, `--model`, thinking level, and internal fields that historically use the word agent for a harness. Do not change harness selection or its validation as a side effect.
-   Resolve the selected project-owned Book through the existing shared Book resolver. Apply its inherited Adam instructions, imports, TEAM declarations, display identity, and prompt-routing aliases consistently with an explicitly selected Book.
-   Read the actual local Book rather than substituting an immutable bundled persona at execution time. A user's modification of the initialized Developer or Planner must affect the next corresponding invocation.
-   An explicitly provided missing, unreadable, or invalid Book must produce an actionable error. Do not silently fall back to the default agent after an explicit selection fails.
-   When the default Book is missing, explain which path is required and direct the user to `ptbk coder init`. Do not silently run without a persona, choose the other role, or overwrite/create project configuration during execution.
-   Keep path handling portable, including relative and absolute paths and paths containing spaces. Preserve existing supported reference behavior; do not introduce an unrelated agent lookup scheme in this task.
-   Review every active CLI command that already exposes the Book `--agent` option. Share explicit override handling and document any command-specific default rather than duplicating slightly different implementations.
-   Distinguish executing an action from filtering a list. Commands such as `coder list` must not unexpectedly hide tasks by acquiring a Developer filter when the user omitted `--agent`. Preserve intentional all-agent/no-filter behavior for commands without an intrinsic execution role.
-   Keep read-only and dry-run commands read-only. Default resolution must not start a harness, initialize Books, or mutate the repository merely to list or preview tasks.

## Generated configuration and documentation

-   Newly generated `coder:run` and `coder:plan` scripts should be able to rely on their role defaults instead of requiring redundant `--agent` arguments.
-   Preserve existing project-owned scripts, including explicit custom agent selections. Existing invocations that already pass `--agent` must continue to work.
-   Update help text to identify the default role and explain the difference between Book agent, harness, and model.
-   The planning-only restrictions belong to the command, not the default persona. Selecting Developer or another custom Book for `coder plan` must not permit implementation writes.

## Acceptance criteria

-   Omitting `--agent` in `run` resolves Developer; omitting it in `plan` resolves Planner. Verify effective instructions and identity, not only the displayed filename.
-   Explicit custom Books override both defaults and preserve their inheritance, team, and routing behavior.
-   Tests cover modified local defaults, invalid explicit paths, missing default files, relative/absolute paths, and paths with spaces.
-   Existing explicit-agent commands remain compatible, and no default Book is accidentally used as the harness name.
-   Listing without an agent still lists the intended complete set of tasks; explicit agent filtering still works.
-   Fresh initialization supplies the default Books, while repeated initialization leaves customized scripts unchanged.

## Context and related work

-   The Planner and `plan` command are introduced by [the planning PRD](2026-09-0410-ptbk-coder-planner-and-plan.md). Implement that command before, or together with, its default-role integration; keep one shared resolution policy.
-   Inspect [the shared Coder agent option](../src/cli/cli-commands/coder/agentCliOptions.ts), [Coder agent resolution](../scripts/run-codex-prompts/common/resolveCoderAgent.ts), [run](../src/cli/cli-commands/coder/run.ts), [list](../src/cli/cli-commands/coder/list.ts), and [generated scripts](../src/cli/cli-commands/coder/getDefaultCoderPackageJsonScripts.ts).
-   Keep in mind the DRY _(don't repeat yourself)_ principle. Do a proper analysis of current option normalization and prompt selection before implementing.
-   Update relevant examples, [developer terminal scripts](../.vscode/terminals.json), and the [Coder landing website](../apps/coder-landing) without replacing user-owned configuration during init.
-   Add the changes into the [changelog](../changelog/_current-preversion.md).
