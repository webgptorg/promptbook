# 🏗 `.book` File

The **`.book` file** is the standard source file format for Promptbook. It is a text file that uses a Markdown-like syntax to define [Agents](../agents/README.md), [Pipelines](../pipelines/README.md), [Commitments](../commitments/README.md), and [Templates](../pipelines/template.md).

💡 `.book` files are the "source code" of your AI application.

## Structure of a `.book` File

A typical `.book` file consists of several sections:

1.  **Header**: The title and general description.
2.  **Settings/Commands**: Global instructions like `- MODEL`, `- PERSONA`, etc.
3.  **Blocks**: Specific segments for [Commitments](../commitments/README.md) or prompt templates.

## Example (v2.0 - Agent focused)

```book
# 🕵️‍♂️ Sherlock Holmes

The world's only consulting detective.

- MODEL GPT-4o
- PERSONA You are Sherlock Holmes. You are highly observant, analytical, and somewhat socially detached.

--- book
KNOWLEDGE https://en.wikipedia.org/wiki/Sherlock_Holmes
RULE Never express emotions unless it's a cold, calculated part of the investigation.
RULE Always mention a "minor detail" that everyone else missed.
---
```

## Example (v1.0 - Pipeline focused)

```book
# 📧 Email Subject Generator

- MODEL GPT-4

Generate a subject line for the following email body: {emailBody}

- EXPECT MAX 10 WORDS

➔ `subjectLine`
```

## Why `.book`?

-   **Human Readable**: Can be easily read and edited by anyone, not just developers.
-   **Machine Parsable**: Can be compiled into a highly efficient JSON format for execution.
-   **Versionable**: Can be stored in Git and tracked just like any other source code.
-   **Interoperable**: Concepts like [Imports](./import.md) allow for complex logic to be shared across files.

## Related
- [🤖 Agent](../agents/README.md)
- [🛤 Pipeline](../pipelines/README.md)
- [🤝 Commitments](../commitments/README.md)
- [🏗 Structure](./README.md)
