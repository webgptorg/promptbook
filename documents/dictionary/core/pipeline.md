# Pipeline

A **Pipeline** is the legacy version of Promptbook execution. It represents a structured sequence of [LLM](../technical/llm.md) calls, [scripts](../technical/script.md), and [data transformations](../technical/postprocessing.md). While modern development has shifted towards [Agents](./agent.md), Pipelines remain useful for highly deterministic tasks where every step of the process must be strictly controlled.

## Structure

A Pipeline is defined by:

-   **Input Parameters**: Data provided to start the pipeline (e.g., `{topic}`).
-   **Tasks**: Individual steps that perform an LLM call or a script.
-   **Output Parameters**: The final result produced by the pipeline (e.g., `{article}`).

## Example

```book
# 📝 Article Generator

This pipeline generates a short article based on a topic.

-   INPUT PARAMETER {topic} The subject of the article
-   OUTPUT PARAMETER {article} The generated article

## Generate Title

-   MODEL VARIANT Completion
-   MODEL NAME gpt-4o

```markdown
Suggest a catchy title for an article about {topic}.
```

`-> {title}`

## Write Body

-   MODEL VARIANT Chat
-   PERSONA Professional Writer

```markdown
Write a 300-word article about {topic} with the title: {title}.
```

`-> {article}`
```

In this legacy example, the pipeline takes a `{topic}`, generates a `{title}`, and then uses both to produce the final `{article}`.

## Modern Equivalent

In the modern [Agent](./agent.md) version, this would be represented by a single agent with a defined persona and task, rather than a multi-step pipeline.

## Related Concepts

-   [**Task**](../pipelines/task.md)
-   [**Parameter**](../pipelines/parameter.md)
-   [**Executor**](../technical/executor.md)
