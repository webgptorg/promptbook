# Section: Core benefits ("How it works")

Anchor `#how-it-works`. Explains the product to a developer who knows Claude Code or OpenAI Codex but has never seen `ptbk coder` (the target visitor from [`../product.md`](../product.md)).

## Copy

-   **Heading**: `Ship a backlog, not a stream of interruptions.` (the "stream of interruptions." part in Promptbook Blue).
-   **Lead paragraph**:

    > **ptbk coder** reads the PRD markdown files in `prompts/` and works through them one at a time. You choose the harness and start the run. Come back to commits that already passed your tests, instead of a chat window full of questions.

## Three benefit cards

Displayed as a 3-column grid (1 column on mobile), each card has a centered code-native SVG illustration, a small monospace benefit label, an Outfit semibold title, and a description. The illustrations are centered inside a fixed-height visual panel so they read as graphics rather than top-left list badges.

1. **No babysitting** — **Start the queue. Get back to your work.** — "Put your PRD markdown files in prompts/ and start a run. ptbk coder implements each task, runs the checks you configured, feeds every failure back to the agent, and commits before it moves to the next one."

    - Illustration: an autonomous terminal queue flowing through a check and commit loop.

2. **No vendor lock-in** — **Keep your agent portable.** — "The behavior of the agent lives in a .book file you commit next to the code, not in one vendor prompt box. Change --harness and the same queue runs on Claude Code or OpenAI Codex. With opencode you point it at whatever provider you configured, local models included."

    - Illustration: a central `.book` document connected to interchangeable harness marks and a local terminal.

3. **One source of truth** — **Let your PRD tell the truth.** — "When a task passes, ptbk coder writes its [x] into the PRD and puts that line in the same commit as the code it describes. Revert the commit and the checkbox goes back to [ ] together with the code."

    - Illustration: a checked PRD and code file joining into one git commit, with a small reversible-history arrow.
