# Source syntax

[Book language](_index.md) · [Commitments](commitments/_index.md)

A Book is UTF-8 human-readable text. Ignore leading blank lines. **The first nonempty line is the entity's nonempty display name**; its normalized form is the only logical entity key. This applies equally to agents, tasks and chats. Do not derive identity from the filename, folder, an auto-generated opaque ID or a Git hash.

The canonical way to disambiguate document kind is `ENTITY AGENT`, `ENTITY TASK` or `ENTITY CHAT` after the name. In conventional `agents/`, `tasks/` and `chats/` locations the folder supplies the default kind when ENTITY is absent; a file elsewhere must be classifiable from an explicit ENTITY or existing legacy syntax. For backward compatibility, recognize the old initial `TASK <title>` spelling as a *task named <title>*, not literally named "TASK <title>"; preserve existing content and use the canonical header on intentional conversion. In legacy agent Books without an ENTITY, the unprefixed name remains valid. Conflicting location and ENTITY declarations, or an unclassifiable source, receive a diagnostic instead of guessed dispatch.

A commitment begins at the start of a line with a recognized uppercase keyword (possibly containing spaces), followed by content which may continue until the next commitment or end. Match the complete keyword: `TASK AGENT` or `CHAT MESSAGE` is not a new task/chat header. Natural prose outside commitments retains its meaning. Literal fenced text remains literal, including examples that look like commitments or references.

```book
Improve CSV export
ENTITY TASK

Preserve column names and quote cells with commas or newlines.
TASK AGENT @Developer
LINK {Discuss CSV requirements}
```

```book
Discuss CSV requirements
ENTITY CHAT
CHAT MEMBER @User
CHAT MEMBER @Developer
CHAT MESSAGE @User 2026-10-17T14:00:00+02:00
Can the export support multiline fields?
LINK {Improve CSV export}
```

Repeatable commitments accumulate in order; single-value controls must be unambiguous. FROM and OPEN/CLOSED are agent-only. Task work, chat turns and generic LINKS have their own contracts. Preserve natural text, source spelling, Unicode, attachments, metadata and literal blocks during mutation. Diagnostics identify a source and offending location. Unknown control commitments must not silently activate work or grant permission; preserve unknown descriptive material for round-tripping.
