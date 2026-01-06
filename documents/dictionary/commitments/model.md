# 🤖 `MODEL`

The `MODEL` commitment (or command) specifies which Large Language Model (LLM) should be used for a particular [Agent](../agents/README.md) or [Template](../pipelines/template.md). Promptbook supports a wide range of models and providers through a unified interface.

💡 Choosing the right model is a balance between intelligence, speed, and cost.

## Usage

```book
MODEL [Model Name / Variant]
```

## Examples

### 🧠 High-Intelligence Agent
```book
Professor Hawking

PERSONA You are a brilliant theoretical physicist.
MODEL GPT-4o
```

### ⚡ Fast and Cheap Agent
```book
Quick Assistant

PERSONA You provide rapid answers to simple questions.
MODEL GPT-3.5-Turbo
```

### 🧪 Model Variants

Promptbook also supports generic "variants" that allow the [ExecutionTools](../execution/execution-tools.md) to choose the best available model for a specific task type:
-   `COMPLETION`: Standard text generation.
-   `CHAT`: Conversational models.
-   `EMBEDDING`: For vectorizing text (used in [🧠 Knowledge](../concepts/knowledge-rag.md)).

## Supported Providers

Through its extensibility, Promptbook can interact with models from:
-   **OpenAI**: GPT-4, GPT-3.5, etc.
-   **Anthropic**: Claude 3, Claude 2, etc.
-   **Google**: Gemini, Gemma, etc.
-   **Meta**: Llama 3, Llama 2, etc. (via various providers)
-   **Mistral**: Mistral, Mixtral, etc.
-   **Hugging Face**: Access to thousands of open-source models.
-   **Local Models**: Running via Ollama, LM Studio, etc.

## Context

In [Pipelines](../pipelines/README.md), the `MODEL` can be specified for each [Template](./template.md) individually. This allows you to use a cheaper model for simple steps and a more powerful model for complex reasoning. For [Agents](../agents/README.md), the `MODEL` is typically set globally for the entire agent's personality.

## Related
- [🤖 Agent](../agents/README.md)
- [📯 Template](../pipelines/template.md)
- [⚙ Execution Tools](../execution/execution-tools.md)
- [🧠 Knowledge](../concepts/knowledge-rag.md)
