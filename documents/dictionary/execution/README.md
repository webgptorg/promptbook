# ⚙ Execution

**Execution** refers to the process of running a [Pipeline](../pipelines/README.md) or interacting with an [Agent](../agents/README.md). It involves taking inputs, processing them through LLM models according to the defined rules and structure, and producing outputs.

💡 Execution is where the static definitions in a `.book` file come to life.

## 📂 Key Execution Concepts

-   [**`ExecutionTools`**](./execution-tools.md) - The interface for performing actual LLM calls and other side effects.
-   [**`LLMExecutionTools`**](./llm-execution-tools.md) - Specialized tools for interacting with different LLM providers (OpenAI, Anthropic, etc.).
-   [**`UserInterfaceTools`**](./user-interface-tools.md) - Tools for interacting with the end user (e.g., via dialogs).
-   [**`ExecutionReport`**](./execution-report.md) - A detailed log of what happened during execution, including costs and performance metrics.
-   [**`Executor`**](./executor.md) - The function or object that orchestrates the execution process.
-   [**Remote Server**](./remote-server.md) - Running Promptbooks on a centralized server rather than locally.

## Example

```typescript
const pipeline = await library.getPipeline('my-pipeline');
const executor = createExecutor({ pipeline, tools });

const { outputParameters } = await executor({
    inputParameter1: 'value',
});
```

In this TypeScript example, an `executor` is created for a specific pipeline and then called with input data to produce results.

## 🛡 Reliability during Execution

Promptbook includes several mechanisms to ensure reliable execution:

-   **Retries**: Automatically retrying failed LLM calls.
-   **Validation**: Checking outputs against [Expectations](../concepts/expectations.md).
-   **Caching**: Reusing previous results to save time and money.
-   **Fallback**: Using alternative models if the primary one is unavailable.

## Related
- [🛤 Pipeline](../pipelines/README.md)
- [🤖 Agent](../agents/README.md)
- [📈 Execution Report](./execution-report.md)
