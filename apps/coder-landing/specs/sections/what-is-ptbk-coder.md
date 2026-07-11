# Section: What is ptbk coder ("How it works")

Anchor `#how-it-works`. Explains the product to a developer who knows Claude Code or OpenAI Codex but has never seen `ptbk coder` (the target visitor from [`../product.md`](../product.md)).

## Copy

-   **Heading**: `Like Claude Code or Codex — but for your whole backlog` (the "but for your whole backlog" part in Promptbook Blue).
-   **Lead paragraph**:

    > Coding agents are great at one task at a time. **ptbk coder** sits one level above them: it is an orchestrator that keeps your favorite agent working through an entire queue of tasks, unattended.

## Three step cards

Displayed as a 3-column grid (1 column on mobile), each card with a numbered square badge (1/2/3), a title (Outfit semibold) and a description:

1. **You write prompts, not sessions** — "Instead of chatting with an agent one task at a time, you drop each task as a markdown file into the prompts/ folder — a backlog your whole team can read, review and version in git."
2. **ptbk coder drives your agent** — "It feeds the queue to the coding agent you already use — Claude Code, OpenAI Codex, GitHub Copilot, Gemini CLI, opencode or Cline — one prompt at a time, with your project context and an agent persona."
3. **Every change lands verified in git** — "After each prompt it runs your test command, feeds failures back for retries, and commits the result under a dedicated agent identity. Finished prompts are archived to prompts/done/."
