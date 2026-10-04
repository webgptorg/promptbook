[^] (2 attempts) by Promptbook Developer on OpenAI Codex `gpt-5.6-luna` thinking `max` - Implementation ~$2.48 3 hours; Testing a few seconds; Fixing in progress

[✨✅] Rename Coder's aggregate verification concept from test to check, including CLI flags, repair feedback, and the initialized package.json script.

```bash
ptbk coder run --harness openai-codex --check "npm run check" --check-before yes-and-fix
ptbk coder run --harness openai-codex --check "npm run lint && npm run build && npm test"
```

-   A check is the umbrella for project validation: unit/integration tests, linting, type checks, builds, generated-code consistency, and other project-owned quality checks. Tests remain one kind of check.
-   Change the CLI vocabulary and the shared CLI execution plumbing, not merely two help strings. Do not redesign the Agent Server UI, replace the project's testing framework, or invent another execution engine.
-   The canonical flags are `--check` and `--check-before`. The canonical project script is exactly lowercase `check`, invoked as `npm run check`, not a Promptbook-specific script name.

## CLI contract and execution behavior

-   Replace `--test <test-command...>` with `--check <check-command...>` everywhere that option means the aggregate project verification command, including the finite Coder runner and applicable server CLI registration.
-   Replace `--test-before <mode>` with `--check-before <mode>` wherever pre-coding verification is currently supported. Do not add a second independent preflight implementation for the new spelling.
-   Preserve the existing mode values and timing: `no` does not perform the initial check; `yes-and-fail` checks before coding and stops on failure; `yes-and-fix` checks first and repairs failures through the shared repair-PRD flow before normal queued work proceeds.
-   Preserve the current default preflight mode `no`. Renaming verification must not silently turn every invocation into a preflight repair run. The initialized `coder:run` script may continue to explicitly select `yes-and-fix` as it currently does.
-   When a verification phase is enabled but no command is supplied, use the canonical project command `npm run check` instead of the current `npm test` fallback. The same default must be reusable by the forthcoming `coder fix` command. Do not silently fall back to tests alone when the aggregate check script is missing or fails.
-   Preserve the existing opt-in behavior of post-prompt verification when neither a check command nor a preflight mode enables it. Distinguish selecting the default command from enabling additional execution phases.
-   `--check` selects the command used by the existing post-prompt feedback/retry stage and, when enabled, the initial check. Initial and repair verification must not accidentally use different commands.
-   Preserve a command's argument boundaries, quoted spaces, embedded flags, and intentional shell composition. Keep the existing command-execution/quoting behavior shared; do not introduce a second shell parser or treat command tokens as Coder options.
-   A check's actual process result determines success. Nonzero exits, spawn failures, signals, and cancellation are not success just because output contains a success-looking phrase or because an agent says it is fixed. Do not discard useful stdout/stderr from lint/build tools.
-   Old `--test` and `--test-before` spellings must no longer remain active alternative interfaces for aggregate verification. Reject them with an actionable migration diagnostic naming the replacement; never silently ignore them or accept both spellings with ambiguous precedence.
-   Update all active CLI entrypoints and relevant direct-script argument parsers, option types, normalization, validation, and forwarding. A renamed Commander flag with a downstream parser still expecting `testCommand` or `testBefore` is incomplete.

## One canonical initialized script: check

-   At the inspected baseline, initialization creates `test-for-ptbk-coder`, whose default body is `npm test`. The spoken description referred to a Promptbook-specific check script; remove this actual generated legacy name rather than creating `check-for-ptbk-coder` as an intermediate replacement.
-   Fresh `ptbk coder init`, and top-level `ptbk init` through its shared initializer, must create or reuse `package.json`'s `scripts.check`. Do not generate `test-for-ptbk-coder`, `check-for-ptbk-coder`, or a compatibility alias for either name.
-   The script belongs to the project. Preserve an existing `scripts.check` exactly, including custom commands and its chosen validation scope. The CLI executes the configured command; it must not secretly append another set of checks behind the script owner's back.
-   For a fresh project without `check`, use applicable existing validation scripts to create a useful aggregate: tests, lint, typechecking, and build where those commands are present and appropriate. Keep the generation deterministic and inspect conventional script bodies before composing them; do not guess arbitrary executables or add a new toolchain merely to populate the script.
-   Do not recursively include `check` itself, `coder:run`, `coder:fix`, or scripts that lead back into them. Do not include watch/dev-server, deployment, publish, installation, or destructive reset commands as validation by matching a loose name substring.
-   Do not claim that every validation category was checked when the project only supplies some of them. Explain the generated composition in the initialization summary. If no usable validation command exists, create a clearly failing setup placeholder with instructions for configuring `check`, not a no-op, `--if-present`, or an unconditional success command.
-   Missing or unconfigured validation is a setup problem, not proof of a healthy project. Report it clearly and avoid an automatic repair loop whose only possible action is to replace the placeholder with a meaningless green result.
-   Newly generated `coder:run` must refer to `--check "npm run check" --check-before yes-and-fix`; reconcile omission of redundant agent/path/context arguments with [shared CLI defaults](2026-09-0500-ptbk-cli-default-agent-path-and-context.md).

## Existing projects and migration

