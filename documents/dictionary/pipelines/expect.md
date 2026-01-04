# Expectation

**Expectations** are a mechanism used within [Pipelines](../core/pipeline.md) to validate the output of a [Task](./task.md). They allow you to define constraints on the generated text, ensuring that the results meet specific quality or formatting standards.

If a task's output does not meet the defined expectations, the [Executor](../technical/executor.md) can automatically retry the task or report an error.

## Common Expectation Keywords

-   `EXPECT MIN X Words/Characters/Lines`: Ensures the output is long enough.
-   `EXPECT MAX X Words/Characters/Lines`: Ensures the output is not too long.
-   `EXPECT EXACTLY X Words/Characters/Lines`: Ensures the output has a specific length.
-   `EXPECT JSON`: Ensures the output is a valid JSON string.

## Example

```book
## Write a Catchy Headline

-   PERSONA Copywriter
-   EXPECT MIN 3 Words
-   EXPECT MAX 10 Words

```markdown
Write a headline for a new organic coffee brand.
```

`-> {headline}`
```

In this example, if the LLM generates a headline that is only 2 words long (e.g., "Organic Coffee"), the expectation will fail, and the system will try again.

## Expectations in Modern Agents

In modern [Agents](../core/agent.md), expectations are often defined as [Rules](../commitments/rule.md) (e.g., `RULE Your response must be shorter than 50 words`). However, the structured `EXPECT` syntax is still supported for tasks that require strict validation.

## Related Concepts

-   [**Task**](./task.md)
-   [**Pipeline**](../core/pipeline.md)
-   [**Rule**](../commitments/rule.md)
