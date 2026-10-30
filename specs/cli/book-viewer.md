# Shared Book viewing and long documents

[Book editor](book-editor.md) · [Files](files.md) · [DRY](../coding-standards/shared-logic.md#one-book-viewing-and-editing-core)

Use **one Book parser, content/rendering model and document-navigation core** for viewing and source editing. Share source coordinates, commitment/message chronology, highlighting, diagnostics, attachments and lossless serialization. Read-only/editable is a mode, not independently maintained Book implementations. Editable input additionally reuses the existing rich composer; terminal/browser adapters may differ without copying semantics.

Books can be very long: `report.book` deliberately keeps every brief and other chats/sources grow too. Opening, scrolling/jumping, selecting, typing/saving and returning remain responsive with bounded viewport rendering/output queues. Preserve complete offscreen source, quoting, Unicode and attachment links; no cleanup is a prerequisite for usability.

Incremental/indexed/windowed strategies are implementation choices, but do not silently truncate, lose offscreen edits or reparse/repaint the entire history on every key/live frame. Latest-brief lookup must not render the full feed. Preserve cursor, viewport and drafts during appends/resize; reject stale conflicting saves under shared revision/ownership rules instead of overwriting another writer.

Read-only mode cannot mutate through hidden save handlers/editor keys. Editing retains Enter/newline, Ctrl+S/save-without-closing, nonblocking warnings and ordinary Fixer repair, without a second serializer or stricter grammar.

## Shared syntax highlighting

Highlight the foundational first-line AGENT/TASK/CHAT declaration and entity name, subsequent commitment keywords and valid references in every Book viewing/editing surface, including Agents, Tasks, Chats and Files. Use the same syntax/parser knowledge and source ranges in terminal/browser and read-only/editable modes, not independent regular-expression grammars. Respect literal/quoted content and preserve exact source. Highlighting complements accessible semantic styling rather than requiring color to understand the Book. New commitments such as TASK PURPOSE participate through the common knowledge.

## Acceptance outcomes

View/edit short and very large Books with commitments, quoted controls, messages, Unicode and attachments. Navigate beginning/end/offscreen content, append reports while viewing, resize and save near the end. Verify matching interpretation, bounded responsive rendering/input, full-source preservation, conflict-safe saving and no read-only mutations.
