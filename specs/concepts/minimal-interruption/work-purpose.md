# Content work, system work and core provenance

[Principle](_index.md) · [Examples](content-examples.md) · [TASK PURPOSE](../../book-language/commitments/task-purpose.md) · [Task views](../../cli/task-views.md) · [Engine-owned tasks](../../cli/system-tasks.md)

## Project-relative purpose

**Content work** addresses what the particular project is about, at its intended level of responsibility. **System work** is supporting/service work needed to make that project and its content work function. These terms can describe tasks, agents' current work and chats; an agent's role does not predetermine the purpose of every task it performs.

System work is instrumental. Content work can itself be instrumental to a higher goal; content is not a synonym for a terminal objective. Asking whether the activity is technical or contains code is insufficient. A server/parser can be the product in one project and an incidental helper in another. Purpose requires contextual judgment, informed by the project's goals, scope and abstraction level. The examples are guidance for that judgment, not a universal exhaustive taxonomy.

An accounting task can discover a need for an XML parser. Normally retain the accounting task's content purpose and create linked supporting system work, using ordinary parent/dependency relationships as actually required. A prerequisite blocks only work that really depends on it. Do not reclassify the entire original task merely because one technical step appears. General project maintenance need not have an artificial content parent.

## Independent core provenance

A **core agent** is an ordinary editable project role whose presence the engine expects and prepares. A **core task** is a descriptive term for task work performed exclusively by core agents. Core provenance is derived from the responsible agents, not an extra execution kind, scheduler or permission grant. A mixed core/noncore assignment is not exclusively core work.

Core and purpose are independent. Router assignment is usually core/system work; a Teacher task can be core/content work. An ordinary accountant can perform noncore/content accounting or noncore/system parser repair. Engine-defined system agents such as Expert are distinct from project core roles; do not classify Expert's work as core merely because the engine supplies it. Classify its purpose from the actual work and project.

**Engine-owned work** describes where a task definition/executor comes from, such as deterministic self-update without a project Book. Older specifications used "system task" specifically for this origin. Keep engine ownership, core provenance and project-relative purpose distinguishable in the common inventory. Engine-owned maintenance is normally system-purpose work; a source-backed agent task can be system-purpose too.

## Authoring and evolution

At creation, the task's author assigns CONTENT or SYSTEM through [TASK PURPOSE](../../book-language/commitments/task-purpose.md) when the context supports a useful judgment. Absence/UNDEFINED is valid; classification uncertainty must not become a routine question or execution blocker. Tasker uses this knowledge base while authoring/splitting work. Router and the executing agent may refine the classification when they learn more.

A real reclassification appends a new commitment at that point in the Book, preserving earlier values and a concise reason in an ordinary note where useful. The last valid value is effective. Do not overwrite the old value or retain history only in Git. Existing unclassified tasks remain valid without a forced backfill or inference sweep; later classification is ordinary authorized task maintenance.

Default task presentation emphasizes content work, including content work done by core agents. System-purpose work, including work done by noncore agents or directly by the engine, is lower and visually muted, with a discoverable way to inspect it all. Unclassified work stays reachable in the ordinary view. This is presentation priority, not a reduction in scheduling priority or permission to starve necessary prerequisites. Genuine human requests remain conspicuous regardless of purpose/core provenance.
