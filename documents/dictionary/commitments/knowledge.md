# KNOWLEDGE

The `KNOWLEDGE` commitment provides an [Agent](../core/agent.md) with specific information sources that it can use to answer questions and perform tasks. This is a form of RAG (Retrieval-Augmented Generation), where the agent "looks up" information from the provided sources instead of relying solely on the training data of the [LLM](../technical/llm.md).

Knowledge can be provided as raw text, links to websites, or references to files.

## Example

```book
Catherine Brown

PERSONA You are a professional architect.
KNOWLEDGE https://sustainable-architecture-manual.com/
KNOWLEDGE
```text
The brand colors of GreenBuild are Emerald Green (#50C878) and Earth Brown (#5C4033).
```
```

In this example, Catherine has access to an online manual and specific brand color information that she wouldn't know otherwise.

## Types of Knowledge Sources

-   **URLs**: Links to websites or online documents.
-   **Text Blocks**: Direct text included in the [Book File](../core/book-file.md).
-   **Files**: References to local files (PDF, Markdown, etc.) that the Promptbook system will index.

## Benefits

-   **Reduced Hallucinations**: The agent can cite specific sources.
-   **Up-to-date Information**: You can link to live documentation.
-   **Specialized Expertise**: You can provide the agent with private or niche data.

## Related Concepts

-   [**Agent**](../core/agent.md)
-   [**USE BROWSER**](./use-browser.md)
-   [**Scraping**](../technical/scraping.md)
