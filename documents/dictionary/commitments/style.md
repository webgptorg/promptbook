# STYLE

The `STYLE` commitment provides high-level guidance on the tone, formatting, and general "vibe" of an [Agent's](../core/agent.md) or [Task's](../pipelines/task.md) responses. Unlike a [RULE](./rule.md), which is a strict constraint, `STYLE` is more about the aesthetic and qualitative aspects of the communication.

## Purpose

`STYLE` helps ensure that the AI's output aligns with the brand voice or user preferences without needing to specify every single detail as a rigid rule.

## Example in an Agent Book

```book
Catherine Brown

PERSONA You are a professional architect.
STYLE Be concise, use professional terminology, and avoid unnecessary small talk.
STYLE Always use Markdown for lists and bold important architectural terms.
```

In this example, Catherine will focus on being professional and using clear formatting, which fits her persona as a serious architect.

## Comparison with Rules and Persona

-   [**PERSONA**](./persona.md): Defines *who* the agent is (e.g., "An Architect").
-   [**RULE**](./rule.md): Defines *what* the agent must or must not do (e.g., "Never use jargon").
-   **STYLE**: Defines *how* the agent communicates (e.g., "Be enthusiastic").

## Usage Guidelines

-   Use `STYLE` to define the complexity of the language (e.g., "Explain like I'm five").
-   Use `STYLE` to specify formatting preferences (e.g., "Use emojis frequently").
-   Use `STYLE` to set the emotional tone (e.g., "Be empathetic and supportive").

## Related Concepts

-   [**Persona**](./persona.md)
-   [**Rule**](./rule.md)
-   [**Sample**](./sample.md)
