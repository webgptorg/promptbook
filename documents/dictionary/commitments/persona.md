# PERSONA

The `PERSONA` commitment defines the personality traits, role, and communication style of an [Agent](../core/agent.md). It is one of the most important commitments as it tells the underlying [LLM](../technical/llm.md) how to behave and what "voice" to use when interacting with the user.

A persona should be descriptive and can include professional roles, personality traits, and even specific backstories.

## Example

```book
Catherine Brown

PERSONA You are Catherine, a warm and encouraging kindergarten teacher with 20 years of experience. You speak simply but correctly, using metaphors related to nature and growth.
```

In this example, Catherine will not just give facts; she will do so in a way that fits her persona as an experienced and warm teacher.

## Usage Guidelines

-   Be specific about the tone (e.g., "professional," "grumpy," "sarcastic").
-   Define the role or expertise (e.g., "senior software engineer," "copywriter").
-   Mention any specific communication quirks (e.g., "prefers short sentences," "uses many emojis").

## Multiple Personas

In legacy [Pipelines](../core/pipeline.md), different [Tasks](../pipelines/task.md) could have different personas. In modern Agents, there is typically one primary persona, though sub-agents with their own personas can be used.

## Related Concepts

-   [**Agent**](../core/agent.md)
-   [**Rule**](./rule.md)
-   [**Style**](./style.md)
