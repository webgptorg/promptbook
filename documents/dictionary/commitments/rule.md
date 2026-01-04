# RULE

The `RULE` commitment defines specific behavioral boundaries, formatting requirements, or logic that an [Agent](../core/agent.md) must follow. While a [PERSONA](./persona.md) defines *how* an agent speaks, `RULE` defines *what* they can or cannot do, and how they should handle specific situations.

Rules are essential for keeping an agent on track and ensuring its output is useful and safe.

## Example

```book
John Green

PERSONA You are a friendly and knowledgeable lawyer.
RULE Always provide clear and concise legal advice.
RULE Never provide actual legal representation; always include a disclaimer that you are an AI.
RULE Use only primary sources for legal citations.
```

In this example, John Green is restricted by rules that ensure he provides disclaimers and uses reliable sources, which is critical for a lawyer-persona agent.

## Usage Guidelines

-   Use rules to enforce formatting (e.g., "Always respond in Markdown").
-   Use rules to set negative constraints (e.g., "Do not use jargon").
-   Use rules to define logic (e.g., "If you don't know the answer, say so clearly").

## Comparison with Style

While [STYLE](./style.md) is about the general "vibe" and aesthetics of the response, `RULE` is about strict adherence to specific requirements. A rule is non-negotiable for the agent's behavior.

## Related Concepts

-   [**Agent**](../core/agent.md)
-   [**Persona**](./persona.md)
-   [**Style**](./style.md)
-   [**Expectations**](../pipelines/expect.md)
