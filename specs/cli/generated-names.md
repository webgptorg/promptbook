# Names for automatically created tasks and chats

[Main specification](../_main.md) · [References](../book-language/references.md) · [Authoring](authoring.md) · [Chats](chats.md)

## Prevent collisions when creating the entity

Whenever Promptbook creates a **new task or chat**, form its declared name from a readable descriptive title plus creation **date and time**. Include it proactively on first creation, not only after a duplicate appears. Store the final name as the content of the opening TASK or CHAT commitment.

This applies to automatic and user-triggered generation: add, chat entry across CLI/dashboard/browser/API, saved plans, conversation-created work including Chatter, bootstrap, Manager/Teacher/Fixer/discovery, follow-ups, human requests and internal consultations. It is independent of whether a model, engine or person supplied the title. A CLI writing a Book is system creation; there is no additional manual-authoring mode/workflow.

Use the project's effective time context. Naming must not add routine confirmation or a model call to model-free authoring. Agents, including Chatter, keep ordinary role names without task/chat date decoration.

## Ordinary text, not an identifier schema

The **whole final name** uses the existing shared normalization/resolver. A date is not an ID, namespace, metadata commitment, scheduling condition or special parser token. The parser must not require, recognize, strip, reformat or extract timestamps from entity names.

A date/time prefix or suffix can serve the policy. Exact format/placement is not language syntax; generated names stay readable and consistent. `TASK Improve CSV export — 2026-10-18 01:25:00` is a generated name, while `TASK Improve CSV export` remains valid. Dates in another format are ordinary content. Emojis/punctuation have no special identity meaning and cannot be assumed to survive normalization as distinct discriminators.

This is creation policy, not a validity restriction on existing Books. Never reject/rename a valid undated task/chat automatically or invent separate externally authored syntax. Respect the uppercase keyword/content boundary; do not generate an ambiguous all-uppercase first name word.

## Check normalized uniqueness and preserve names

Date/time reduces but cannot guarantee uniqueness: same-tick creation, batches and display strings may normalize identically. Before publishing, check the final normalized name across occupied project names and reserved references, across agent/task/chat kinds. A generated entity must neither shadow another nor be born shadowed. Add a readable discriminator, such as sequence/finer time, that remains distinct after normalization when needed. Check destination path separately and never overwrite it.

Coordinate concurrent creation and recheck at persistence. Allocate distinct final batch names before wiring references. This does not change deterministic lookup/Fixer diagnostics for existing collisions or authorize renaming someone else's Book.

Allocate once for genuinely new entities. Retain the name/creation context through pending save, persistence retry, recovery and reconnect. Opening/appending a chat, updating task status, executing recurrence or retrying work does not rename it or refresh its date. Repeated init recognizes its bootstrap. Explicit source conversion preserves identity; it is not new work.

References, chat/task links, UI/API outcomes and commit trailers use the complete final **declared name**, including date/discriminator, never a successful preliminary reference. Evidence stores that declared name and source provenance, but its directory uses the **actual source filename** under [trace rules](traces.md). A deliberate logical rename reconciles links/history; it does not turn trace storage into another identity system.

## Filenames remain storage names

New task/chat filenames remain readable/date-leading, beginning `YYYY-MM-…` and ending `.book`. Preserve the existing convention while remaining numbering details are undecided; `YYYY-MM-DD-HHMM-<slug>.book` is compatible. Filename date/sequence is not a logical identifier and need not be parsed for resolution. Path safety, collisions and queue boundaries still apply.

The numeric part after `YYYY-MM-` was not finalized; this change adds no mandatory monthly counter or bulk-renaming of existing files. Date/time placement in the declared name is likewise not fixed syntax. Agent filenames are unchanged.

For a task, the trace directory copies this **chosen source basename literally** without the final extension: `traces/<task-file-basename>/`. Do not regenerate/normalize a slug from its declared name. Check ambiguous evidence destinations as well as source paths; changing only the Book declaration does not change the directory. Filename/basename changes and historical evidence follow [trace reconciliation](traces.md).

## Acceptance outcomes

- Create the same task title twice, same-agent chat threads and automatic follow-up/request/consultation Books. Each receives date/time proactively, a typed declaration and a distinct final normalized name.
- Use a fixed clock, batches, concurrent callers and titles differing only by case, accents, separators or symbols. Resolve normalized collisions without overwriting paths, including another entity kind.
- Retry saves, reconnect, append, recover, reinit and execute recurrence without allocating another entity/name merely because time advanced.
- Read valid undated/differently dated Books without mutation or timestamp validation. Move a source without changing its declaration: logical identity/kind remain. Links/trailers use the full declared name; the trace directory instead exactly matches the actual source filename without its final extension, with correctly attributed history.
