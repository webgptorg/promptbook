# ptbk coder landing overview

This specification describes the `ptbk coder` landing page at `apps/coder-landing`.

The page explains `ptbk coder` to developers who may already understand Claude Code, OpenAI Codex, Cursor, Cline, Kilo, or Opencode, but do not yet understand how Promptbook uses prompt files, project context, verification, Git, and a local server around those agents.

## Primary promise

`ptbk coder` turns markdown prompt queues into verified, committed coding work by running the selected AI coding harness inside a repeatable Promptbook workflow.

## Required page characteristics

-   The page is a dark-mode English landing page.
-   The first viewport must make `ptbk coder` visible as the product name and show a product-relevant terminal/server visual.
-   The page must include command examples from installation through advanced use.
-   The content must stay grounded in existing `ptbk coder` behavior and must not imply that `ptbk coder` is its own model.
-   The implementation must be based on Next.js.

## Related specs

-   [Information architecture](./information-architecture.md)
-   [Content model](./content-model.md)
-   [Visual design](./visual-design.md)
-   [Terminal walkthrough](./terminal-walkthrough.md)
-   [Hero section](./sections/hero.md)
-   [Server board](./sections/server-board.md)
