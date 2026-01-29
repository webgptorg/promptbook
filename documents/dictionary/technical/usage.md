# Usage

**Usage** refers to the tracking and measurement of resources consumed during the execution of [Agents](../core/agent.md) or [Pipelines](../core/pipeline.md). This includes [LLM](../technical/llm.md) tokens, cost, and time spent. Promptbook provides detailed usage reports to help you monitor performance and manage expenses.

## What is Tracked?

-   **Tokens**: The number of input and output tokens used by the LLM.
-   **Cost**: The monetary cost of the LLM calls (calculated based on the specific [Model](./model.md) used).
-   **Time**: The duration of each task and the total execution time.
-   **Execution Attempts**: How many times a [Task](../pipelines/task.md) was retried (e.g., due to failing [Expectations](../pipelines/expect.md)).

## Usage Reports

After an agent or pipeline is executed, Promptbook can generate an `ExecutionReport`. This report provides a detailed breakdown of everything that happened during the execution, including:
-   The exact prompts sent to the LLM.
-   The results returned.
-   A summary of total tokens and costs.

## Importance

Tracking usage is critical for:
-   **Budgeting**: Understanding how much your AI features cost to run.
-   **Optimization**: Identifying slow or expensive tasks that could be improved.
-   **Debugging**: Seeing the raw data exchanged with the LLM providers.

## Related Concepts

-   [**LLM**](./llm.md)
-   [**Model**](./model.md)
-   [**Executor**](./executor.md)
-   [**Task**](../pipelines/task.md)
