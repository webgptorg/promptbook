# Names for automatically created tasks and chats

[Main specification](../_main.md) · [References](../book-language/references.md) · [Authoring](authoring.md) · [Chats](chats.md)

## Prevent collisions when creating the entity

Whenever Promptbook creates a **new task or chat**, form its declared name from a readable descriptive title plus the creation **date and time**. Include this information proactively on the first creation, not only after a duplicate has already appeared. Store the final name as the content of the opening TASK or CHAT commitment.

This applies to fully automatic and user-triggered generation alike: `ptbk add`, new `ptbk chat` threads, dashboard/browser/API creation, saved planning proposals, work created from conversations, initialization's first task, Manager/Teacher/Fixer and goal-discovery work, ordinary follow-ups, agent-originated human requests and task-scoped agent consultations. The same policy applies regardless of whether a model, the engine or a person supplied the descriptive title. A CLI command that writes the Book is system creation; no separate manual-authoring mode or new user workflow is introduced.

Use the project's effective time context to produce understandable creation date/time text. Do not let an automatic naming step add a routine confirmation gate or a model call to otherwise model-free authoring. Agents keep their ordinary role names; they are not subject to this task/chat decoration.

## Ordinary text, not an identifier schema

The **whole final name** goes through the existing shared normalization and resolver. A date is not an additional ID, name namespace, metadata commitment, scheduling condition or special parser token. The parser must not require, recognize, strip, reformat or extract a timestamp from an entity name.

A date/time prefix or suffix can serve this policy. No exact display format or placement is required by the language; keep generated names readable and consistent. For example, `TASK Improve CSV export — 2026-10-18 01:25:00` is a generated name, whereas `TASK Improve CSV export` is also a valid Book declaration. A date written in another format or other distinguishing text is still ordinary name content. Emojis or punctuation have no special identity semantics and must not be assumed to survive normalization as a unique discriminator.

This is a creation policy, not a new validity constraint on existing Books. Do not reject or automatically rename an otherwise valid task/chat because its name lacks a date. Do not invent a separate syntax for files authored outside the generators. Accepted names must obey the common uppercase keyword/content boundary; generators must not emit an ambiguous all-uppercase initial name word.

## Check normalized uniqueness and preserve names

Date/time reduces collisions but does not guarantee uniqueness: several creations can share a clock tick, a batch can repeat a title, and different display strings can normalize identically. Before publishing a newly generated entity, check the **final normalized name** against occupied project names and reserved references through the shared resolver, across agent/task/chat kinds, not just its destination directory. A generated entity must not shadow an existing definition or be born shadowed. If necessary, add a readable discriminator, such as a sequence number or finer time detail, that actually remains distinct after normalization. Check the filename independently as well; never overwrite an existing path.

Coordinate concurrent creation and recheck at persistence so two writers cannot publish the same normalized candidate. A batch allocates distinct final names before wiring its references. Collision prevention does not change deterministic lookup or Fixer diagnostics for pre-existing colliding sources, and does not authorize renaming somebody else's Book.

Allocate once for each genuinely new entity. Preserve the chosen name and creation context when saving is pending, retrying persistence, recovering or reconnecting. Opening an existing chat, adding a message, updating task status, retrying execution or starting another recurrence does **not** allocate a new name or refresh its date. Repeated initialization still recognizes its existing bootstrap instead of generating another task. An explicit conversion of an existing source preserves identity; it is not creation of new work.

References, task/chat links, UI/API outcomes, commit name trailers and name-derived traces use the final persisted name, including its date/time and any discriminator. Do not expose a successful pre-disambiguation reference that later points to another Book. A deliberate later rename follows ordinary link/history reconciliation.

## Filenames remain storage names

Keep newly generated task/chat filenames readable and date-leading, beginning with the four-digit year and two-digit month (`YYYY-MM-…`) and ending in `.book`. Retain the existing date-leading convention while the remaining numbering detail is undecided; the current `YYYY-MM-DD-HHMM-<slug>.book` layout is compatible. A filename's date or sequence is not another logical identifier and need not be parsed to resolve the Book. File-path safety, collision avoidance and queue boundaries still apply.

The exact meaning/format of the numeric part after `YYYY-MM-` was not finalized; this change does not introduce a mandatory monthly counter or bulk-rename existing files. The placement of date/time in the display name is likewise not a newly fixed syntax rule. Existing agent filenames are unchanged.

## Acceptance outcomes

- Create the same descriptive task twice with `ptbk add`, two same-agent chat threads, and automatic follow-up/request Books. Every new task/chat receives date/time text before any collision, has a typed opening commitment, and is independently addressable by its complete normalized name.
- Repeat with a fixed clock, a batch, concurrent callers and titles differing only by case, accents, separators or decorative symbols. Distinguish colliding candidates after normalization without overwriting paths or changing existing definitions, including a collision with another entity kind.
- Retry a pending save, reconnect a chat, append messages, recover a task, rerun init and execute recurrence. None changes the existing name or creates duplicate entities solely because time advanced.
- Read an otherwise valid undated Book or a differently formatted name without mutation or timestamp-validation failure. Move a source without changing its declaration: logical identity and kind stay the same. Verify that links, commit trailers and trace paths use the full saved name rather than its filename or descriptive-title prefix.
