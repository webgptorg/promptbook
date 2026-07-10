# Section: Advanced features

Anchor `#features`. A grid of feature cards, each pairing a short explanation with a terminal snippet — covering the "everything around the agent" machinery from [`../product.md`](../product.md).

## Copy

-   **Heading**: `Built for unattended coding` ("unattended" in Promptbook Blue).
-   **Lead paragraph**: Everything around the agent — git hygiene, verification, pacing, and control — is handled by ptbk coder so the queue can run for hours without you.

## Cards

3-column grid on desktop, 2 on tablet, 1 on mobile. Each card: title (Outfit semibold), description, and a [terminal block](../components/terminal-block.md) snippet. Exactly these nine cards, in this order:

| # | Title                          | Snippet                                                                            |
| - | ------------------------------ | ----------------------------------------------------------------------------------- |
| 1 | Verified by your tests         | `ptbk coder run --harness claude-code --test npm test`                              |
| 2 | Commits with its own identity  | `CODING_AGENT_GIT_NAME="Promptbook Coding Agent"`                                   |
| 3 | Autopilot git                  | `ptbk coder run --harness claude-code --auto-pull --auto-push`                      |
| 4 | Kanban web UI                  | `ptbk coder server --port 4441 --harness claude-code`                               |
| 5 | Prompt priorities              | `ptbk coder run --harness claude-code --priority 1`                                 |
| 6 | Pacing and retries             | `ptbk coder run --harness claude-code --wait-between-prompts 30m --wait-after-error 10m` |
| 7 | Dry run first                  | `ptbk coder run --dry-run`                                                          |
| 8 | Human in the loop              | `ptbk coder run --harness claude-code --no-auto`                                    |
| 9 | Verify and archive             | `ptbk coder verify`                                                                 |

## Descriptions (verbatim card copy)

1. **Verified by your tests** — "Run any test command after each prompt. Failures are fed back to the agent, which retries until the tests pass."
2. **Commits with its own identity** — "Every successful round is staged and committed under a dedicated agent git identity — optionally GPG-signed — so agent work is always attributable."
3. **Autopilot git** — "Pull before prompts and push after commits, so a long-running queue stays in sync with your remote."
4. **Kanban web UI** — "ptbk coder server keeps running after the queue is empty, watches for new prompt files and serves a Trello-style board where you can edit prompts in the browser."
5. **Prompt priorities** — "Give important prompts a higher priority and process only those above a minimum level."
6. **Pacing and retries** — "Pace the queue with wait durations and let errors retry automatically — up to 3 times with a cool-down in between."
7. **Dry run first** — "Preview which prompts would run — without touching your code or spending a single token."
8. **Human in the loop** — "Confirm each prompt manually with --no-auto, or press "p" in the terminal (or the pause button in the web UI) to pause a running queue."
9. **Verify and archive** — "Walk through completed prompts interactively, archive the finished ones to prompts/done/ and auto-append repair prompts for incomplete work."

Option semantics must stay consistent with [`../content/commands.md`](../content/commands.md).
