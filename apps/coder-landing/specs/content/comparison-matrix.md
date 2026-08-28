# Content: comparison matrix

The single source of truth for the [Comparison section](../sections/comparison.md).

## Scope

-   Only **`ptbk coder`** is compared — not the Promptbook engine, not the Agents Server.
-   Every row is about the **orchestration around a task**: the unattended queue, portable agent behavior, verification, git history, pacing, and the backlog itself. No row may claim anything about how well an agent writes code.
-   The compared solutions are exactly the coding agents `ptbk coder` drives, so the comparison never reads as a rivalry: the losing side of a row is a harness of the winning side.
-   A row earns its place only when it changes the decision of a visitor who already runs a coding agent. A capability every solution has in the same way belongs in [`../sections/advanced-features.md`](../sections/advanced-features.md), not here.

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

| Level            | Mark              | Meaning                                                       | Legend                                             |
| ---------------- | ----------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| `built-in`       | check, green      | The tool does the whole thing for you                         | Built in, one option or command away               |
| `do-it-yourself` | dash, gray        | The tool gives you the pieces and you wire them together      | Reachable, but you script and maintain it yourself |
| `not-available`  | cross, muted gray | The tool has no such concept, you would write the orchestrator | No such concept in the tool                        |

Accessible labels of the marks (screen readers): `Built in`, `Do it yourself`, `Not available`.

## Rows

Exactly these nine capabilities, in this order. Legend of the cells: ✅ `built-in`, 🛠 `do-it-yourself`, ❌ `not-available`.

One row states **one claim for `ptbk coder`** and **one claim shared by all three harnesses**, plus an override for each harness that really differs. Today exactly one row (row 4) has such an override.

| #   | Capability                           | ptbk coder                            | Claude Code, OpenAI Codex, opencode |
| --- | ------------------------------------ | ------------------------------------- | ----------------------------------- |
| 1   | One task, side by side               | ❌ It drives them instead             | ✅ What they are built for          |
| 2   | The whole backlog, unattended        | ✅ `ptbk coder run`                   | 🛠 Script one session per task       |
| 3   | Several agents on one backlog        | ✅ `--min-priority` `--max-priority`  | ❌ No shared queue                  |
| 4   | The same agent on another vendor     | ✅ `--harness`                        | ❌ One of the harnesses *(override below)* |
| 5   | Your tests gate every task           | ✅ `--test` `--test-before`           | 🛠 Ask for it, or wire a hook        |
| 6   | Done state committed with the code   | ✅ In every commit                    | 🛠 Track it by hand                  |
| 7   | Git kept in order around each task   | ✅ `--auto-pull` `--auto-push` `--isolate` | 🛠 It commits as you, when asked |
| 8   | Long runs that outlast a quota window| ✅ `--wait-between-prompts`           | ❌ No queue to pace                 |
| 9   | A backlog you can watch and refill   | ✅ `ptbk coder server`                | ❌ No backlog to show               |

### Harness overrides

| Row | Harness    | Cell                             | Why it differs                                                       |
| --- | ---------- | -------------------------------- | -------------------------------------------------------------------- |
| 4   | `opencode` | 🛠 Any provider, your config      | It is provider-agnostic, but the agent is configured the opencode way |

### Descriptions (verbatim row copy)

1. **One task, side by side** — "Sit in the terminal with the agent and steer a single task while it happens."
2. **The whole backlog, unattended** — "Task files go through the agent one after another: implement, verify, commit, next one."
3. **Several agents on one backlog** — "Run more harnesses and models at once, each taking its own slice of the queue."
4. **The same agent on another vendor** — "The queue and the .book behavior move to a different harness or model without a rewrite."
5. **Your tests gate every task** — "Tests run before the queue starts and after every task, and failures go back to the agent until it is green."
6. **Done state committed with the code** — "The finished [x] lands in the same commit as the work it describes, so reverting takes both back."
7. **Git kept in order around each task** — "Commits under the agent git identity, a pull before and a push after, and one throwaway worktree per task."
8. **Long runs that outlast a quota window** — "Pacing between tasks, a cool-down retry after an error, and a ping that keeps the quota window refreshing."
9. **A backlog you can watch and refill** — "A kanban board over the prompt files while the queue runs, with commands that write new ones and archive the finished."

## Rules for changing the matrix

-   Every `ptbk coder` cell must be backed by a real option, command or default behavior of the CLI; the long-form explanation of each of them lives in [`../sections/advanced-features.md`](../sections/advanced-features.md) and is never repeated here.
-   The note of a `ptbk coder` cell is the option or command itself whenever there is one, so it renders in monospace; a note of any other cell is plain prose, so it does not. See the typography rules in [`../design.md`](../design.md).
-   A cell about another product may only state what that product provides **out of the box**. When the product hands you the pieces (a hook, a flag, a session to ask in), the level is `do-it-yourself`; `not-available` is only for capabilities the product has no concept of, such as a queue or a backlog.
-   A harness only gets an override when it genuinely differs. Writing the same claim three times is what this format exists to prevent.
-   Row 1 is deliberately not won by `ptbk coder` — it keeps the comparison honest and states the positioning: these tools are complementary.
