[ ]

[✨✊] Coding script auto-migrate test servers after each prompt

-   Only run the auto-migration workflow when the coding script is started with `--auto-migrate`.
    -   Without `--auto-migrate`, do not run any migrations automatically.
-   After each prompt is done in the coding script, automatically run database migrations for testing servers.
-   Do this in a robust way so that we don't end up running migrations concurrently, and so that a migration failure doesn't silently corrupt the next runs.
-   Add a heuristic “non-destructive migration” check before applying migrations to testing servers.
    -   Heuristic should be Regex-based and look for destructive SQL statements in the migration files.
    -   The goal is not perfect proof but a strong guardrail.
    -   Detect and block obviously destructive statements like `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE FROM <table>` without `WHERE`, etc.
    -   If a migration is flagged as destructive, require an explicit override flag (or config) in the coding script to proceed.
-   The migration itself should still be executed against the testing servers
    -   `npx tsx ./src/database/migrate.ts --only=local0_,server_CoreTest_,server_S6_,server_S7_,server_S8_,server_S9_,server_S10_,server_S11_,server_S12_,server_S13_,server_PavolHejny_,server_Praha13Test_,server_ChutooTest_,server_NeonMedia_`
-   Keep in mind the DRY _(don't repeat yourself)_ principle, there is already logic for running migrations you are only connecting it to the coding script and adding the heuristic check.
-   Do a proper analysis of the current functionality of coding script and migrations and `terminals.json` before you start implementing.
-   You are working with the [coding script](scripts/run-codex-prompts/run-codex-prompts.ts)
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
