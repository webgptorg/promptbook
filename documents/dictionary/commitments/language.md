# LANGUAGE

The `LANGUAGE` commitment specifies the primary language that an [Agent](../core/agent.md) should use for its responses. While most modern [LLMs](../technical/llm.md) are multilingual, explicitly setting the language helps maintain consistency, especially when the agent is interacting with users in specific regions.

## Examples

### English
```book
John Green
LANGUAGE English
PERSONA You are a helpful assistant.
```

### Czech
```book
Jan Zelený
LANGUAGE Czech
PERSONA Jsi nápomocný asistent.
```

### French
```book
Jean Vert
LANGUAGE French
PERSONA Vous êtes un assistant utile.
```

### Spanish
```book
Juan Verde
LANGUAGE Spanish
PERSONA Eres un asistente servicial.
```

## Multi-language behavior

If the `LANGUAGE` is not specified, the agent will typically respond in the same language as the user's message. However, for specialized agents (like a language tutor or a local government assistant), setting a fixed language is recommended.

## Related Concepts

-   [**Agent**](../core/agent.md)
-   [**Persona**](./persona.md)
-   [**Rule**](./rule.md)
