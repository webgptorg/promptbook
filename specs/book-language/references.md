# One resolver for agent, task and chat names

[Book language](_index.md) · [Project model](../concepts/project-model.md)

## Name is identity

Agents, tasks and chats use the **same** reference forms and normalization. A one-word name can be written `@Adam`; any name, including a single word, can be written in double braces: `{{Adam}}`, `{{Frontend Developer}}`, `{{Discuss CSV export}}`. `@Adam` and `{{Adam}}` have identical meaning. Existing single-brace references such as `{Adam}` and `{Frontend Developer}` remain readable compatibility aliases; new examples and generated references use double braces or the one-word @ form. Unbraced `@` stops at its token boundary, never greedily consumes following prose. These forms work in any entity kind, in dedicated reference commitments and in meaningful nonliteral Book content.

Compare normalized names by removing differences in case, diacritics and separator spelling (spaces, underscores, hyphens and equivalent word boundaries). `{{Čeněk}}`, `@Cenek` and `{{c e n e k}}` have the same logical name; likewise `{{Frontend Developer}}`, `{{FrontendDeveloper}}`, `{{frontend     Developer}}`, `{{Frontend_Developer}}` and `{{-Fronténd Developer}}`. Normalization is **exact comparison after canonicalization**, not fuzzy or semantic name matching. Retain the declared display spelling in user interfaces and files.

There is **no separate TASK ID, CHAT ID or AGENT ID**. The logical key comes from the name content of the opening AGENT, TASK or CHAT commitment, excluding that keyword, regardless of basename or extension. The kind is not added as another name namespace: an agent and task with the same normalized name still compete under the shared resolver. Changing the declared name changes reference identity and requires explicit reconciliation of affected links and historical evidence; moving the file without renaming does not. Preserve actual Git provenance, attempts and occurrences without manufacturing an opaque entity ID.

Automatically created task/chat names follow [generated-name policy](../cli/generated-names.md). Their date/time text and any discriminator are ordinary parts of the full name: normalize them with everything else, never strip them or match only the descriptive title. Reference the final persisted name rather than guessing a filename or the pre-disambiguation proposal. Existing valid names without dates remain valid and are not renamed during lookup.

## Deterministic, project-scoped lookup

Resolve a name in the selected project directory, not another current directory, package installation or arbitrary parent. Use the same algorithm regardless of the source entity kind. No source wins by matching the reference's original case, accents, separators or filename more closely; **normalize before comparing** and use only precedence to select the winner.

1. **Engine built-ins:** `@Void`/`@Null` (also legacy `0`), `@User`, `@Expert` are reserved, unshadowable, Book-like non-agent references supplied by the running engine.
2. **Common project locations, not Git-ignored:** search Book definitions in `agents/`, `tasks/`, then `chats/`, recursively. Within this tier rank by **relative nesting depth first** (shallow wins across all three common roots), then by listed root order (`agents/`, `tasks/`, `chats/`), then by stable lexical path. Never let exact surface spelling alter that rank.
3. **Other non-Git-ignored project locations:** search remaining `.book` definitions in the project, shallow before deep and deterministically by path.
4. **Git-ignored project content:** only after both nonignored tiers, search eligible ignored `.book` definitions, including generated artifacts and `node_modules`, using relative depth, common-folder and stable path order consistently.

The first definition whose **normalized declared name** matches wins. There is no merge of Books and no automatic fallback to another definition because it spells the name more precisely. Folder names determine lookup precedence, not entity kind or identity; the opening commitment supplies kind. An explicit source path can be used where an API requires unambiguous source inspection, but it is not an alternate entity ID or permission to evade the logical resolver.

Within a tier and path order, duplicates are **shadowed, not fatal by default**. Report competing paths, effective winner and potential category mismatches as diagnostics for [Fixer](../agents/fixer.md) to inspect. A reference in an agent-only commitment such as FROM or TASK AGENT must resolve to the correct type; if the winning Book is a task/chat, report the mismatch instead of silently selecting a lower-priority agent. Missing, malformed or category-incompatible references never select a random fallback.

Excluded from discovery: Git metadata, local `.ptbk/` runtime/browser profiles, `traces/` evidence and other explicit data-only regions; do not escape the project through symlinks or traverse nested project runtime. Include hidden supporting agents and ignored dependencies only in their stated tiers, without automatically selecting them for general work. Discovery must be read-only; expensive ignored-content scans may be deferred but their incompleteness must be disclosed. Cached matches must respect changed project files and Git ignore state.

## Typed meaning and graph edges

A reference can point from **any Book kind to any other** through LINK or appropriate domain commitments. These edges are **directed**: A referring to B does not require writing an inverse reference in B. Views can show both references made and references received. Multiple chats may refer to one task, and one chat may refer to multiple tasks; no relationship requires a task to exist. A link alone does not imply execution order, consultation, conversation participants, write authority or task assignment.

Specific commitments impose additional semantics: FROM requires an agent or supported non-agent parent; TEAM describes consultation; TASK AGENT assigns an agent; TASK PARENT/TASK DEPENDS ON require a task; CHAT MEMBER chooses a participant. Literal examples, Markdown code blocks, incidental email addresses and malformed text must not be treated as active relationships.

## Acceptance outcomes

Create `AGENT Čeněk` at a higher-precedence project path and `AGENT Cenek` in `node_modules`: both `@Cenek` and `{{Čeněk}}` select the first, with a discoverable collision diagnostic. Create two Book files with the same normalized name in a common folder: stable lookup picks one and does not merge them; Fixer can propose a correction. Resolve every combination of agent/task/chat links, including a task↔chat M:N graph. Test source renames, case/diacritics, duplicate titles, hidden cores, excluded traces, nested projects, tie-breaking paths and wrong-kind targets without creating runtime IDs or rewriting sources during read-only lookup. Double-brace and legacy single-brace references agree; complete generated names resolve without date-aware parsing or title-only fallback.
