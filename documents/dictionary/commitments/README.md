# Commitments

Commitments are the primary way to define the behavior, personality, and capabilities of a modern [Agent](../core/agent.md) in Promptbook. They are included in the agent's source code (the [Book File](../core/book-file.md)) and serve as instructions for the [LLM](../technical/llm.md) and the Promptbook execution engine.

## Identity & Personality

-   [**PERSONA**](./persona.md) - Defines who the agent is and how they speak.
-   [**RULE**](./rule.md) - Sets boundaries and specific behavioral requirements.

## Knowledge & Data

-   [**KNOWLEDGE**](./knowledge.md) - Provides the agent with external information sources.
-   [**MEMORY**](./memory.md) - Allows the agent to remember information across conversations.

## Capabilities (USE)

-   [**USE BROWSER**](./use-browser.md) - Grants the ability to access the live web.
-   [**USE SEARCH ENGINE**](./use-search-engine.md) - Grants the ability to search for information.
-   [**USE TIME**](./use-time.md) - Allows the agent to know the current date and time.
-   [**USE MCP**](./use-mcp.md) - Connects the agent to external tools via the Model Context Protocol.

## Presentation & Metadata

-   [**META COLOR**](./meta-color.md) - Defines the visual theme for the agent.
-   [**META IMAGE**](./meta-image.md) - Specifies an avatar for the agent.
-   [**META LINK**](./meta-link.md) - Provides relevant links for the agent's profile.

## Guidance & Examples

-   [**SAMPLE / EXAMPLE**](./sample.md) - Provides few-shot examples of desired input/output behavior.
-   [**STYLE**](./style.md) - Fine-tunes the tone and formatting of the responses.
