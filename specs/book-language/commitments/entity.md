# ENTITY (historical declaration)

[Commitments](_index.md) · [Syntax](../syntax.md) · [Migration](../../cli/migration.md)

**Status:** Legacy conversion documentation, not a canonical commitment.

Earlier sources used an unprefixed first-line name followed by `ENTITY AGENT`, `ENTITY TASK` or `ENTITY CHAT`; some relied on conventional source directories instead. Canonical Books now start with `AGENT <name>`, `TASK <name>` or `CHAT <name>`. The opening commitment supplies both kind and name using the same grammar as every subsequent commitment.

An explicit conversion preserves the existing name, contents, links and history, moves kind into the opening declaration and removes the redundant ENTITY line. Do not append a fresh date/time merely because an existing entity's syntax is being migrated. Ambiguous legacy kind or contradictory declarations require a diagnostic, not guessing. Read-only discovery never rewrites a legacy source, and ENTITY cannot override a canonical opening declaration.
