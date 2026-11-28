# 🏗 Structure

The **Structure** of a Promptbook defines how logic, metadata, and AI behaviors are organized within source files. Promptbook uses a human-readable, Markdown-inspired format that allows for both natural language descriptions and technical commands.

💡 The structure is designed to be readable by humans and parsable by machines.

## 📂 Core Structural Elements

-   [**`.book` File**](./book-file.md) - The primary file format for defining agents and pipelines.
-   [**Heading**](./heading.md) - Used to name the book or define sections/templates.
-   [**Command**](./command.md) - Specific instructions (starting with `-`) that define capabilities (e.g., `- MODEL GPT-4`).
-   [**Block**](./block.md) - A segment of text or code, such as a prompt template or a [Commitment](../commitments/README.md).
-   [**Import**](./import.md) - Reusing logic from other `.book` files or external sources.
-   [**Scope**](./scope.md) - Defining where parameters and rules are applicable.

## Example Structure

```book
# My Awesome Agent

General description of the agent.

- MODEL GPT-4
- PERSONA A helpful assistant.

## First Template

- EXPECT MIN 10 WORDS

Prompt text goes here...

➔ `resultParameter`
```

In this example, the structure includes a top-level **Heading** for the agent name, followed by global **Commands**, and then a section for a specific template.

## 🔄 Versions

The structure has evolved from v1.0 (Pipeline-focused) to v2.0 (Agent-focused). v2.0 introduces the concept of blocks for [Commitments](../commitments/README.md) and a more flexible organizational model.

## Related
- [🤖 Agent](../agents/README.md)
- [🛤 Pipeline](../pipelines/README.md)
- [🤝 Commitments](../commitments/README.md)
