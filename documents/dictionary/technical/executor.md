# Executor

The **Executor** is the engine within the Promptbook library responsible for carrying out the instructions defined in a [Book File](../core/book-file.md). It orchestrates the flow of data, calls the [LLM](../technical/llm.md), executes [Scripts](./script.md), and ensures that all [Expectations](../pipelines/expect.md) and [Rules](../commitments/rule.md) are met.

In Promptbook, there are two primary types of execution models:

## 1. PipelineExecutor (Legacy)

The `PipelineExecutor` is used to run [Pipelines](../core/pipeline.md). It follows a deterministic path:
-   It starts with the input [Parameters](../pipelines/parameter.md).
-   It executes each [Task](../pipelines/task.md) in the defined order.
-   It handles dependencies between tasks (one task using the output of another).
-   It returns the final output parameters.

## 2. AgentExecutor (Modern)

The `AgentExecutor` (often accessed via the `Agent` class) is used for modern [Agents](../core/agent.md). It is more dynamic and conversational:
-   It maintains the state of the conversation.
-   It applies the agent's [PERSONA](../commitments/persona.md) and [RULES](../commitments/rule.md) to every interaction.
-   It manages the agent's capabilities, such as [Browsing](../commitments/use-browser.md) or [Searching](../commitments/use-search-engine.md).
-   It can use [Knowledge](./scraping.md) sources to inform its responses.

## Responsibilities of an Executor

-   **Parameter Management**: Keeping track of values like `{topic}` or `{result}`.
-   **Model Selection**: Choosing the right [LLM Model](./model.md) for each task.
-   **Error Handling**: Retrying failed tasks or managing network issues.
-   **Logging**: Recording the execution process for debugging and [Usage tracking](./usage.md).

## Related Concepts

-   [**Pipeline**](../core/pipeline.md)
-   [**Agent**](../core/agent.md)
-   [**LLM**](./llm.md)
-   [**Task**](../pipelines/task.md)
