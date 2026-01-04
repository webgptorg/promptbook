# MEMORY

The `MEMORY` commitment allows an [Agent](../core/agent.md) to store and retrieve information across different conversations or sessions with the same user. This enables the agent to remember user preferences, past interactions, and specific facts mentioned previously, creating a more personalized and coherent experience.

## Example

```book
Catherine Brown

PERSONA You are a professional architect.
MEMORY
RULE Always check memory for the user's previously mentioned preferred building materials.
```

In this example, if a user previously mentioned they prefer "recycled timber," Catherine will remember this in future conversations and prioritize timber in her architectural suggestions.

## How it Works

When an agent is configured with `MEMORY`, the Promptbook system:
1.  **Stores** key information from the conversation into a persistent storage (like a database or a local file).
2.  **Retrieves** relevant memories at the start of a new session or when specifically requested by the agent.
3.  **Updates** memories as new information becomes available.

## Benefits

-   **Personalization**: Tailor responses to the specific user.
-   **Continuity**: Long-term interactions feel more natural and less repetitive.
-   **Efficiency**: The user doesn't have to repeat themselves.

## Related Concepts

-   [**Agent**](../core/agent.md)
-   [**Knowledge**](./knowledge.md)
-   [**Persona**](./persona.md)
