# Section: Advanced features

Anchor `#features`. A grid of feature cards, each pairing a short explanation with a terminal snippet — covering the "everything around the agent" machinery from [`../product.md`](../product.md).

## Copy

-   **Heading**: `Built for unattended coding` ("unattended" in Promptbook Blue).
-   **Lead paragraph**: The agent writes the code. ptbk coder does the rest: it runs your tests, commits, pulls and pushes, paces the queue against your quota window, and gives you back control the moment you press P or X. That is what keeps a run going for hours without you.

## Cards

3-column grid on desktop, 2 on tablet, 1 on mobile. Each card: title (Outfit semibold), description, and a [terminal block](../components/terminal-block.md) snippet. Exactly these seventeen cards, in this order:

| #   | Title                          | Snippet                                                                                          |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| 1   | Verified by your tests         | `ptbk coder run --harness claude-code --test npm test`                                           |
| 2   | Test before coding             | `ptbk coder run --harness claude-code --test npm test --test-before yes-and-fix`                 |
| 3   | Commits with its own identity  | `CODING_AGENT_GIT_NAME="Promptbook Coding Agent"`                                                |
| 4   | Autopilot git                  | `ptbk coder run --harness claude-code --auto-pull --auto-push`                                   |
| 5   | Git-synced housekeeping        | `ptbk coder init --auto-pull --commit --auto-push`                                               |
| 6   | Isolated worktrees             | `ptbk coder run --harness claude-code --isolate`                                                 |
| 7   | Kanban web UI                  | `ptbk coder server --port 4441 --harness claude-code`                                            |
| 8   | Prompt priorities              | `ptbk coder run --harness claude-code --min-priority 1 --max-priority 5`                         |
| 9   | Model-specific prompts         | `ptbk coder run --harness github-copilot --model gpt-5.5`                                        |
| 10  | Pacing and retries             | `ptbk coder run --harness claude-code --wait-between-prompts 30m --wait-after-error 10m`         |
| 11  | Dry run first                  | `ptbk coder run --dry-run`                                                                       |
| 12  | Ping before you queue          | `ptbk coder ping --harness openai-codex --model gpt-5.6-sol --thinking-level xhigh`              |
| 13  | Keep the 5-hour window rolling | `ptbk coder ping --harness claude-code --model claude-sonnet-5 --thinking-level low --period 5h` |
| 14  | Human in the loop              | `ptbk coder run --harness claude-code --no-auto`                                                 |
| 15  | Live status in the prompt file | `` [^] by OpenAI Codex `gpt-5.6-luna` - Implementation in progress ``                            |
| 16  | Verify and archive             | `ptbk coder verify --order from-latest`                                                          |
| 17  | Many prompts per file          | `ptbk coder generate-boilerplates --count 10*7`                                                  |

## Descriptions (verbatim card copy)

1. **Verified by your tests** — "Run any test command after each prompt. When it fails, ptbk coder hands the output back to the agent, which retries until the tests pass."
2. **Test before coding** — "Run the tests before the first coding prompt. Stop on failures that were already there, or let one repair prompt fix them before the backlog starts."
3. **Commits with its own identity** — "Every successful round lands under a git identity that belongs to the agent, GPG-signed if you set that up. You can always tell which commits it wrote."
4. **Autopilot git** — "Pull before prompts and push after commits, so a long-running queue stays in sync with your remote."
5. **Git-synced housekeeping** — "ptbk coder init, add, generate-boilerplates and verify all take the same --commit, --auto-push and --auto-pull switches. Setting up a project, queueing prompts and archiving finished ones leave no uncommitted work behind. Verify pulls and pushes around every single verification."
6. **Isolated worktrees** — "Implement every prompt in its own temporary git worktree with its own environment. Verified work lands back on your branch as one commit. If a task will not merge, ptbk coder marks it failed and keeps its worktree so you can look at it. Deeply nested repositories work on Windows too."
7. **Kanban web UI** — "ptbk coder server keeps running after the queue is empty, watches for new prompt files and serves a Trello-style board where you can edit prompts in the browser."
8. **Prompt priorities** — "Give prompts a priority and process only the range you want in the current run."
9. **Model-specific prompts** — "Route a prompt to a model family or harness with a backtick token on its [ ] status line, such as [ ] use model `gpt-5.5`. Other runners skip it."
10. **Pacing and retries** — "Wait a fixed wall-clock duration between prompts. The clock keeps running through a pause and through sleep, and errors retry after a cool-down. Whenever S is offered it skips whatever the coder waits for right now, down to the harness session limit that would otherwise hold the run for hours."
11. **Dry run first** — "Preview which prompts would run. No files touched, no tokens spent."
12. **Ping before you queue** — "ptbk coder ping sends one tiny dummy prompt to a harness and model and reports the answer, the response time and the usage. Use it to check that a harness, model and login work before you queue anything. It also opens the hourly or weekly quota window early, so the quota is already refreshing by the time you need it. It touches nothing in your project."
13. **Keep the 5-hour window rolling** — "Add --period and the ping repeats until you stop it with CTRL+C. One ping every 5h holds the Claude Code 5-hour limit window open, so a queue you start at any hour already has a refreshing window waiting for it. That costs a handful of tokens per ping instead of a run you have to babysit."
14. **Human in the loop** — "Confirm each prompt yourself with --no-auto. Press P to pause a running queue, or X to end it after the current prompt. Every press is answered in the Controls panel on the next frame, so you can tell that the key landed even when it changed nothing."
15. **Live status in the prompt file** — "A prompt turns from [ ] into [^] the moment the agent picks it up, and the line names the step that is running. It only becomes [x] after the work is implemented, verified and committed. ptbk coder never reverts a [^], so if the queue is killed or crashes you can see which task was left half-done."
16. **Verify and archive** — "Every successful round writes the harness, model and thinking level into the prompt status line. Walk through completed prompts one by one, archive the finished ones to prompts/done/, and get a repair prompt appended for anything left incomplete. Pick the order with --order from-earliest, from-latest or random."
17. **Many prompts per file** — "ptbk coder generate-boilerplates writes one prompt per file by default (--count 5\*1). Use --count N\*M to pack a whole backlog into fewer files: N files with M prompts each. A --- line separates the sections, every file carries one fresh emoji tag, and each section still runs as its own task."

Option semantics must stay consistent with [`../content/commands.md`](../content/commands.md).