-   Inspect the current package-script merge behavior before adding migration. Initialization is currently non-destructive; a vocabulary change is not authorization to overwrite arbitrary user-owned scripts.
-   Safely migrate recognized unchanged generated scripts and their references to `check` and the new flags. Remove an obsolete generated verification entry only after preserving its command body where needed and confirming it no longer has active callers.
-   When a project only has a customized legacy verification script, preserve its substantive validation command when migrating to `check`; do not replace a composite lint/build/test pipeline with the former `npm test` default.
-   When an existing `check` conflicts with a legacy/custom script or a custom caller cannot be rewritten confidently, keep the user's data intact and report precise migration instructions. Do not silently delete the custom entry, rewrite unknown shell expressions, or introduce a permanent generated compatibility alias to hide the conflict.
-   Update matching generated scripts idempotently. A second initialization must not append repeated checks, reintroduce legacy entries, or replace the project's current `check` definition.
-   Ensure dependent generated artifacts and the packaged initializer use the same maintained definitions. Repairing only this monorepo's package.json is not the feature.

## Terminology throughout the shared CLI workflow

-   Rename aggregate-verification fields, helpers, constants, mode types, generated repair descriptions, and user-facing CLI messages to check terminology where appropriate. Cover initial checks, post-prompt feedback, retries, traces, status output, errors, and commit descriptions for changes produced by check commands.
-   Extend repair instructions to fix the underlying lint/type/build/test failure without weakening validation. Do not delete assertions, disable lint rules, remove failing checks from the aggregate, lower quality thresholds, skip a build, or force exit code zero merely to obtain a pass.
-   Keep the existing shared command runner, output limiting, feedback/retry policies, artifact cleanup, scoped commits, pause/stop controls, and credit/harness behavior. Checks may themselves modify files; preserve and accurately report their scoped changes rather than assuming that every check is read-only.
-   Keep historical traces and task attribution readable when internal aggregate-step names change. Handle necessary legacy record decoding at one boundary rather than maintaining two live verification implementations.
-   Do not mechanically replace every occurrence of the word test. Actual unit/integration tests, `.test.ts` files, Jest configuration, `npm test` as a real leaf script, test fixtures, and unrelated testing-server concepts keep their proper names.
-   Do not rename the separate `coder verify` workflow for auditing completed PRDs or revive a deprecated top-level pipeline test command. This task changes the aggregate check option, not every command that performs some form of validation.

## Acceptance criteria

-   Both command registration and lower-level parsing accept the new flags, forward the same normalized command/mode, and give migration errors for old flags. Tests cover quoted commands, embedded flags, shell composition, empty/invalid option values, and incompatible options.
-   Fixtures with a `check` script combining lint, typechecking, build, and tests demonstrate that a failure in any selected stage fails verification and is present in repair feedback. A green unit-test result must not conceal a failed build or lint stage.
-   All three preflight modes retain their timing and failure/repair semantics. Default mode remains `no`; enabled verification without an explicit command resolves `npm run check`. Missing or unconfigured scripts never produce a false successful check.
-   Fresh init generates only the canonical check entry and updated caller. Repeated init is idempotent. Fixtures cover a pre-existing custom `check`, the old generated default, a custom legacy aggregate, conflicting entries, other callers, and recursion-prone script bodies without losing user configuration.
-   Tests verify that repair instructions refer to checks broadly and explicitly forbid weakening them. Existing retry, commit-scope, cancellation, and finite-run regressions remain covered after renaming.
-   CLI help, generated workflow README, active examples, and package templates use the new vocabulary. Do not rewrite completed PRD history or historical changelog entries merely to remove old words.
-   Run the relevant unit/CLI tests and type checks, and smoke-test initialization and a deterministic failing/passing check from the installed CLI outside this monorepo. No paid model call is needed.

## Context and related work

-   Inspect [run flags](../src/cli/cli-commands/coder/run.ts), [server flags](../src/cli/cli-commands/coder/server.ts), [RunOptions](../scripts/run-codex-prompts/cli/RunOptions.ts), [direct argument parsing](../scripts/run-codex-prompts/cli/parseRunOptions.ts), and [generated package scripts](../src/cli/cli-commands/coder/getDefaultCoderPackageJsonScripts.ts).
-   Trace [the current mode/default definitions](../scripts/run-codex-prompts/testing/TestBeforeMode.ts), [initial verification](../scripts/run-codex-prompts/testing/runTestBefore.ts), [repair PRD creation](../scripts/run-codex-prompts/testing/createTestBeforeRepairPrompt.ts), [the main runner](../scripts/run-codex-prompts/main/runCodexPrompts.ts), and [single-round execution](../scripts/run-codex-prompts/main/runPromptRound.ts). These links describe the pre-rename locations; follow their renamed shared equivalents during implementation.
-   Coordinate with [Git preflight/init](2026-09-0480-ptbk-coder-git-repository-preflight.md), [CLI defaults](2026-09-0500-ptbk-cli-default-agent-path-and-context.md), and [repair-only fix](2026-09-0520-ptbk-coder-fix-checks-only.md). The fix command must reuse this check contract rather than introducing a separate test/check option family.
-   Keep in mind the DRY _(don't repeat yourself)_ principle. Update relevant [Coder CLI documentation](../apps/coder-landing) and add the implemented changes and migration guidance to the [changelog](../changelog/_current-preversion.md).
