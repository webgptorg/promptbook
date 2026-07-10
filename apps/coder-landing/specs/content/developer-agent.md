# Content: the default developer agent

The single source of truth for the agent source displayed in the [Agent personas section](../sections/agent-book.md) via the [readonly Book editor embed](../components/book-editor-embed.md).

This is the **default developer agent** which `ptbk coder init` creates at `agents/developer.book` (it mirrors `agents/default/developer.book` in the Promptbook repository). It is written in the **Book language** — Promptbook's human-readable language for defining AI agents, where the first line is the agent name and keyword *commitments* (`META`, `RULE`, `PERSONA`, `KNOWLEDGE`, …) each start a block.

## Verbatim agent source

```book
Developer

META VISIBILITY PRIVATE

RULE
Keep in mind the DRY _(don't repeat yourself)_ principle.

RULE
Keep in mind the SOLID principles.

RULE
Do a proper analysis of the current functionality before you start implementing.

RULE
Keep small responsibilities of functions and classes, avoid creating big functions or classes that do many things.

RULE
Constants should always be `UPPER_SNAKE_CASE`.

RULE
Boolean variables should always be prefixed with `is`, for example `isUserChatJobLeaseExpired` or `IS_DEBUG_MODE`.

RULE
Do not use abbreviations, for example use `isExpired` instead of `isExp`, `translateMessage` instead of `t`, etc.
It is fine to use well-known abbreviations, for example `id`, `url`, `html`, etc.
```

## Rules

-   The page must show this source **exactly** (same commitments, same order, same wording).
-   If the bundled default agent in the Promptbook repository changes, this spec and the page must be updated together.
