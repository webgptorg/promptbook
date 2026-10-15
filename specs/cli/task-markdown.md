# Markdown task support

[Main specification](../_main.md)

Markdown tasks remain supported alongside task Books through the same queue and execution lifecycle. Read top-level `.md` files in `prompts/`; ignore README, templates, archives, traces, assets and files containing `<!--ptbk-coder-ignore-->`. A standalone `---` divides task sections.

The first nonempty control line determines a section's state, not checklists in its description. `[ ]` or no marker is unfinished; `[-]`/`[.]` means not ready; `[^]` requires recovery; `[x]`/`[X]` is complete; `[!]` is failed. Authoring placeholder `@@@` prevents execution. An emoji in a title is not a status.

Each section has a stable [task ID](task-identity.md), persisted as readable `<!-- ptbk-task-id: <id> -->` metadata associated with that section. The metadata comment is not a status control line, task instruction or a new task. New authoring assigns it; legacy/manual sections receive an ID through scoped preparation before execution, never during read-only inspection. Preserve it during section moves, title edits, completion, archiving and conversion. Distinct sections must not share an ID merely because their titles match.

Exclamation marks in control metadata indicate priority, higher first. Non-time backtick selectors are an any-of substring match against the selected agent's aliases, harness or model. Date tokens on that line are [earliest-start conditions](not-before.md), not routing. Preserve this meaning during conversion and status updates.

Complete the correct section with a checkmark in the same result commit as accepted changes and policy-eligible [traces](traces.md). Include its exact task ID in task-related commit messages. Preserve description, selectors, time annotations and unrelated sections. Detect concurrent edits and moved/disappeared sections before writing; never attach a result to the wrong task solely because its section number was reused.

Newly authored work prefers [task Books](task-books.md). Conversion is optional and explicit through [migration](migration.md), not a prerequisite for executing Markdown work. Both formats share IDs, audit paths, occurrence/attempt distinctions and ordinary persistence rules.
