# Source syntax

[Book language](_index.md) · [Commitments](commitments/_index.md)

Book source is UTF-8 natural-language text. Ignore leading empty lines for document identification. An agent's first nonempty line is its nonempty name. A task's first nonempty line is `TASK` followed by its nonempty title; a later TASK declaration does not turn an agent into a task.

A commitment begins at the start of a line with a recognized uppercase keyword, possibly containing spaces, followed by its content. Match the complete keyword: `TASK AGENT` and `TASK DONE` are not new TASK declarations. Content may continue on following lines until the next commitment or end of the document. Natural prose outside commitments remains meaningful instruction/description.

```book
Developer

Help maintain this project's software.
GOAL Keep the product useful and maintainable.
TEAM For legal questions, consult @Lawyer. For missing intent, ask @User.
OPEN Learn useful knowledge, but do not change my rules.
```

Fenced literal/code content is preserved as text and does not execute embedded commitment-looking lines. Editing or migration must preserve the payload rather than reinterpret examples as control fields. Diagnostics identify the file, line and conflicting or unsupported control.

Repeatable instruction commitments accumulate in source order. Single-value control commitments must have one unambiguous effective value. FROM names one parent. An agent's own OPEN or CLOSED declaration is last, if present; neither is required for the default open state. A task has no learning policy of its own.

Unknown task control commitments must not be silently ignored to make work runnable. Preserve unrecognized descriptive metadata on round-trip without claiming it has an implemented capability. The language's uppercase notation does not make arbitrary prose a new feature.
