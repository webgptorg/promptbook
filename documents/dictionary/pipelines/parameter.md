# Parameter

A **Parameter** is a named variable used within a [Pipeline](../core/pipeline.md) to store and pass data between different [Tasks](./task.md). Parameters are enclosed in curly braces, such as `{topic}` or `{result}`.

## Types of Parameters

1.  **Input Parameter**: Data provided by the user or an external system to start the pipeline.
2.  **Output Parameter**: The final result(s) produced by the pipeline.
3.  **Intermediate Parameter**: Data produced by one task and used as input for a subsequent task.

## Example

```book
# 📝 Content Creator

-   INPUT PARAMETER {raw_idea} The initial idea from the user
-   OUTPUT PARAMETER {final_post} The formatted social media post

## Refine Idea

```markdown
Expand this idea into a detailed outline: {raw_idea}
```

`-> {outline}`

## Write Post

```markdown
Write a LinkedIn post based on this outline: {outline}
```

`-> {final_post}`
```

In this example:
-   `{raw_idea}` is an **Input Parameter**.
-   `{outline}` is an **Intermediate Parameter**.
-   `{final_post}` is an **Output Parameter**.

## Parameters in Modern Agents

In modern [Agents](../core/agent.md), the concept of parameters is often abstracted away into a natural conversation. However, parameters are still used internally when an agent performs structured tasks or uses external tools.

## Related Concepts

-   [**Pipeline**](../core/pipeline.md)
-   [**Task**](./task.md)
-   [**Expectations**](./expect.md)
