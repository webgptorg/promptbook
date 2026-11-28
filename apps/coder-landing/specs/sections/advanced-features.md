# Section: Advanced features

Anchor `#features`. A grid of feature cards, each pairing a short explanation with a terminal snippet — covering the "everything around the agent" machinery from [`../product.md`](../product.md).

## Copy

-   **Heading**: `Built for unattended coding` ("unattended" in Promptbook Blue).
-   **Lead paragraph**: The agent writes the code. ptbk coder does the rest: it runs your checks, commits, pulls and pushes, paces the queue against your quota window, and gives you back control the moment you press P or X. That is what keeps a run going for hours without you.

## Cards

3-column grid on desktop, 2 on tablet, 1 on mobile. Each card: title (Outfit semibold), description, and a [terminal block](../components/terminal-block.md) snippet. Exactly these twenty-two cards, in this order:

| #   | Title                          | Snippet                                                                                          |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| 1   | Verified by your checks        | `ptbk coder run --harness claude-code --check "npm run check"`                                   |
| 2   | Check before coding            | `ptbk coder run --harness claude-code --check "npm run check" --check-before yes-and-fix`        |
| 3   | Repair checks and stop         | `ptbk coder fix --harness openai-codex`                                                          |
| 4   | Commits with its own identity  | `CODING_AGENT_GIT_NAME="Promptbook Coding Agent"`                                                |
| 5   | Autopilot git                  | `ptbk coder run --harness claude-code --auto-pull --auto-push`                                   |
| 6   | Git-synced housekeeping        | `ptbk coder init --auto-pull --commit --auto-push`                                               |
| 7   | Isolated worktrees             | `ptbk coder run --harness claude-code --isolate`                                                 |
| 8   | Kanban web UI                  | `ptbk coder server --port 4441 --harness claude-code`                                            |
| 9   | Prompt priorities              | `ptbk coder run --harness claude-code --min-priority 1 --max-priority 5`                         |
| 10   | Model-specific prompts         | `ptbk coder run --harness github-copilot --model gpt-6-astra`                                    |
| 11  | Agent-specific prompts         | `ptbk coder run --harness github-copilot --model gpt-6-astra --agent agents/my-developer.book`   |
| 12  | Pacing and retries             | `ptbk coder run --harness claude-code --wait-between-prompts 30m --wait-after-error 10m`         |
| 13  | List before you run            | `ptbk coder list`                                                                                |
| 14  | Ping before you queue          | `ptbk coder ping --harness openai-codex --model gpt-5.6-sol --thinking-level xhigh`              |
| 15  | Keep the 5-hour window rolling | `ptbk coder ping --harness claude-code --model claude-sonnet-5 --thinking-level low --period 5h` |
| 16  | Human in the loop              | `ptbk coder run --harness claude-code --no-auto`                                                 |
| 17  | Nothing to answer              | `ptbk coder run --harness claude-code --no-questions`                                            |
| 18  | Live status in the prompt file | `` [^] by Developer on OpenAI Codex `gpt-5.6-luna` - Implementation in progress ``               |
| 19  | Pick up where the run stopped  | `ptbk coder run --harness claude-code --git-changes continue`                                    |
| 20  | Run traces you can read later  | `prompts/traces/2026-09-0180-add-dark-mode.md`                                                   |
| 21  | Verify and archive             | `ptbk coder verify --order from-latest`                                                          |
| 22  | Many prompts per file          | `ptbk coder generate-boilerplates --count 10*7`                                                  |

## Descriptions (verbatim card copy)

