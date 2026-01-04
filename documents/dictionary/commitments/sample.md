# SAMPLE / EXAMPLE

The `SAMPLE` (or `EXAMPLE`) commitment provides few-shot examples to an [Agent](../core/agent.md) or a [Task](../pipelines/task.md). By showing the AI examples of the desired input and output, you can significantly improve the quality, formatting, and style of its responses.

## Purpose

While a [PERSONA](./persona.md) or [RULE](./rule.md) provides high-level instructions, `SAMPLE` provides concrete evidence of how those instructions should be applied. This is especially useful for complex formatting or specific creative styles.

## Example in an Agent Book

```book
Jan Zelený

PERSONA You are a helpful assistant speaking in a friendly Czech dialect.
SAMPLE
> Ahoj, jak se máš?
Nám se vede skvěle, díky za optání! Jak pak se vede tobě?
```

## Example in a Pipeline Task

```book
## Generate Product Description

-   PERSONA Marketing Expert
-   SAMPLE
    > {product_name: "EcoBottle", product_features: "Reusable, BPA-free, Stainless steel"}
    The EcoBottle is your perfect companion for sustainable hydration. Made from high-quality stainless steel and completely BPA-free, it's the last bottle you'll ever need to buy.
```

## Usage Guidelines

-   Provide multiple samples to show the variety of expected outputs.
-   Ensure the samples are consistent with the [PERSONA](./persona.md) and [RULES](./rule.md).
-   Use samples to demonstrate complex formatting like JSON, Markdown tables, or specific poetic meters.

## Related Concepts

-   [**Persona**](./persona.md)
-   [**Rule**](./rule.md)
-   [**Style**](./style.md)
-   [**Task**](../pipelines/task.md)
