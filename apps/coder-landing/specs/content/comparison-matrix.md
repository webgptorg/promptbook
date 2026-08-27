# Content: comparison matrix

The single source of truth for the [Comparison section](../sections/comparison.md).

## Scope

-   Only **`ptbk coder`** is compared — not the Promptbook engine, not the Agents Server.
-   Every row is about the **orchestration around a task**: the unattended PRD queue, portable agent behavior, verification, git history, pacing, and control. No row may claim anything about how well an agent writes code.
-   The compared solutions are exactly the coding agents `ptbk coder` drives, so the comparison never reads as a rivalry: the losing side of a row is a harness of the winning side.

## Columns

Four columns, in this order. The three harness columns take their display name, vendor and logo from [`harness-catalog.md`](./harness-catalog.md) — those values are never repeated here.

| #   | Column name    | Display name | Vendor       | Logo                             |
| --- | -------------- | ------------ | ------------ | -------------------------------- |
| 1   | `ptbk-coder`   | ptbk coder   | Promptbook   | white Promptbook mark, blue tile |
| 2   | `claude-code`  | from catalog | from catalog | from catalog                     |
| 3   | `openai-codex` | from catalog | from catalog | from catalog                     |
| 4   | `opencode`     | from catalog | from catalog | from catalog                     |

## Support levels

Every cell carries one support level and a few-word note naming the option, command or workaround behind it.

| Level            | Mark              | Legend                                              |
| ---------------- | ----------------- | --------------------------------------------------- |
| `built-in`       | check, green      | Built in, one option or command away               |
| `do-it-yourself` | dash, gray        | Reachable, but you script and maintain it yourself |
| `not-available`  | cross, muted gray | Not provided by the tool                           |

Accessible labels of the marks (screen readers): `Built in`, `Do it yourself`, `Not available`.

## Rows

Exactly these fifteen capabilities, in this order. Legend of the cells: ✅ `built-in`, 🛠 `do-it-yourself`, ❌ `not-available`.

| #   | Capability                     | ptbk coder                             | Claude Code                   | OpenAI Codex                  | opencode                     |
| --- | ------------------------------ | -------------------------------------- | ----------------------------- | ----------------------------- | ---------------------------- |
| 1   | Interactive coding session     | ❌ Drives the agents instead           | ✅ Its home ground            | ✅ Its home ground            | ✅ Its home ground           |
| 2   | Unattended PRD queue           | ✅ Automatic `prompts/` queue          | 🛠 Script one session per PRD  | 🛠 Script one session per PRD  | 🛠 Script one session per PRD |
| 3   | Portable agent definition      | ✅ Same `.book`, change `--harness`    | ❌ Is one of the harnesses    | ❌ Is one of the harnesses    | 🛠 Provider config, own agent |
| 4   | PRD status committed with code | ✅ One commit: code + `[x]`            | 🛠 Keep a separate checklist   | 🛠 Keep a separate checklist   | 🛠 Keep a separate checklist  |
| 5   | Several agents on one backlog  | ✅ `--min-priority` / `--max-priority` | ❌ No shared queue            | ❌ No shared queue            | ❌ No shared queue           |
| 6   | Tests after every task         | ✅ `--test`, retried until green       | 🛠 If asked, or via hooks      | 🛠 If asked in the prompt      | 🛠 If asked in the prompt     |
| 7   | Tests before the first task    | ✅ `--test-before yes-and-fix`         | ❌ Nothing runs before you    | ❌ Nothing runs before you    | ❌ Nothing runs before you   |
| 8   | Commits as its own author      | ✅ Dedicated agent identity            | 🛠 Commits as you              | 🛠 Commits as you              | 🛠 Commits as you             |
| 9   | Pull and push around each task | ✅ `--auto-pull --auto-push`           | 🛠 When you ask for it         | 🛠 When you ask for it         | 🛠 When you ask for it        |
| 10  | One worktree per task          | ✅ `--isolate`                         | 🛠 Set up worktrees yourself   | 🛠 Set up worktrees yourself   | 🛠 Set up worktrees yourself  |
| 11  | Board over the backlog         | ✅ `ptbk coder server`                 | ❌ No backlog to show         | ❌ No backlog to show         | ❌ No backlog to show        |
| 12  | Pacing for quota windows       | ✅ `--wait-between-prompts`            | ❌ Pace it by hand            | ❌ Pace it by hand            | ❌ Pace it by hand           |
| 13  | Preflight check of a harness   | ✅ `ptbk coder ping`                   | 🛠 Check limits in the session | 🛠 Check limits in the session | 🛠 Depends on the provider    |
| 14  | Writes the backlog for you     | ✅ `ptbk coder generate-boilerplates`  | 🛠 Ask for it in a session     | 🛠 Ask for it in a session     | 🛠 Ask for it in a session    |
| 15  | Human in the loop              | ✅ `--no-auto`, P, X                   | ✅ You are in the session     | ✅ You are in the session     | ✅ You are in the session    |

### Descriptions (verbatim row copy)

1. **Interactive coding session** — "Sit next to the agent in a terminal and steer a single task while it happens."
2. **Unattended PRD queue** — "PRD markdown files go through the agent one after another, each with your checks, a retry on failure and a commit before the queue moves on."
3. **Portable agent definition** — "The same PRD queue and .book behavior can run with another harness or model."
4. **PRD status committed with code** — "The finished [x] goes into the same commit as the implementation it describes, so reverting history rolls both back together."
5. **Several agents on one backlog** — "Run more harnesses and models at once, each taking its own slice of the queue."
6. **Tests after every task** — "Your test command runs after each prompt and failures go back to the agent until it is green."
7. **Tests before the first task** — "Failures that were already there show up before the queue starts, and get repaired first."
8. **Commits as its own author** — "Each verified round lands under a separate agent git identity, GPG-signed if you set that up."
9. **Pull and push around each task** — "A queue running for hours stays in sync with the remote without anybody watching it."
10. **One worktree per task** — "Each prompt runs in its own temporary git worktree and merges back once it is verified."
11. **Board over the backlog** — "A Trello-style kanban of the prompt files, editable in the browser while the queue runs."
12. **Pacing for quota windows** — "Wall-clock waits between prompts and a cool-down retry after an error keep a long queue alive."
13. **Preflight check of a harness** — "One tiny dummy prompt reports the answer, the response time and the usage, and warms the quota window."
14. **Writes the backlog for you** — "Boilerplates, refactor candidates and one-line ideas become ready-to-run prompt files."
15. **Human in the loop** — "Confirm each task, pause a running queue, or end it after the task which is running now."

## Rules for changing the matrix

-   Every `ptbk coder` cell must be backed by a real option or command of the CLI; the long-form explanation of each of them lives in [`../sections/advanced-features.md`](../sections/advanced-features.md) and is never repeated here.
-   A cell about another product may only state what that product provides **out of the box**. When something is reachable by scripting it yourself, the level is `do-it-yourself`, never `not-available`.
-   Rows 1 and 15 are deliberately not won by `ptbk coder` — they keep the comparison honest and show that the tools are complementary.
