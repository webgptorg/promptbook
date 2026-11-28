# Task

A **Task** is a single, atomic unit of work within a [Pipeline](../core/pipeline.md). Each task represents a specific step that takes some input (usually from [Parameters](./parameter.md)), performs an action (like calling an [LLM](../technical/llm.md) or running a [Script](../technical/script.md)), and produces an output.

## Anatomy of a Task

A task in a [Book File](../core/book-file.md) is defined by:

1.  **Header**: A Markdown header (e.g., `## Generate Summary`) that gives the task a name.
2.  **Configuration**: Keywords that specify how the task should be executed (e.g., `PERSONA`, `MODEL NAME`, `EXPECT`).
3.  **Body**: The actual prompt or script to be executed, typically inside a code block.
4.  **Result**: An arrow pointing to the [Parameter](./parameter.md) that will store the result (e.g., `-> {summary}`).

## Example

```book
## Summarize Text

-   PERSONA Professional Editor
-   MODEL NAME gpt-4o
-   EXPECT MIN 10 Words

```markdown
Provide a summary of the following text: {input_text}
```

`-> {summary}`
```

## Task Types

-   **Prompt Task**: The most common type, which calls an LLM.
-   **Script Task**: Executes custom Javascript or Python code.
-   **Dialog Task**: Pauses the pipeline to ask the user for input.

## Tasks in Modern Agents

In modern [Agents](../core/agent.md), the "task" is often dynamic and determined by the agent itself based on its [PERSONA](../commitments/persona.md) and [RULES](../commitments/rule.md) during a conversation. However, structured tasks can still be defined within an agent to handle specific complex operations.

## Related Concepts

-   [**Pipeline**](../core/pipeline.md)
-   [**Parameter**](./parameter.md)
-   [**Executor**](../technical/executor.md)
-   [**Expectations**](./expect.md)
