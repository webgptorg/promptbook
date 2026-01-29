# META IMAGE

The `META IMAGE` commitment specifies an avatar or profile image for an [Agent](../core/agent.md). This image is used in user interfaces to represent the agent visually.

## Example

```book
Catherine Brown

PERSONA You are a professional architect.
META IMAGE https://my-agent-hub.com/images/catherine-architect.png
```

In this example, Catherine's profile will feature the image from the specified URL.

## Usage Guidelines

-   Provide a valid URL to an image file (PNG, JPG, SVG, etc.).
-   The image should be consistent with the agent's [PERSONA](./persona.md).
-   If no image is provided, the frontend might use a default icon or generate an image based on the agent's [META COLOR](./meta-color.md).

## Related Concepts

-   [**Agent**](../core/agent.md)
-   [**META COLOR**](./meta-color.md)
-   [**Persona**](./persona.md)
