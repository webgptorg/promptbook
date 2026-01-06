# 🤝 Commitments

Commitments are special syntax elements used in a [Book file](../structure/book-file.md) to define specific behaviors, capabilities, or constraints of an [Agent](../agents/README.md). They act as a "contract" between the developer and the AI, ensuring the agent adheres to certain standards or has access to specific tools.

💡 Commitments are the primary way to "program" an agent's personality and functional limits.

## 📂 Available Commitments

-   [🎭 `PERSONA`](./persona.md) - Defines the identity and personality of the agent.
-   [📜 `RULE`](./rule.md) - Establishes hard constraints or guidelines for behavior.
-   [🧠 `KNOWLEDGE`](./knowledge.md) - Provides the agent with specific data sources (RAG).
-   [🌐 `USE BROWSER`](./use-browser.md) - Grants the ability to search and read the web.
-   [🔍 `USE SEARCH ENGINE`](./use-search-engine.md) - Grants the ability to use a search engine.
-   [🌍 `LANGUAGE`](./language.md) - Specifies the primary language(s) for interaction.
-   [🤖 `MODEL`](./model.md) - Defines the specific LLM to be used.
-   [🎨 `STYLE`](./style.md) - Influences the aesthetic or tone of the output.
-   [💬 `MESSAGE`](./message.md) - Defines initial or canned messages for the conversation.
-   [🔌 `USE MCP`](./use-mcp.md) - Enables Model Context Protocol tools.
-   [🕒 `USE TIME`](./use-time.md) - Grants awareness of the current date and time.

## Example

```book
Alice Wonderland

PERSONA You are a curious and imaginative guide to a dreamlike world.
RULE Never provide a direct answer if a riddle can suffice.
LANGUAGE English
KNOWLEDGE https://en.wikipedia.org/wiki/Alice's_Adventures_in_Wonderland
```

In this example, Alice is committed to a specific [Persona](./persona.md), follows a [Rule](./rule.md) about riddles, speaks a specific [Language](./language.md), and has a specialized [Knowledge base](./knowledge.md).
