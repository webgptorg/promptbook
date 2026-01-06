# 🧪 Expectations

**Expectations** are a core concept in Promptbook used to define and validate the desired output of an LLM. They act as a quality control mechanism, ensuring that the generated text meets specific criteria before being accepted or passed to the next step.

💡 Expectations allow you to programmatically verify natural language outputs.

## Usage in Pipelines

In [Pipelines](../pipelines/README.md), expectations are defined using the `EXPECT` command within a template section.

```book
## Write a Summary

Summarize the following text: {text}

- EXPECT MIN 10 WORDS
- EXPECT MAX 50 WORDS
- EXPECT EXACTLY 1 SENTENCE
```

## Types of Expectations

-   **Length**: `MIN`, `MAX`, `EXACTLY` applied to `WORDS`, `CHARACTERS`, `SENTENCES`, `LINES`, `PARAGRAPHS`.
-   **Format**: `JSON`, `MARKDOWN`, `XML`.
-   **Content**: `CONTAINS`, `STARTS WITH`, `ENDS WITH`.
-   **Regex**: Matching against a regular expression.

## 🔄 Expectation-Aware Generation

Some modern LLM execution tools are "expectation-aware." This means if a generated output fails an expectation, the tool can automatically:
1.  **Retry**: Call the LLM again to get a different result.
2.  **Repair**: Provide the error message back to the LLM and ask it to fix the output.

## Context in Agents

For [Agents](../agents/README.md), expectations are often used in conjunction with [📜 Rules](../commitments/rule.md) to ensure that the agent's responses adhere to specific structural or length constraints.

## Related
- [🛤 Pipeline](../pipelines/README.md)
- [🤖 Agent](../agents/README.md)
- [📜 Rule](../commitments/rule.md)
- [✂ Postprocessing](./postprocessing.md)
