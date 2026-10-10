# Book language

[Main specification](../_main.md)

Book is a human-readable language of natural text and commitments. It describes both a persistent agent (who works and why) and a bounded task (what work to do).

An agent starts with its name on the first nonempty line. A task starts with `TASK <title>` on that line. The two document kinds share notation, not identity, default inheritance or runtime purpose.

- [Syntax](syntax.md): Source structure, text, literal content and commitment boundaries.
- [References](references.md): Normalized agent names and stable task references.
- [Inheritance](inheritance.md): FROM, implicit Adam and termination.
- [Commitments](commitments/_index.md): One file per canonical commitment, with aliases in that same file.

[Agents](../agents/_index.md) describes role categories and learning. [Task Books](../cli/task-books.md) describes execution-facing task semantics. The language specifies observable meaning and readable source, not parser classes or an internal representation.
