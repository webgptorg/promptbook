# 📯 `TEMPLATE`

A **Template** (also known as a Prompt Template or Section) is the fundamental unit of work within a [Pipeline](../pipelines/README.md). It defines a single prompt to be sent to an LLM, along with the specific model to use, any [Expectations](../concepts/expectations.md), [Postprocessing](../concepts/postprocessing.md) rules, and the [Parameter](./parameter.md) where the result should be stored.

💡 Templates are the building blocks of a pipeline's logic.

## Structure of a Template

In a [Book file](../structure/book-file.md), a template is defined under a secondary heading (`##`).

```book
## [Template Name]

[Optional Description]

- [Command 1]
- [Command 2]

[Prompt Text with {parameters}]

➔ `[resultParameterName]`
```

## Example

```book
## 🍳 Summarize Recipe

Create a short, one-sentence summary of the following recipe: {recipeText}

- MODEL GPT-4
- EXPECT MAX 1 sentence
- POSTPROCESS trim

➔ `recipeSummary`
```

## How it Works

1.  **Preparation**: The template's prompt text is filled with the current values of any [Parameters](./parameter.md) it uses.
2.  **Execution**: The prompt is sent to the specified LLM `MODEL`.
3.  **Validation**: The output is checked against any `EXPECT` commands.
4.  **Refinement**: The output is modified by any `POSTPROCESS` commands.
5.  **Storage**: The final result is stored in the `resultParameterName` (denoted by `➔`).

## Context in Agents

In the [Agent](../agents/README.md) paradigm, the concept of a template is replaced by the agent's overall behavior definition. However, an agent can still use templates internally for specific tasks, such as summarizing a long [Knowledge](../commitments/knowledge.md) base or formatting a final response.

## Related
- [🛤 Pipeline](../pipelines/README.md)
- [🤖 Agent](../agents/README.md)
- [📋 Parameter](./parameter.md)
- [🧪 Expectations](../concepts/expectations.md)
- [✂ Postprocessing](../concepts/postprocessing.md)
