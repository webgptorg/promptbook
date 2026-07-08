# Workflow section

The workflow section explains how `ptbk coder` moves a task through the system.

## Cards

1. Prompt backlog: markdown prompt files are the durable source of tasks.
2. Agent behavior: `.book` files and context keep each prompt consistent.
3. Verification loop: a test command can feed failures back into the agent.
4. Git bookkeeping: successful rounds mark prompts done and create commits unless disabled.

## Source behavior

The section is based on the current `ptbk coder run` flow:

-   Load prompt files from `prompts/`.
-   Select the next runnable section.
-   Append agent and context instructions.
-   Execute the selected harness.
-   Run optional verification.
-   Mark success or failure.
-   Commit successful work unless `--no-commit` is used.

## Related specs

-   [Terminal walkthrough](../terminal-walkthrough.md)
-   [Feature section](./features.md)
