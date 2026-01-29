# Joker

A **Joker** is a special syntax used in legacy [Pipelines](../core/pipeline.md) to handle cases where a [Task](./task.md) might fail or produce an unsatisfactory result. It provides a way to define a "fallback" or a different path of execution when certain conditions are met.

## Purpose

The Joker command is used to make pipelines more robust by:
-   Providing a default value if an LLM fails to generate a response.
-   Trying a different [Model](../technical/model.md) if the first one fails.
-   Executing a different task if a certain [Expectation](./expect.md) is not met.

## Example in a Book File

```book
## Generate Summary

-   PERSONA Professional Editor
-   EXPECT MIN 10 Words
-   JOKER "No summary available for this content."

```markdown
Provide a summary of the following text: {input_text}
```

`-> {summary}`
```

In this example, if the LLM fails to generate a summary that is at least 10 words long, the `{summary}` parameter will be set to the Joker value: `"No summary available for this content."`.

## Joker in Modern Agents

In modern [Agents](../core/agent.md), error handling is often more dynamic. An agent might realize it has failed a task and try a different approach or ask the user for clarification. However, the concept of a "fallback" remains important in the underlying execution logic.

## Related Concepts

-   [**Expectation**](./expect.md)
-   [**Task**](./task.md)
-   [**Pipeline**](../core/pipeline.md)
-   [**Executor**](../technical/executor.md)
