[x] ~$0.4568 an hour by OpenAI Codex `gpt-5.4`

[🧭🧩] Deprecate PERSONA commitment in favor of GOAL for inheritance + agent profile

-   Deprecate `PERSONA` commitment and use `GOAL` commitment instead for inheritance/rewriting behavior (later commitments overwrite earlier ones; with multiple goals only the last goal is relevant after rewrite).
-   Update parsing functions so that agent profile text is derived from the content of the last `GOAL` commitment (currently it is derived from the `PERSONA` commitment).
-   Deprecation: ensure `PERSONA` is treated as deprecated across the system (UI + parsing). Keep backward compatibility for now by still parsing existing books, but prefer goal for all new logic.
-   Add/adjust tests to cover:
    -   1 goal vs multiple goals: only the last goal content is used.
    -   Persona present but deprecated: profile still uses last goal.
    -   Regression: inheritance resolution still works for previously supported cases.
-   You are working with [Promptbook Engine commitment parsing and model requirements builder](src/commitments) and [book editor agent profile rendering](src/book-components)
-   You are working with [Promptbook Engine agentSource parsing pipeline](src/book-2.0)
-   Look at the Wizard modal to produce agnets with this change
-   Update changelog entry in [changelog/\_current-preversion.md](changelog/_current-preversion.md)

