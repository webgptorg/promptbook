# Section: Advanced features

Anchor `#features`. A grid of feature cards, each pairing a short explanation with a terminal snippet — covering the "everything around the agent" machinery from [`../product.md`](../product.md).

## Copy

-   **Heading**: `Built for unattended coding` ("unattended" in Promptbook Blue).
-   **Lead paragraph**: Everything around the agent — git hygiene, verification, pacing, and control — is handled by ptbk coder so the queue can run for hours without you.

## Cards

3-column grid on desktop, 2 on tablet, 1 on mobile. Each card: title (Outfit semibold), description, and a [terminal block](../components/terminal-block.md) snippet. Exactly these fourteen cards, in this order:

| #   | Title                         | Snippet                                                                                  |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | Verified by your tests        | `ptbk coder run --harness claude-code --test npm test`                                   |
| 2   | Test before coding            | `ptbk coder run --harness claude-code --test npm test --test-before yes-and-fix`         |
| 3   | Commits with its own identity | `CODING_AGENT_GIT_NAME="Promptbook Coding Agent"`                                        |
| 4   | Autopilot git                 | `ptbk coder run --harness claude-code --auto-pull --auto-push`                           |
| 5   | Git-synced housekeeping       | `ptbk coder init --auto-pull --commit --auto-push`                                       |
| 6   | Isolated worktrees            | `ptbk coder run --harness claude-code --isolate`                                         |
| 7   | Kanban web UI                 | `ptbk coder server --port 4441 --harness claude-code`                                    |
| 8   | Prompt priorities             | `ptbk coder run --harness claude-code --min-priority 1 --max-priority 5`                 |
| 9   | Model-specific prompts        | `ptbk coder run --harness github-copilot --model gpt-5.5`                                |
| 10  | Pacing and retries            | `ptbk coder run --harness claude-code --wait-between-prompts 30m --wait-after-error 10m` |
| 11  | Dry run first                 | `ptbk coder run --dry-run`                                                               |
| 12  | Ping before you queue         | `ptbk coder ping --harness openai-codex --model gpt-5.6-sol --thinking-level xhigh`      |
| 13  | Human in the loop             | `ptbk coder run --harness claude-code --no-auto`                                         |
| 14  | Verify and archive            | `ptbk coder verify`                                                                      |

## Descriptions (verbatim card copy)

1. **Verified by your tests** — "Run any test command after each prompt. Failures are fed back to the agent, which retries until the tests pass."
2. **Test before coding** — "Run tests before the first coding prompt. Stop on pre-existing failures, or let one repair prompt fix them before the backlog starts."
3. **Commits with its own identity** — "Every successful round is staged and committed under a dedicated agent git identity — optionally GPG-signed — so agent work is always attributable."
4. **Autopilot git** — "Pull before prompts and push after commits, so a long-running queue stays in sync with your remote."
5. **Git-synced housekeeping** — "ptbk coder init, add, generate-boilerplates and verify take the same --commit, --auto-push and --auto-pull switches, so bootstrapping a project, queueing prompts and archiving verified ones never leaves uncommitted work behind. Verify synchronizes around every single verification."
6. **Isolated worktrees** — "Implement every prompt in its own temporary git worktree with its own environment. Verified work is merged back into your branch as one commit; an unmergeable task is marked as failed and its worktree is kept for you. Deeply nested repositories are handled on Windows too."
7. **Kanban web UI** — "ptbk coder server keeps running after the queue is empty, watches for new prompt files and serves a Trello-style board where you can edit prompts in the browser."
8. **Prompt priorities** — "Give prompts a priority and process only the range you want in the current run."
9. **Model-specific prompts** — "Route a prompt to a model family or harness with a backtick token on its [ ] status line, such as [ ] use model `gpt-5.5`. Other runners skip it automatically."
10. **Pacing and retries** — "Pace the queue with wall-clock wait durations that keep elapsing through pause and sleep, skip the active wait with S, and retry errors after a cool-down."
11. **Dry run first** — "Preview which prompts would run — without touching your code or spending a single token."
12. **Ping before you queue** — "ptbk coder ping sends one tiny dummy prompt to a harness and model and reports the answer, the response time and the usage. Use it to check that a harness, model and login really work, and to start the hourly or weekly quota window early so it is already refreshing by the time you need it. Your project is left exactly as it was."
13. **Human in the loop** — "Confirm each prompt manually with --no-auto, press P to pause a running queue, or press X to end after the current prompt."
14. **Verify and archive** — "Successful coding rounds record the harness, model and selected thinking level in the prompt status line. Walk through completed prompts interactively, archive the finished ones to prompts/done/ and auto-append repair prompts for incomplete work."

Option semantics must stay consistent with [`../content/commands.md`](../content/commands.md).
