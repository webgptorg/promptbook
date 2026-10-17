# ENTITY

[Commitments](_index.md) · [Syntax](../syntax.md)

**Document:** Agent, task or chat.

`ENTITY AGENT`, `ENTITY TASK` and `ENTITY CHAT` explicitly identify the kind of the Book whose first nonempty line is its name. Exactly one kind applies; a conventional source directory may supply the default when this commitment is absent. ENTITY is not part of the name or a separate ID. Conflicting declarations are diagnosed. See [source syntax](../syntax.md).
