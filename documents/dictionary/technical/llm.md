# LLM (Large Language Model)

A **Large Language Model (LLM)** is the underlying AI engine that powers [Agents](../core/agent.md) and [Pipelines](../core/pipeline.md). These models (such as GPT-4, Claude, or Llama) are trained on vast amounts of text data and can generate human-like text, follow instructions, and perform complex reasoning.

In Promptbook, the LLM is treated as a service provider that handles the actual processing of [Prompts](./prompt.md).

## How it works in Promptbook

Promptbook acts as an orchestration layer on top of the LLM. Instead of writing complex code to interact with an LLM's API, you define high-level [Commitments](../commitments/README.md) and [Rules](../commitments/rule.md) in a [Book File](../core/book-file.md). Promptbook then translates these into optimized prompts and handles the communication with the LLM provider.

## Key Providers

-   **OpenAI**: GPT-4o, GPT-3.5 Turbo.
-   **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus.
-   **Google**: Gemini Pro.
-   **Meta**: Llama 3 (via various providers).

## LLM Tools

To interact with these models, Promptbook uses `LlmExecutionTools`. These tools provide a unified interface for calling different models, handling errors, and tracking [Usage](./usage.md).

## Related Concepts

-   [**Model**](./model.md)
-   [**Prompt**](./prompt.md)
-   [**Executor**](./executor.md)
-   [**Usage**](./usage.md)
