# Markdown task support

[Main specification](../_main.md)

Markdown tasks remain supported alongside task Books through the same queue and execution lifecycle. Read top-level `.md` files in `prompts/`; ignore README, templates, archives, traces, assets and files containing `<!--ptbk-coder-ignore-->`. A standalone `---` divides task sections.

The first nonempty control line determines a section's state, not checklists in its description. `[ ]` or no marker is unfinished; `[-]`/`[.]` means not ready; `[^]` requires recovery; `[x]`/`[X]` is complete; `[!]` is failed. Authoring placeholder `@@@` prevents execution. An emoji in a title is not a status.

Exclamation marks in control metadata indicate priority, higher first. Non-time backtick selectors are an any-of substring match against the selected agent's aliases, harness or model. Date tokens on that line are [earliest-start conditions](not-before.md), not routing. Preserve this meaning during conversion and status updates.

Complete the correct section with a checkmark in the same result commit. Preserve description, selectors, time annotations and unrelated sections. Detect concurrent edits and moved/disappeared sections before writing; never attach a result to the wrong task solely because its section number was reused.

Newly authored work prefers [task Books](task-books.md). Conversion is optional and explicit through [migration](migration.md), not a prerequisite for executing Markdown work.
