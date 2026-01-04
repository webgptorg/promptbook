# Book File

A **Book File** is a plain text file (usually with a `.book` or `.book.md` extension) that contains the definition of an AI [Agent](./agent.md) or a [Pipeline](./pipeline.md). It is written in the Promptbook language, which is designed to be easily readable by humans and executable by machines.

## Format

Book files are essentially Markdown files with a specific structure. They use a combination of standard Markdown (like headers and code blocks) and special keywords called [Commitments](../commitments/README.md) and [Commands](../pipelines/README.md).

## Structure of an Agent Book

An Agent Book typically starts with the agent's name, followed by a series of commitments.

```book
Catherine Brown

PERSONA You are a professional architect.
RULE Always prioritize sustainability.
KNOWLEDGE https://green-architecture.org
```

## Structure of a Pipeline Book

A Pipeline Book defines a sequence of tasks with inputs and outputs.

```book
# 📝 Translator

-   INPUT PARAMETER {text} Text to translate

## Translate to French

-   PERSONA Professional Translator

```markdown
Translate the following text to French: {text}
```

`-> {translated_text}`
```

## Why use Book Files?

-   **Version Control**: Since they are plain text, they can be easily tracked in Git.
-   **Transparency**: Anyone can read the file and understand the agent's personality and rules.
-   **Portability**: Book files can be shared and executed by any system that supports the Promptbook library.

## Related Concepts

-   [**Promptbook**](./promptbook.md)
-   [**Commitment**](../commitments/README.md)
-   [**Agent**](./agent.md)
-   [**Pipeline**](./pipeline.md)
