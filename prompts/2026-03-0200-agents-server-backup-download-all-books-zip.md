[ ]

[✨🍎] Admin backup page: download all books as a ZIP organized by folders

-   Add a new admin-only page under the **System** menu to allow administrators to back up data.
-   This page should be designed to be extendable in the future with multiple backup options, but for now it includes **one** option: **Download all books**.
-   Clicking **Download all books** downloads a single `.zip` file.
-   The zip must contain **all books** from the Agents Server and keep them **organized exactly by the folders/directories** they belong to in the Agents Server UI (mirror the folder tree structure).
-   Preserve book filenames as in the system (ensure stable and human-readable names; if there are collisions, resolve deterministically, e.g. append book id).
-   Include a top-level folder inside the zip to avoid unzipping into the current directory (e.g. `promptbook-backup-YYYY-MM-DD/`).
-   Ensure the export includes the canonical source of the book content used by the editor/runtime (no partial exports).
-   Authorization:
    -   Only administrators can access the page and perform the export.
    -   Non-admin users must not see the menu item and must receive an authorization error if they hit the route directly.
-   UX:
    -   Show basic explanation + a single primary action button.
    -   While generating, show loading/progress state (at least indeterminate) and prevent double clicks.
    -   Handle and display errors gracefully.
-   Implementation notes:
    -   Implement as server-side streaming download if possible (avoid holding the entire zip in memory for large datasets).
    -   Ensure folder names are safe for filesystem paths (sanitize) while still matching the displayed folder names as closely as possible.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍎] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍎] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🍎] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)