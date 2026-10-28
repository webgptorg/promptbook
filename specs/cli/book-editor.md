# Editing Book sources

[Dashboard details](dashboard-details.md) · [Shared rich input](rich-input.md) · [DRY](../coding-standards/shared-logic.md)

The dashboard can display and edit the real source of a project-owned Book, including core agents, tasks and chats. It is a lightweight terminal over the engine, with the familiar full-source editing experience of composing a Git commit message. Opening an editor does not save, regenerate or silently rewrite the Book. Show its source path and preserve literal source, Unicode, existing order and attachments. Engine-owned definitions such as Expert can be inspected but are not materialized or edited as project files.

Use the **same shared rich-input implementation** as initialization and chat for Ctrl+V and macOS Command+V text, images, documents and long pasted blocks. Saving materializes readable full content and working project-relative asset links, never compact UI tokens. Do not implement a second clipboard, attachment or serialization pipeline for this editor; see the explicit [DRY contract](../coding-standards/shared-logic.md#one-rich-input-implementation).

## Editing and saving

Enter always inserts a new line. **Ctrl+S saves without closing**; Enter never saves or exits this editor. This differs from flow-oriented initialization/chat, where Enter accepts/submits. Keep the applicable keys visible and protect them from global dashboard shortcuts. Preserve drafts during refresh, resize and navigation; leaving must not silently lose unsaved edits.

Saving is **permitted even with problematic or invalid content**. Display a clear warning with the detected issue and source context, while keeping Save available; do not turn a warning into a mandatory correction or blocked save. Unknown/misspelled commitments, questionable instructions and invalid MODEL values are ordinary diagnostic/repair conditions. Preserve what the user saved and create/update a deduplicated ordinary Fixer repair task with the evidence. If the engine is paused, that background repair waits like other queued work.

The resilient Book format is not a conventional strict programming language. Useful diagnostics must not become a fatal parser/editor gate. Work that cannot be interpreted safely remains blocked with context while unrelated work and the engine's controls continue. Fixer uses ordinary source/TEAM/learning operations, not a special editor repair subsystem.

Coordinate saves with current source revisions, active task ownership and scoped Git persistence; never overwrite another client's accepted edit or stage an active task's unfinished work. Detect stale conflicting edits and preserve the draft for reconciliation. Report saved/committed only after actual write and required commit; disk, permission or persistence failure is different from a content warning. Saving an unchanged source creates no empty commit.

## Acceptance outcomes

Edit an ordinary and core agent from the dashboard; Enter adds lines and Ctrl+S saves without leaving. Paste the same long text, image and document through init, chat and this editor and verify the same payload/asset behavior. Save unknown commitment/invalid MODEL content with a visible warning and retained exact source; see one ordinary Fixer repair task, pending under pause. Exercise resize, concurrent edits and failed persistence without losing drafts or claiming success.
