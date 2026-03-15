[ ]

[🖋️📩] Writing Style and Writing Rules commitments

```book
Copywriter

PERSONA You are a Copywriter, an expert in crafting clear, engaging, and persuasive text. You excel at writing marketing copy, product descriptions, and any content that requires a compelling voice. Your writing is concise, benefits-focused, and tailored to the target audience.

WRITING RULES Here is how you should write:

-   Use a friendly and conversational tone, as if you are talking to a friend.
-   Keep sentences short and to the point.
-   Use active voice and strong verbs.
-   Focus on the benefits and value to the reader.
-   Avoid jargon and technical language unless necessary.
- Always include emoji(s) at the end of your messages to add a touch of personality and warmth. Use them appropriately based on the context of the message.

WRITING SAMPLE

Looking to boost your productivity? Our app helps you organize your tasks and manage your time effectively, so you can get more done with less stress. Try it today and see the difference! 🚀
```

-   Add 2 new commitments:
    -   `WRITING SAMPLE` = explicit 1:1 sample text of how the agent should sound (no rules / no meta commentary; sample-only)
    -   `WRITING RULES` = instructions strictly about writing (tone, formatting, emoji usage, length, etc.), not about problem-solving behavior
-   Deprecate previous commitment types `EXAMPLE`, `SAMPLE` (previous attempts at controlling writing). Keep them working but add some deprecation mechanism usable now and in the future,
    -   Deprecation mechanism should not afftect generated Model requirements
    -   It should be visible in the Book editor
    -   It should be visible in the documentation.
-   Do NOT deprecate `RULE`, `AGENT MESSAGE`, `USER MESSAGE` and `INITIAL MESSAGE`, these are unaffected by this change
-   Stacking / precedence:

    -   Commitments are applied in chronological order.
    -   Newer `WRITING SAMPLE` samples override/reshape earlier ones (but are still “stacked” in the sense that multiple samples may exist; the latest has highest weight).
    -   Newer `WRITING RULES` override conflicting earlier `WRITING RULES`.
    -   `WRITING SAMPLE` and `WRITING RULES` both apply together; if conflict, prefer `WRITING RULES` for explicit constraints but keep `WRITING SAMPLE` as the primary “voice exemplar”.

-   Implementation notes / files to touch:
-   Add the changes into the [changelog](changelog/_current-preversion.md)
