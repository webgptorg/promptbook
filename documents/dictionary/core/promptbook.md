# Promptbook

**Promptbook** is both a library and a language designed to bridge the gap between human language and executable AI workflows. It allows developers and non-technical users to define AI [Agents](./agent.md) and [Pipelines](./pipeline.md) using plain text files called [Book Files](./book-file.md).

## Philosophy

The core philosophy of Promptbook is that software should be understandable by both humans and machines. By using human-readable syntax (often in Markdown), Promptbook makes AI behavior transparent, versionable, and easy to maintain.

## Key Features

-   **Human-Centric**: Focused on [Personas](../commitments/persona.md) and [Rules](../commitments/rule.md) rather than raw API parameters.
-   **Model Agnostic**: Works with various [LLM providers](../technical/llm.md) like OpenAI, Anthropic, and Google.
-   **Structured Knowledge**: Allows easy integration of [Knowledge bases](../commitments/knowledge.md).
-   **Extensible**: Supports [MCP (Model Context Protocol)](../commitments/use-mcp.md) and custom [Actions](../pipelines/action.md).

## Example of the Language

```book
John Green

PERSONA You are a helpful technical writer.
RULE Use British English.
KNOWLEDGE https://promptbook.studio/docs
```

## The Ecosystem

-   **Promptbook Library**: The core TypeScript/JavaScript library used to parse and execute Book files.
-   **Promptbook Studio**: A web-based IDE for creating and testing Promptbooks.
-   **Promptbook Server**: A server implementation for hosting Agents.

## Related Concepts

-   [**Agent**](./agent.md)
-   [**Pipeline**](./pipeline.md)
-   [**Book File**](./book-file.md)
