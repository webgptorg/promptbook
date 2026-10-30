# Read-only project Files page

[Dashboard pages](dashboard-details.md) · [Book viewer](book-viewer.md) · [Workspace](workspace.md)

Provide a compact **Files** tile and simple interactive read-only browser rooted at the selected project. Navigate folders/open/scroll/back with stable path/selection and real names/type/size. Missing/changed/inaccessible files are honest. Navigation never writes/formats on disk, renames, deletes, executes tasks or calls a provider.

Hide `.git`, `.ptbk` and other hidden/protected paths by default. Within `agents/`, make hidden directories containing agent Books, including `agents/.core/`, navigable so core-agent sources can be inspected. This narrow exception does not expose hidden secrets, Wallet/recovery files, sessions/browser profiles or an otherwise protected path merely because it sits below agents. No alternate endpoint exposes protected data. Constrain traversal/symlinks to authorized project boundaries, never arbitrary host browsing. Untrusted terminal sequences and active HTML/scripts display safely without execution.

Format Markdown readably, JSON with useful formatting/color, and Book with the **same core as source editing**. Formatting is presentation only; preserve full content through scrolling rather than permanent truncation. Book views can show parsed messages/commitments with source context, including all earlier report briefs.

Display images when the terminal supports a suitable protocol; otherwise show truthful nonbroken file information. Browser views can use ordinary image rendering. **Video playback is not required now**; identify the file without claiming terminal playback, conversion/transcoding or a remote viewer prerequisite.

Files has no edit/save/rename/delete controls. Separately invoked Book editing uses the shared core in editable mode. Long Books remain navigable without rendering/loading their entire history on every repaint.

## Acceptance outcomes

Inspect nested folders and long Markdown/JSON/Book/images, supported and unsupported media, live file changes and resize. Preserve selection/scroll, hide protected/escaping paths, reject active content, and make no file/Git mutations. Inspect a very long `report.book` with the shared viewer/editor core.

Acceptance additionally navigates `agents/.core/` to a core Book while unrelated hidden/secret paths remain hidden and traversal-safe. Agent Books use the shared syntax highlighting in viewing and editing.
