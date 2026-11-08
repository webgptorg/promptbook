# Project Files page

[Dashboard pages](dashboard-details.md) · [Book viewer](book-viewer.md) · [Workspace](workspace.md)

Provide a compact **Files** tile and simple interactive read-only browser rooted at the selected project. Navigate folders/open/scroll/back with stable path/selection and real names/type/size. Missing/changed/inaccessible files are honest. Navigation never writes/formats on disk, renames, deletes, executes tasks or calls a provider.

Hide `.git`, `.ptbk` and other hidden/protected paths by default. Within `agents/`, make hidden directories containing agent Books, including `agents/.core/`, navigable so core-agent sources can be inspected. This narrow exception does not expose hidden secrets, Wallet/recovery files, sessions/browser profiles or an otherwise protected path merely because it sits below agents. No alternate endpoint exposes protected data. Constrain traversal/symlinks to authorized project boundaries, never arbitrary host browsing. Untrusted terminal sequences and active HTML/scripts display safely without execution.

Format Markdown readably, JSON with useful formatting/color, and Book with the **same core as source editing**. Formatting is presentation only; preserve full content through scrolling rather than permanent truncation. Book views can show parsed messages/commitments with source context, including all earlier report briefs.

Display images when the terminal supports a suitable protocol; otherwise show truthful nonbroken file information. Browser views can use ordinary image rendering. **Video playback is not required now**; identify the file without claiming terminal playback, conversion/transcoding or a remote viewer prerequisite.

The terminal and shared read-only presentation have no Files edit/save/rename/delete controls. Desktop operations are specified below. Separately invoked Book editing uses the shared core in editable mode. Long Books remain navigable without rendering/loading their entire history on every repaint.

## Read-only acceptance outcomes

Inspect nested folders and long Markdown/JSON/Book/images, supported and unsupported media, live file changes and resize. Preserve selection/scroll, hide protected/escaping paths, reject active content, and make no file/Git mutations. Inspect a very long `report.book` with the shared viewer/editor core.

Acceptance additionally navigates `agents/.core/` to a core Book while unrelated hidden/secret paths remain hidden and traversal-safe. Agent Books use the shared syntax highlighting in viewing and editing.

## Desktop text editing and bulk operations

The [desktop workspace](desktop.md#workspace-tabs-and-windows) opens a file preview or an editor for ordinary text. Book sources use the [desktop Book editor](desktop.md#text-and-book-editing). The terminal Files page remains read-only. The desktop is a client of the selected live engine for all mutations. It uses the same authorization, path confinement and ownership policy when that engine is paused.

- Support multi-selection, bulk copying within the project, importing files and complete folders by drag-and-drop, and deleting selected ordinary files and folders. An import copies the source and preserves its directory structure. Move and rename can follow for ordinary files.
- Preflight the whole operation before writing. Check canonical targets, symlinks and junctions, target filesystem name collisions and protected paths. Apply the same boundary to descendants of a selected folder, even when some descendants are hidden from the client. On ordinary name collisions, offer **Keep Both** by default, **Skip** and **Replace**. Show one review for colliding or rejected items. An ordinary collision-free import can proceed without a dialog.
- Protect the project root, configured entity roots, core/system Books, configuration, Git metadata, runtime state, secrets and Wallet files against bulk overwrite/deletion. Agents, tasks and chats are deleted through their domain controls where references and running work can be checked. Confirm bulk deletion with its scope. Inspecting readable core Books does not grant write access.
- Let the engine own the full file operation and its [Git persistence](git-persistence.md#desktop-file-operations). Show accepted/skipped/conflicting items and actual completion, including an interrupted operation that needs review. Keep drafts visible during a disconnect. With a stopped or unreachable engine there is no project mutation or Git commit from the desktop. The project entry provides explicit lifecycle actions and never starts an engine to save automatically.

### Desktop acceptance outcomes

Import a directory tree and several separate files, including target name collisions, hidden protected descendants and an escaping junction. Verify source files remain in place. Bulk-delete ordinary files/folders after confirmation and reject removal of a parent with protected content. Test a running and a paused engine, a stale revision, an agent writing elsewhere or owning the same path, a disconnect and restart recovery. Verify ordinary text and Book opening, preview reuse and restoration of an unsaved draft.
