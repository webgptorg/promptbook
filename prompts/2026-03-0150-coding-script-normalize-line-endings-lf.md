[ ]

[✨🥃] Automatically normalize line endings to LF after each coding script round

-   After each round of the coding script (after AI changes are applied / files are written), detect all files changed in that round and normalize their line endings from CRLF to LF.
-   This should be automatic (no manual step) and applied only to files changed in the round to avoid rewriting the whole repository.
-   Keep the implementation cross-platform (macOS/Linux/Windows runners) and robust for text files.
-   Do not corrupt binaries; skip binary files (detect by extension and/or by presence of NUL bytes).
-   Prefer doing the normalization in the coding script itself (or its immediate wrapper), not in git settings only (AI might still output CRLF content).
-   Consider adding a small config/flag to disable the behavior for debugging (default: enabled).
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with coding script `ts-node ./src/cli/test/ptbk.ts coder`
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🥃] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🥃] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🥃] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🥃] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