1. **Verified by your checks** — "Run any project check command after each prompt. When it fails, ptbk coder hands the output back to the agent, which retries until the checks pass."
2. **Check before coding** — "Run the checks before the first coding prompt. Stop on failures that were already there, or let one repair prompt fix them before the backlog starts."
3. **Repair checks and stop** — "Run npm run check, repair failures with one verified PRD, commit eligible changes and exit. A healthy project launches no harness. Ordinary queued tasks stay untouched; verify remains the human review and archive helper."
4. **Commits with its own identity** — "Every successful round lands under a git identity that belongs to the agent, GPG-signed if you set that up. You can always tell which commits it wrote."
5. **Autopilot git** — "Pull before prompts and push after commits, so a long-running queue stays in sync with your remote."
6. **Git-synced housekeeping** — "ptbk coder init, add, generate-boilerplates and verify all take the same --commit, --auto-push and --auto-pull switches. Setting up a project, queueing prompts and archiving finished ones leave no uncommitted work behind. Verify pulls and pushes around every single verification."
7. **Isolated worktrees** — "Implement every prompt in its own temporary git worktree with its own environment. Verified work lands back on your branch as one commit. If a task will not merge, ptbk coder marks it failed and keeps its worktree so you can look at it. Deeply nested repositories work on Windows too."
8. **Kanban web UI** — "ptbk coder server keeps running after the queue is empty, watches for new prompt files and serves a Trello-style board where you can edit prompts in the browser."
9. **Prompt priorities** — "Give prompts a priority and process only the range you want in the current run."
10. **Model-specific prompts** — "Route a prompt to a model family or harness with a backtick token on its [ ] status line, such as [ ] use model `gpt-6-astra`. Other runners skip it."
11. **Agent-specific prompts** — "Route a prompt to the selected Book with its path, filename, stem or title from the first line, such as [ ] use agent `developer`. Other agents skip it."
12. **Pacing and retries** — "Wait a fixed wall-clock duration between prompts. The clock keeps running through a pause and through sleep, and errors retry after a cool-down. The terminal also shows every subscription window a harness reports, with its remaining allowance and reset time, re-read every 5 seconds so the numbers keep moving while a prompt runs instead of standing still until it ends. Whenever S is offered it skips whatever the coder waits for right now, down to the harness session limit that would otherwise hold the run for hours."
13. **List before you run** — "See every ready, fully authored prompt grouped by priority before starting a harness. Narrow the list by harness, model, agent, or priority range; no files change and no tokens are spent."
14. **Ping before you queue** — "ptbk coder ping sends one tiny dummy prompt to a harness and model and reports the answer, the response time and the usage. Use it to check that a harness, model and login work before you queue anything. It also opens the hourly or weekly quota window early, so the quota is already refreshing by the time you need it. If that harness has missing local ignore rules, it asks before adding them to .gitignore."
15. **Keep the 5-hour window rolling** — "Add --period and the ping repeats until you stop it with CTRL+C. One ping every 5h holds the Claude Code 5-hour limit window open, so a queue you start at any hour already has a refreshing window waiting for it. That costs a handful of tokens per ping instead of a run you have to babysit."
16. **Human in the loop** — "The dashboard starts in Normal output, with agent messages, commands, file changes and verification shown separately. Press O to switch to Raw output and back while the same task keeps running. Use the arrow keys to scroll output and End to follow it live. Press P to pause the queue, X to end after the current prompt, or use --no-auto to confirm each prompt. Use --no-ui for plain logs."
17. **Nothing to answer** — "The opposite end: --no-questions never asks anything at all. Installing a missing harness, updating an outdated one or adding ignore rules is skipped and printed as the command which does it manually, so a queue started from a script or a CI job never stops at a prompt nobody is there to answer. ptbk coder init, add, run, ping and server all take it."
18. **Live status in the prompt file** — "A [ ] prompt — or plain markdown with no status checkbox — turns into [^] the moment the agent picks it up, and the line names the step that is running. A run started with --agent names that agent in front of its harness, so a finished prompt says which agent implemented it. A prompt without a checkbox starts at priority 0. Use [-] or [.] to keep a task out of the queue, or add `<!--ptbk-coder-ignore-->` anywhere in a Markdown file to ignore it entirely. It only becomes [x] after the work is implemented, verified and committed. ptbk coder never reverts a [^], so if the queue is killed or crashes you can see which task was left half-done."
19. **Pick up where the run stopped** — "A dirty working tree stops ptbk coder by default. --git-changes ignore starts anyway, and --git-changes continue resumes the one prompt left in [^] with its half-finished changes still in place. Any harness can take the work over, and the status line then names both the one that started and the one that finished it."
20. **Run traces you can read later** — "Every round leaves a trace in prompts/traces/, named after the prompt file it belongs to. It holds the agent, harness, model, thinking level and login method that ran the prompt, what each step cost and how long it took, and the whole raw output of the harness. The trace is committed together with the prompt, so the run can still be analyzed long after its temporary logs are gone."
21. **Verify and archive** — "Every successful round writes the agent, harness, model and thinking level into the prompt status line. Walk through completed prompts one by one, archive the finished ones to prompts/done/, and get a repair prompt appended for anything left incomplete. Pick the order with --order from-earliest, from-latest or random."
22. **Many prompts per file** — "ptbk coder generate-boilerplates writes one prompt per file by default (--count 5\*1). Use --count N\*M to pack a whole backlog into fewer files: N files with M prompts each. A --- line separates the sections, every file carries one fresh emoji tag, and each section still runs as its own task."

Option semantics must stay consistent with [`../content/commands.md`](../content/commands.md).
