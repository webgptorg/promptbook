# Section: Advanced features

Anchor `#features`. A grid of feature cards, each pairing a short explanation with a terminal snippet — covering the "everything around the agent" machinery from [`../product.md`](../product.md).

## Copy

-   **Heading**: `Built for unattended coding` ("unattended" in Promptbook Blue).
-   **Lead paragraph**: Everything around the agent — git hygiene, verification, pacing, and control — is handled by ptbk coder so the queue can run for hours without you.

## Cards

3-column grid on desktop, 2 on tablet, 1 on mobile. Each card: title (Outfit semibold), description, and a [terminal block](../components/terminal-block.md) snippet. Exactly these ten cards, in this order:

| #  | Title                          | Snippet                                                                            |
| -- | ------------------------------ | ----------------------------------------------------------------------------------- |
| 1  | Verified by your tests         | `ptbk coder run --harness claude-code --test npm test`                              |
| 2  | Commits with its own identity  | `CODING_AGENT_GIT_NAME="Promptbook Coding Agent"`                                   |
| 3  | Autopilot git                  | `ptbk coder run --harness claude-code --auto-pull --auto-push`                      |
| 4  | Isolated worktrees             | `ptbk coder run --harness claude-code --isolate`                                    |
| 5  | Kanban web UI                  | `ptbk coder server --port 4441 --harness claude-code`                               |
| 6  | Prompt priorities              | `ptbk coder run --harness claude-code --min-priority 1 --max-priority 5`            |
| 7  | Pacing and retries             | `ptbk coder run --harness claude-code --wait-between-prompts 30m --wait-after-error 10m` |
| 8  | Dry run first                  | `ptbk coder run --dry-run`                                                          |
| 9  | Human in the loop              | `ptbk coder run --harness claude-code --no-auto`                                    |
| 10 | Verify and archive             | `ptbk coder verify`                                                                 |

## Descriptions (verbatim card copy)

1. **Verified by your tests** — "Run any test command after each prompt. Failures are fed back to the agent, which retries until the tests pass."
2. **Commits with its own identity** — "Every successful round is staged and committed under a dedicated agent git identity — optionally GPG-signed — so agent work is always attributable."
3. **Autopilot git** — "Pull before prompts and push after commits, so a long-running queue stays in sync with your remote."
4. **Isolated worktrees** — "Implement every prompt in its own temporary git worktree with its own environment. Verified work is merged back into your branch as one commit; an unmergeable task is marked as failed and its worktree is kept for you. Deeply nested repositories are handled on Windows too."
5. **Kanban web UI** — "ptbk coder server keeps running after the queue is empty, watches for new prompt files and serves a Trello-style board where you can edit prompts in the browser."
6. **Prompt priorities** — "Give prompts a priority and process only the range you want in the current run."
7. **Pacing and retries** — "Pace the queue with wall-clock wait durations that keep elapsing through pause and sleep, skip the active wait with S, and retry errors after a cool-down."
8. **Dry run first** — "Preview which prompts would run — without touching your code or spending a single token."
9. **Human in the loop** — "Confirm each prompt manually with --no-auto, press P to pause a running queue, or press X to end after the current prompt."
10. **Verify and archive** — "Successful coding rounds record the harness, model and selected thinking level in the prompt status line. Walk through completed prompts interactively, archive the finished ones to prompts/done/ and auto-append repair prompts for incomplete work."

Option semantics must stay consistent with [`../content/commands.md`](../content/commands.md).
