# Prompt

A **Prompt** is the actual piece of text sent to an [LLM](../technical/llm.md) to generate a response. In Promptbook, prompts are rarely written as raw strings in code. Instead, they are defined within [Book Files](../core/book-file.md) and can contain [Parameters](../pipelines/parameter.md).

## Structure

A prompt in Promptbook typically consists of:
1.  **Context**: Information about the [PERSONA](../commitments/persona.md), [RULES](../commitments/rule.md), and [KNOWLEDGE](../commitments/knowledge.md).
2.  **Instruction**: The specific task the LLM should perform.
3.  **Data**: The actual content or parameters the LLM should process.

## Example in a Book File

```markdown
## Summarize Article

```markdown
Please provide a summary of this article:

{article_text}

Summary requirements:
-   Max 3 bullet points
-   Professional tone
```
```

## Prompt Engineering

Promptbook automates many aspects of "prompt engineering." When a [Task](../pipelines/task.md) is executed, Promptbook automatically assembles the final prompt by combining the persona description, the rules, and the task body, ensuring that the LLM has all the necessary context to provide a high-quality response.

## Related Concepts

-   [**LLM**](../technical/llm.md)
-   [**Task**](../pipelines/task.md)
-   [**Parameter**](../pipelines/parameter.md)
-   [**Book File**](../core/book-file.md)
