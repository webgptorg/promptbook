# Converting task sources and legacy Book headers

[Main specification](../_main.md) · [Canonical syntax](../book-language/syntax.md)

Migration is an explicit local maintenance operation. It performs no model call, harness installation, application implementation or browser action. `--dry-run` previews the plan without writing anything. Read-only discovery, reference lookup, list and status do not rewrite old sources merely because a header needs conversion.

## Markdown task conversion

`ptbk migrate` converts local Markdown task sections into task Books, one Book per section. Preserve the existing title/name, exact descriptive payload, state, priority, opaque routing alternatives, time restrictions, notes, assets and known completion history. Write `TASK <existing name>` as the first commitment and place the bounded descriptive assignment under GOAL, preserving literal content. Use canonical normalized cross-references without generating opaque task IDs; do not guess whether an opaque selector names a model or agent. Recalculate relative references without modifying unrelated code or URLs.

Verify equivalent meaning for every section before archiving its original file outside the executable queue. Keep the original bytes recoverable. An unconvertible section, changed source/destination or normalized name collision must not cause overwriting, identity confusion or premature removal. Unknown completion time remains explicitly unknown, not invented.

## Legacy Book header conversion

An explicitly requested conversion of an existing unprefixed-name Book produces `AGENT <existing name>`, `TASK <existing name>` or `CHAT <existing name>` according to its unambiguous legacy kind. Remove a redundant ENTITY declaration rather than retaining two competing type declarations. Existing conforming `TASK <name>` headers already use the canonical opening form; do not convert them back to plain titles.

A legacy reader may use the old source's explicit ENTITY and documented legacy context to prepare a conversion, not to reintroduce location-based type inference in the canonical parser. If kind is missing, contradictory or otherwise ambiguous, report the source and obtain an explicit resolution rather than guessing an agent or dispatching work. An old name spelling that conflicts with the uppercase boundary needs an explicit representable spelling decision; do not silently change the original or its normalized identity.

Preserve instructions, conversation participants/messages, attachments, status, metadata, links and provenance. Existing introductory descriptions must move under semantically appropriate commitments without changing their meaning; do not reinterpret an unattached chat paragraph as a message from an invented speaker. Preserve literal control-looking text losslessly. Conversion may change syntax, not reset the entity's learned content, outstanding work or history.

Neither Markdown conversion nor Book-header conversion creates a new logical entity merely by writing canonical bytes. **Keep the existing name**, including any date text already present; do not append the current date/time or impose the generator's filename convention. Existing normalized collisions require explicit reconciliation, not automatic title changes. New tasks/chats genuinely created by an authoring operation separately follow [generated-name policy](generated-names.md).

## Persistence and recovery

Interruption and rerunning must not produce two runnable copies of the same task or duplicate chat histories. Preserve migration provenance, resolve ambiguity before execution and refuse live tasks or conflicting active writes. A successful conversion uses one scoped maintenance commit unless `--no-commit` was explicitly selected; push is not implicit. Preserve related trace history and source revisions, and leave unconverted data recoverable when conversion cannot safely complete.

Acceptance covers each entity kind, Markdown payloads, missing/conflicting legacy kind, already canonical headers, unknown metadata, literal examples, collisions, interrupted conversion and a second no-op conversion. Names and linked history survive; no automatic creation timestamp, anonymous ID or read-only rewrite appears.

See [Markdown tasks](task-markdown.md), [task Books](task-books.md), [references](../book-language/references.md) and [recovery](recovery.md).
