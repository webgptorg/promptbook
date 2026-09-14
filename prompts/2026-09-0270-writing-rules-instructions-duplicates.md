[ ]

[✨🚓] when generating a system message, do not duplicate instructions

For example, when there is a commitment `WRITING RULES`, this section should be in the generated system message only once:

```
### Writing rules
These instructions apply only to how you write: tone, formatting, length, emoji usage, punctuation, and similar presentation choices.
They do not change your task-solving behavior, business logic, or factual decision-making rules.
If multiple writing-rules blocks conflict, prefer the newer writing-rules blocks.
If a writing rule conflicts with a writing sample, follow the explicit writing rule while keeping the writing sample as the primary voice exemplar.

```

-   This pattern is relevant for all commitments, not only for `WRITING RULES`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)