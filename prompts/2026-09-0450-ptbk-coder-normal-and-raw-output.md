[ ]

[✨🪭] Show readable normal output by default and allow switching to raw harness output without changing execution.

```bash
ptbk coder run --harness openai-codex
ptbk coder run --harness openai-codex --output normal
ptbk coder run --harness openai-codex --output raw
```

-   Improve the live output panel of `ptbk coder run` so the running task is understandable and visually pleasant without reading raw harness protocol output.
-   Name the two display modes `Normal output` and `Raw output`. Normal output is the default in the interactive dashboard.
-   This is strictly a CLI presentation change. It must not change what the agent does or how a task is executed.

## Normal output

-   Present an intelligible, conversation-like stream using agent messages and observable events that the current execution already produces.
-   Distinguish actual agent text from runner/tool status. Preserve the agent's natural-language progress messages when available; do not manufacture first-person statements and attribute them to the agent.
-   Visually separate messages, tool/command activity, reported file changes, verification output, results, warnings, and failures. Include compact names, paths, and status where that information is available.
-   Make the current activity and its relationship to the selected task clear inside the existing dashboard. Preserve the existing session, task, errors, progress, and agent visual rather than replacing them with an unrelated interface.
-   Assemble streamed message deltas into readable text, suppress duplicate protocol envelopes, and avoid displaying incomplete JSON fragments as if they were user-facing prose.
-   A status such as running tests or modifying a file must be based on a real event. Do not invent progress percentages, tool calls, completed work, or explanatory reasoning that the harness did not supply.
-   Unknown or unstructured output must have a readable, clearly identified fallback. Do not hide error messages or discard potentially important output simply because it cannot be normalized.

## Switching views

-   Add a visible control labelled `Show raw output` in normal mode and `Show normal output` in raw mode, plus a documented keyboard shortcut that does not collide with existing controls.
-   Allow switching while the same task continues to run, without restarting the harness, resubmitting the prompt, losing buffered context, or duplicating events.
-   Show which mode is active. Keep the selection for the current invocation, including subsequent tasks, without requiring a new persistent settings subsystem.
-   Add `--output normal|raw` for explicit startup selection, validate unknown values, and describe its display-only meaning in CLI help.
-   Raw mode must retain access to the original output currently available from the harness, subject to existing security/redaction behavior. A normal-mode projection must not replace or degrade the original trace/log data.
-   Keep `--no-ui` and redirected/non-TTY output usable for existing logging and scripting workflows. Preserve their current plain-output contract unless the user explicitly requests a different output projection; never emit interactive controls or dashboard redraw sequences into a pipe.

## No execution changes

-   Derive both views from the same already produced output/events. Do not add an LLM summarization call, change the system prompt, ask the agent to narrate more, or change harness invocation flags merely to obtain nicer output.
-   Do not change harness/model selection, thinking level, permissions, tool execution, retries, queue order, pause/stop semantics, tests, migrations, commits, exit status, or success/failure decisions.
-   Keep rendering off the execution-control path so resizing or switching display mode cannot block the task, acknowledge a prompt, or trigger a control action.
-   Use the existing harness output parsers and UI architecture where possible. Preserve original chunks separately from their presentation projection and bound any additional display buffering.
-   Cover all supported harnesses, including Claude Code and OpenAI Codex. Degrade gracefully when a harness exposes less structured information.

## Acceptance criteria

-   The interactive dashboard starts in normal mode, both explicit startup modes work, and the live toggle works repeatedly during a streamed response and across tasks.
-   Recorded/mock streams test fragmented messages, mixed stdout/stderr, commands, errors, unknown records, long lines, Unicode, and large output volumes.
-   Terminal tests cover resizing, narrow windows, scrolling, and existing pause/stop controls without corrupting the frame or input handling.
-   Replaying the same fixture in both modes and while switching produces identical runner actions, tool invocations, model-call counts, task outcomes, and resulting repository changes. Only the rendered display differs.
-   Raw logs/traces remain available and retain the original information. `--no-ui` and redirected-output regression tests preserve existing behavior.
-   Tests must not require live paid model calls.

## Context and related work

-   Inspect [run options](../src/cli/cli-commands/coder/run.ts), [the frame builder](../scripts/run-codex-prompts/ui/buildCoderRunUiFrame.ts), [shared UI code](../scripts/run-codex-prompts/ui), [runner adapters](../scripts/run-codex-prompts/runners), and [terminal controls](../scripts/run-codex-prompts/common/listenForCoderRunControls.ts).
-   Attribute teammate events when [TEAM runtime support](2026-09-0440-ptbk-coder-team-runtime.md) provides them, but do not implement delegation as part of this display change.
-   Keep in mind the DRY _(don't repeat yourself)_ principle. Do a proper analysis of the existing stream handling before adding another parser.
-   Update CLI help and the [Coder landing website](../apps/coder-landing), including its terminal demonstration where it represents the changed UI.
-   Add the changes into the [changelog](../changelog/_current-preversion.md).
