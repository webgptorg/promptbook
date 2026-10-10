# User and CLI contracts

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

## Commands

- `ptbk coder init` / `initialize`: Idempotently add missing project files and explain configuration. Preserve the current top-level init aliases as well.
- `ptbk coder add`: Create a task from input/a template; the current command does not call a model. New projects prefer task Books.
- `ptbk coder generate-boilerplates`: Generate unfinished templates that are not automatically runnable.
- `ptbk coder plan`: Discuss the project and propose tasks; write only approved PRD/task files.
- `ptbk coder list`: Show the queue, filters and reasons for ineligibility without a model or writes. Without `--agent`, do not filter to Developer.
- `ptbk coder run`: Run currently eligible work finitely; do not wait indefinitely for future tasks.
- `ptbk coder fix`: Run checks and, only if they fail, create and execute one repair task.
- `ptbk coder verify`: Interactive human review of completed results, optional follow-up and archiving. Does not run checks.
- `ptbk coder server`: A persistent queue and local web overview over the same engine.
- `ptbk coder migrate`: A new deterministic conversion of Markdown tasks to task Books. No model call.
- `find-unwritten`, `find-refactor-candidates`, `find-fresh-emoji-tags`, `ping`: Preserve useful authoring/diagnostic tools as separate commands, outside the task loop.

A command must not silently ignore an unsupported flag. The old `--test` and `--test-before` flags must exit with instructions to use `--check` and `--check-before`. `--priority` remains an alias for the lower priority bound.

## First use and a typical run

```bash
ptbk coder init --path ./project
ptbk coder list --path ./project
ptbk coder run --path ./project --harness openai-codex --dry-run
ptbk coder run --path ./project --harness openai-codex \
  --check "npm run check" --check-before yes-and-fix
```

These examples describe the target coder; examples using `--tasks`, `migrate`, `TASK`, `AFTER` and `REPEAT` do not assert availability in the analyzed package.

## Configuration and precedence

- `--path` selects the project; without it, use the working directory captured when the command starts. Resolve relative paths from the invocation directory.
- Explicit CLI values take precedence over existing supported configuration. Typed task requirements apply before implicit defaults but must not override an explicit user choice.
- `--harness` selects the tool, `--model` the model and `--thinking-level` the reasoning intensity. `--agent` selects an agent Book; these concepts are not interchangeable.
- For `run`, `fix`, `plan` and the current `server`, the default is `agents/developer.book`. An explicit Planner remains supported. A missing default must give instructions for `init`; an invalid explicit path must fail without fallback.
    - See the [`.book` format specification](../book-language.md).
- Without `--context`, load the project's `AGENTS.md`. Report a missing implicit file only once; an existing unreadable file is an error. Explicit text/a file replaces the default. `--context ""` disables additional context.
- Preserve `PTBK_HARNESS`, `PTBK_MODEL` and `PTBK_THINKING_LEVEL`; an explicit CLI value always wins. Current non-dry run/server/plan/fix requires a selected harness; `fix` defers installation and Book preparation until a repair is needed. In the target Book mode, a typed task requirement may supply a missing invocation harness only if that provider is configured. Otherwise the task remains blocked. Do not introduce a hidden general layer of environment overrides.
- Read-only commands must not implicitly initialize Books, install a harness, compile remote inheritance, contact a model or change Git.

## Preserved run options

- `--min-priority`, `--max-priority`: Inclusive nonnegative integer bounds. A conflict with `--priority` or a minimum greater than the maximum is an error.
- `--limit`: The maximum number of successfully completed tasks/occurrences. Failure alone does not consume the limit.
- `--git-changes fail/ignore/continue`: Defaults to `fail`; see [Git persistence](git-persistence.md).
- `--no-commit`: No automatic commits; automatic mode requires `--git-changes ignore`. Preserve the option to save work manually in interactive `--no-auto` mode.
- `--no-auto`: Interactive confirmation before a task and at the commit step; automatic continuation is the default. Cannot be combined with `--no-questions`.
- `--auto-pull`, `--auto-push`: Explicit opt-in; disabled by default.
- `--check`, `--check-before`: The validation contract in the [checks specification](checks.md).
- `--isolate`: A separate worktree for one task; the base run remains sequential.
- `--no-normalize-line-endings`: Disable standard CRLF-to-LF normalization of changed text files.
- `--no-ui`, `--preserve-logs`, `--no-questions`: Plain output, retained diagnostics and noninteractive mode.
- `--allow-credits`: Explicit opt-in to OpenAI Codex credit usage.
- `--wait-between-prompts`: Minimum time between the starts of two tasks, default 0; execution time counts toward it.
- `--wait-after-prompt`: Wait after completing a task, default 0.
- `--wait-after-error`: Cooldown before a technical retry, default 10 minutes. Accept documented duration forms such as `30m`, `5s`, `1h30m`.
- `--auto-migrate`: Existing test-server migration integration; a separate optional adapter. It is not `coder migrate`.

Exact provider defaults must live in one updatable registry, and help must match runtime behavior. Do not treat model names from historical PRD examples as a permanent product contract.

Supported thinking values are `low`, `medium`, `high`, `xhigh`, `max`; the selected adapter must state whether it uses them. The current Codex fallback is `xhigh`; the generated `coder:run` explicitly sets `max`. The new implementation must not silently accept unsupported effort and claim it took effect.

Validate combinations before the first mutation: `--auto-pull` with `--no-commit` is prohibited outside read-only preview; `--isolate` disallows both `--no-commit` and `continue`; `continue` disallows `--check-before yes-and-fix`. `--allow-destructive-auto-migrate` requires `--auto-migrate`.

Unlike run, authoring utilities (`init`, `add`, `generate-boilerplates`, `plan`) default to commits being disabled and use explicit `--commit`; push requires a commit. `add [description]` accepts an argument, stdin or interactive input and preserves `--template`/priority. Boilerplates preserve `--count` in `N` and `N*M` forms (default `5*1`). `verify` preserves review order and a repeatable ignore filter. `ping` is a real small model call, optionally repeated with `--period`; it is not a read-only offline inspection.

## Related specifications

- [Project paths and task sources](workspace.md)
- [Project initialization](initialization.md)
- [Project checks and repairs](checks.md)
- [Read-only planning](planning.md)
- [Compatibility and deliberate changes](compatibility.md)
