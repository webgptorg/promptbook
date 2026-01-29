# Agent

An **Agent** is a high-level abstraction in the modern version of Promptbook. Unlike a raw [LLM](../technical/llm.md) or a [Pipeline](./pipeline.md), an Agent is defined by its personality, knowledge base, and behavioral rules. Agents are designed to interact with users and external systems in a way that feels consistent and specialized.

Agents are defined in [Book Files](./book-file.md) using a set of [Commitments](../commitments/README.md).

## Characteristics

-   **Persona**: Every agent has a defined [personality](../commitments/persona.md), such as a "Friendly Lawyer" or a "Grumpy Programmer."
-   **Knowledge**: Agents can be provided with specific [knowledge bases](../commitments/knowledge.md) (files, websites, or direct text) to inform their responses.
-   **Capabilities**: Agents can be granted special abilities through [USE commitments](../commitments/use.md), such as [browsing the web](../commitments/use-browser.md) or [using a calculator](../technical/tools.md).
-   **Consistency**: Through [Rules](../commitments/rule.md), an agent's behavior is kept within desired boundaries.

## Example

```book
Catherine Brown

PERSONA You are a professional architect specializing in sustainable design.
RULE Always prioritize ecological impact in your suggestions.
USE SEARCH ENGINE
KNOWLEDGE https://sustainable-architecture-manual.com/
```

In this example, "Catherine Brown" is an agent who acts as a specialized architect. She has access to a specific manual and can search the web for the latest green building materials.

## Related Concepts

-   [**Persona**](../commitments/persona.md)
-   [**Knowledge**](../commitments/knowledge.md)
-   [**Rule**](../commitments/rule.md)
-   [**Book File**](./book-file.md)
