[ ]

[✨✊] Coding script auto-migrate test servers after each prompt + non-destructive checks

-   *(@@@@ Written by agent)*
-   Only run the auto-migration workflow when the coding script is started with `--auto-migrate`.
    -   Without `--auto-migrate`, do not run any migrations automatically.
-   After each prompt is done in the coding script, automatically run database migrations for testing servers.
-   Do this in a robust way so that we don't end up running migrations concurrently, and so that a migration failure doesn't silently corrupt the next runs.
-   Add a heuristic “non-destructive migration” check before applying migrations to testing servers.
    -   The goal is not perfect proof but a strong guardrail.
    -   Detect and block obviously destructive statements like `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE FROM <table>` without `WHERE`, etc.
    -   If a migration is flagged as destructive, require an explicit override flag (or config) in the coding script to proceed.
-   The migration itself should still be executed against the testing servers (not only locally) as part of the same automation, so that testing environments match what the prompts expect.
-   Add clear logs so it’s easy to tell: migration started, what was applied, heuristic verdict, migration finished.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [coding script](scripts/run-codex-prompts/run-codex-prompts.ts)
    -   Also check any adjacent files used for running prompts / orchestration / deployment hooks @@@
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨✊] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨✊] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨✊] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
