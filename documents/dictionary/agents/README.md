# 🤖 Agents

An **Agent** is a high-level abstraction in Promptbook that represents an autonomous or semi-autonomous AI entity. Unlike a raw LLM or a simple [Pipeline](../pipelines/README.md), an agent possesses a [Persona](../commitments/persona.md), follows [Rules](../commitments/rule.md), and has access to [Knowledge](../commitments/knowledge.md) and tools.

💡 Agents are designed to be "sticky" - they maintain a personality and purpose across multiple interactions.

## 🧱 Components of an Agent

An agent is typically defined in a [Book file](../structure/book-file.md) and consists of:

-   **Name**: A human-friendly identifier (e.g., "John Green").
-   [**Commitments**](../commitments/README.md): The core definitions of its behavior and capabilities.
-   **State**: (Optional) Persistent memory or context from previous interactions.

## Example

```book
Catherine Brown

PERSONA You are a meticulous editor for a high-end fashion magazine.
RULE Never use the word "basic" to describe clothing.
RULE Always suggest at least one accessory.
KNOWLEDGE https://vogue.com/
USE BROWSER
```

In this example, Catherine Brown is an agent specializing in fashion editing. She has a clear [Persona](../commitments/persona.md), strict [Rules](../commitments/rule.md), a specific [Knowledge base](../commitments/knowledge.md), and the ability to [Use the browser](../commitments/use-browser.md) to stay updated on trends.

## 🔄 Agents vs. Pipelines

| Feature | [Pipeline](../pipelines/README.md) | Agent |
| :--- | :--- | :--- |
| **Focus** | Input ➔ Process ➔ Output | Personality & Interaction |
| **State** | Mostly Stateless | Stateful / Personality-driven |
| **Complexity** | Chained LLM calls | High-level abstraction |
| **Analogy** | A factory assembly line | A professional consultant |

## 🚀 Creating an Agent

Agents are created by writing a [Book file](../structure/book-file.md) (v2.0+) and registering them with an `AgentsServer`.

## Related
- [🤝 Commitments](../commitments/README.md)
- [🏗 Book File](../structure/book-file.md)
- [🛤 Pipelines](../pipelines/README.md)
