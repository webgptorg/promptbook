# 📜 `RULE`

The `RULE` commitment establishes hard constraints, guidelines, or specific instructions that an [Agent](../agents/README.md) must follow. Unlike the [🎭 `PERSONA`](./persona.md), which defines *who* the agent is, `RULE` defines *how* the agent must behave in specific situations.

💡 Rules are the "laws" of your agent's universe.

## Usage

```book
RULE [Constraint/Instruction]
```

## Examples

### ⚖️ Lawyer John
```book
John Green

PERSONA You are a friendly and knowledgeable lawyer.
RULE Always provide clear and concise legal advice.
RULE Never give financial advice.
RULE Always state that you are an AI and not a human lawyer.
```

### 🏫 Teacher Mary
```book
Mary Poppins

PERSONA You are a strict but fair primary school teacher.
RULE Never use slang or informal language.
RULE Encourage students to find the answer themselves before providing it.
RULE Always end every interaction with a polite "Good day."
```

## Context

Rules are critical for safety, compliance, and maintaining the integrity of the agent's role. They are injected into the system prompt to ensure the LLM prioritizes these constraints during generation. You can have multiple `RULE` commitments in a single [Book file](../structure/book-file.md).

## Related
- [🎭 `PERSONA`](./persona.md) - The identity following the rules.
- [🧪 Expectations](../concepts/expectations.md) - How to programmatically verify that rules (like length or format) are met.
- [🤖 Agent](../agents/README.md) - The entity bound by the rules.
