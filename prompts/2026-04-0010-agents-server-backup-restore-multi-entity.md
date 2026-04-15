[ ] !

[🧰🌌] Enhance Agents Server backup page to allow selecting entities and exporting a single full backup file

-   You are working with the [Agents Server](apps/agents-server)
-   Extend the existing “books backup” implementation used on the server backup page; do not remake it from scratch—enhance it to support backing up additional server entities.
-   UI: on the server backup page, provide a set of checkboxes (or equivalent multi-select controls) allowing the admin to choose which aspects of the server to include in the backup.
-   Default behavior: all available aspects should be pre-checked and the download should be the “full backup” including everything the UI offers.
-   Backup aspects to support via selection (at minimum):
    -   metadata
    -   conversations
    -   users
    -   agents
    -   et cetera (provide further categories supported by the current backup base implementation; if there are additional categories, expose them similarly)
-   Export format: download as one big file by default.
-   The chosen selections must be included in the downloaded file contents.
-   Reuse: the current implementation of backing up the books must be used as the base for the server backup export logic (data extraction + file creation + download endpoint/handler); extend it to include other entity exports and compose them into the same output file.
-   Data integrity: ensure the backup file contains all data required to reconstruct the backed-up portions (as far as the current books backup format enables), including relationships needed between entities (e.g., conversations ↔ users/agents) when those portions are selected.
-   Performance/UX: show progress or at least a loading state while generating the backup; block/disable the download action while generation is running.
