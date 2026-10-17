# Legacy Markdown task compatibility

[Main specification](../_main.md) · [Name-based identity](task-identity.md)

Canonical Agent, Task and Chat entities are `.book` files. Legacy top-level `.md` task sections in `prompts/` remain readable and runnable through a compatibility adapter until deliberately converted; they are not a fourth entity kind. Ignore README, templates, archives, evidence, assets and `<!--ptbk-coder-ignore-->`; a standalone `---` separates sections.

Each section's displayed task title supplies its normalized task **name** and uses the same deterministic lookup/duplicate diagnostic contract. A repeated title can be shadowed; it must not silently attach one section's results to another. Do not generate separate task IDs. An existing `<!-- ptbk-task-id: ... -->` comment is optional **legacy metadata only**: it never overrides the name or status and new sections do not write it.

The first nonempty control line, not checkboxes in descriptions, sets state: `[ ]` or absent means unfinished; `[-]`/`[.]` not ready; `[^]` recovery; `[x]`/`[X]` complete; `[!]` failed. `@@@` is an authoring placeholder. Exclamation marks in control metadata indicate priority; non-time backtick selectors choose compatible agent/harness/model alternatives; date tokens set earliest start. Preserve description, selectors, dates, assets and completion information.

The result updates the correctly resolved section with its checkmark, accepted changes and policy-eligible traces in **one task commit**. Verify original source/revision before writing; section index alone is never identity. Conversion through [migration](migration.md) must preserve provenance without two runnable copies. New work prefers [Task Books](task-books.md).
