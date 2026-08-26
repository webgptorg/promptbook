# Section: What is ptbk coder ("How it works")

Anchor `#how-it-works`. Explains the product to a developer who knows Claude Code or OpenAI Codex but has never seen `ptbk coder` (the target visitor from [`../product.md`](../product.md)).

## Copy

-   **Heading**: `Like Claude Code or Codex — but for your whole backlog` (the "but for your whole backlog" part in Promptbook Blue).
-   **Lead paragraph**:

    > Coding agents are great at one task at a time. **ptbk coder** sits one level above them: it is an orchestrator that keeps your favorite agent working through an entire queue of PRDs, unattended.

## Three step cards

Displayed as a 3-column grid (1 column on mobile), each card with a numbered square badge (1/2/3), a title (Outfit semibold) and a description:

1. **You write PRDs, not sessions** — "Instead of chatting with an agent one task at a time, you drop each task as a markdown PRD into the prompts/ folder — a backlog your whole team can read, review and version in git."
2. **Start once, then stop babysitting** — "By default, it sends the next ready PRD to the coding agent you already use — Claude Code, OpenAI Codex, GitHub Copilot, Gemini CLI, opencode or Cline — as soon as the last one finishes. You do not need to approve every task or answer a new chat session every few minutes."
3. **A done PRD means a done commit** — "It runs your configured tests and quality checks, feeds failures back for retries, then commits the PRD status together with its code under a dedicated agent identity. Revert the commit, and both the implementation and its done mark go back together. Finished PRDs are archived to prompts/done/."
