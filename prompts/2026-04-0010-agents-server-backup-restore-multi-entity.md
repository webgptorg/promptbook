[x] ~$0.00 an hour by GitHub Copilot `gpt-5.4`

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

---

[x] $2.62 an hour by OpenAI Codex `gpt-5.4`

[🧰🌌] Enhance Agents Server backup page to be less internal database focuses

-   Now the backup page is very much focused on backing up the internal database, but we want to make it more user-centric and focused on the actual data from user/admin perspective, not the internal implementation details.
-   You are working with the [Agents Server](apps/agents-server)

**Parts of backup**

-   **Metadata and limits** - Backup in single JSON key-value format
-   **Agents and books** - Keep the existing structure
-   **Conversations and feedback** - Backup in same way as exporting chat into JSON from the UI, one chat per file, no need to keep the internal database structure
-   **Users and user data** - Backup each user as a separate JSON file
-   **Files and media** - Backup each file separately keeping the original file format, and also include a metadata JSON file `image-to-backup.png` + `image-to-backup.png.metadata.json` with the necessary information to restore it properly (e.g., which user uploaded it, which messages it was attached to, etc)
-   **Zprávy** - Each message should be backed up separately in a JSON file
-   **Security and access** - Do not include any sensitive information in the backup (e.g., passwords and tokens from wallet)
-   **Caches and runtime state** - Do not include any caches or runtime state in the backup

