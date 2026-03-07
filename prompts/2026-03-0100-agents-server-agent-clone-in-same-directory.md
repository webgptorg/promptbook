[ ]

[✨🗄] Agent clone in same directory

-   In the [Agents Server](apps/agents-server) UI, users can create an agent based on an existing one ("clone/duplicate"). Currently, when cloning an agent that is placed in some directory/folder, the clone ends up in @@@ (likely root or another default location). This creates extra manual work to move the clone back to the same directory.
-   Implement cloning so that a newly created cloned agent is created in the same directory (folder) as the source agent by default.
-   UX requirements:
    -   The clone action should keep the existing behavior (name, image, settings, knowledge, etc.) except for unique identifiers and fields that must be regenerated.
    -   The folder/directory should default to the source agent’s folder.
    -   If the user triggers clone from a folder-scoped listing (e.g., inside a folder view), ensure the resulting clone still lands in that folder.
    -   If the source agent has no folder (root), clone stays in root.
    -   If the folder no longer exists or is not accessible, fall back to root and show a non-blocking warning/toast @@@.
-   Technical requirements:
    -   Do a proper analysis of the current cloning implementation (client + API) before changing behavior.
    -   Ensure the folder/directory value is persisted consistently (DB field @@@, API contract @@@).
    -   Add/adjust tests @@@ (unit/integration/e2e as applicable) to prevent regressions.
    -   Keep in mind the DRY _(don't repeat yourself)_ principle.
    -   If you need to do the database migration, do it.
-   Acceptance criteria:
    -   Cloning an agent inside folder A creates the cloned agent inside folder A.
    -   Cloning an agent in root creates the cloned agent in root.
    -   Cloning via any entry point (agent profile page, context menu, folder listing) yields consistent folder placement.
    -   Behavior is documented or otherwise discoverable @@@.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🗄] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🗄] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🗄] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)