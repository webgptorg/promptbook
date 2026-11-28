# Model

A **Model** (or AI Model) is a specific instance of a [Large Language Model (LLM)](./llm.md) from a provider like OpenAI, Anthropic, or Google. Each model has different capabilities, knowledge, performance characteristics, and costs.

In Promptbook, you can specify which model to use for a particular [Task](../pipelines/task.md) or for an entire [Agent](../core/agent.md).

## Common Models

-   **GPT-4o**: A high-performance, multimodal model from OpenAI.
-   **Claude 3.5 Sonnet**: A fast and capable model from Anthropic, known for its high-quality reasoning.
-   **Gemini 1.5 Pro**: A powerful model from Google with a massive context window.
-   **Llama 3**: An open-source model from Meta, often used for local or self-hosted deployments.

## Model Requirements

In Promptbook, you can define requirements for a model instead of just a name. This allows the system to choose the best available model based on criteria like:
-   **Variant**: `Chat` or `Completion`.
-   **Cost**: Low, Medium, or High.
-   **Speed**: Real-time or Batch.

## Example in a Book File

```book
Catherine Brown

PERSONA You are a professional architect.
MODEL NAME gpt-4o
```

## Related Concepts

-   [**LLM**](./llm.md)
-   [**Usage**](./usage.md)
-   [**Prompt**](./prompt.md)
-   [**Agent**](../core/agent.md)
