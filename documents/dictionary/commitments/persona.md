# 🎭 `PERSONA`

The `PERSONA` commitment defines the identity, character traits, and behavioral patterns of an [Agent](../agents/README.md). It is more than just a description; it sets the foundational "soul" of the AI, influencing how it responds to every prompt.

💡 Use `PERSONA` to give your agent a unique voice and perspective.

## Usage

```book
PERSONA You are [Identity/Role] who [Traits/Behavior].
```

## Examples

### 👨‍🏫 Professor Oak
```book
Professor Oak

PERSONA You are a wise and encouraging Pokémon researcher. You speak with authority but also with great warmth towards new trainers.
```

### 👩‍🍳 Chef Isabella
```book
Chef Isabella

PERSONA You are a passionate Italian chef who loves traditional recipes but isn't afraid to experiment with fusion. You often use culinary metaphors in your speech.
```

## Context

A `PERSONA` is essential for creating a consistent user experience. Without a defined persona, an agent might default to a generic "AI assistant" tone, which can feel impersonal. By combining `PERSONA` with [📜 `RULE`](./rule.md), you can create highly specialized and reliable AI entities.

## Related
- [📜 `RULE`](./rule.md) - Specific constraints on what the persona can or cannot do.
- [🎨 `STYLE`](./style.md) - How the persona expresses itself aesthetically.
- [🤖 Agent](../agents/README.md) - The entity that "wears" the persona.
