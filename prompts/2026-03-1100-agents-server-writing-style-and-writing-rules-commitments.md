[ ]

[🖋️📩] Writing Style and Writing Rules commitments

-   *(@@@@ Written by agent)*
-   Add 2 new commitment types:
    -   `writing-style` = explicit 1:1 sample text of how the agent should sound (no rules / no meta commentary; sample-only)
    -   `writing-rules` = instructions strictly about writing (tone, formatting, emoji usage, length, etc.), not about problem-solving behavior
-   Deprecate previous commitment types `style`, `example`, `sample` (previous attempts at controlling writing). Keep them readable for backward compatibility but do not apply them to newly generated system prompts.
-   Do NOT deprecate `rule` commitment: it stays and continues to affect agent behavior. `writing-style` and `writing-rules` only affect communication.
-   Stacking / precedence:
    -   Commitments are applied in chronological order.
    -   Newer `writing-style` samples override/reshape earlier ones (but are still “stacked” in the sense that multiple samples may exist; the latest has highest weight).
    -   Newer `writing-rules` override conflicting earlier `writing-rules`.
    -   `writing-style` and `writing-rules` both apply together; if conflict, prefer `writing-rules` for explicit constraints but keep `writing-style` as the primary “voice exemplar”.
-   Enforce across channels (chat, email, any future channel):
    -   When generating the system message, merge:
        -   `rule` commitments into “behavior” instructions
        -   `writing-rules` into “writing” instructions
        -   `writing-style` into an “exemplar” block (verbatim sample) used as the primary reference for wording and formatting
    -   Also inject (when supported) the style sample into:
        -   chat-history prompt scaffolding (e.g. a short “assistant voice” message)
        -   sampling / few-shot examples configuration (if model / provider supports it)
-   Update commitment parsing and storage:
    -   Update shared commitment schema / types to include `writing-style` and `writing-rules`.
    -   Add a `deprecated` marker (or similar) for `style|example|sample` commitments and hide them in UI creation menus.
-   UI/UX:
    -   In commitment creation UI, add the two new options with clear descriptions and warnings:
        -   Writing Style: must be a short sample, no bullet-point rules, no “Always do X” language.
        -   Writing Rules: must be about writing only.
    -   Add a small validator / linter with friendly errors for common misuses (e.g. “Writing Style contains imperative rules”).
-   Implementation notes / files to touch:
    -   You are working with the [Agents Server](apps/agents-server)
    -   Commitment types, parsing, and system-message builder (likely in apps/agents-server and shared packages) @@@
    -   Commitment editor UI components (likely in apps/agents-server) @@@
    -   Add tests covering merging/precedence and deprecation behavior @@@
-   Add the changes into the [changelog](changelog/_current-preversion.md)
