# Read-only planning

[Main specification](../_main.md) · [Dictionary](../dictionary.md)

The currently supported planner harness is OpenAI Codex. Others must explicitly reject planning mode until they have equivalent capabilities. The Developer/Planner role does not change capability policy.

The model explores the project through a host-mediated read protocol and proposes PRDs rather than application patches. It must not launch a shell, write an application file or delegate that authority to a TEAM advisor. Only the primary planner proposes tasks, and only a user review/save action persists them. Allowed PRD changes have their own scoped commit; `plan` must not run the implementation queue.

Preserve conversational `/save` (ready), `/draft` (not-ready), `/discard` and `/exit`; EOF discards unsaved proposals while already-saved files remain. The user sees the exact path and content before a write; a concurrent source edit invalidates the preview. One inference has a 5-minute limit and 2 MiB output limit; unavailable read-only capability must cause planning to refuse execution rather than start an ordinary unrestricted execution runner.

## Related specifications

- [User and CLI contracts](cli.md)
- [Agent Books and context](agent-context.md)
- [TEAM consultations](team.md)
- [Coding harnesses](harnesses.md)
- [Change ownership and Git persistence](git-persistence.md)
