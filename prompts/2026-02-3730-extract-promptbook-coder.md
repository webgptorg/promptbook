[x] $2.62 20 minutes by Claude Code

[✨🌶] Extract Promptbook Coder to a `ptbk` CLI utility.

-   There are several utilities which help with automated coding. Extract these into the `ptbk` CLI utility.
-   In this repository, we will be using this utility internally.
-   The same coding utilities when they install `npm i ptbk` or `npm i @promptbook/cli`
-   Preserve all the existing functionalities in the Promptbook CLI just add new `ptbk coder` command which will have the coding utilities.
-   By coding utilities I mean:
    -   `scripts/generate-prompt-boilerplate` -> `ptbk coder generate-prompt-bopilerplates`
    -   `scripts/find-refactor-candidates` -> `ptbk coder find-refactor-candidates`
    -   `scripts/run-codex-prompts` -> `ptbk coder run`
    -   `scripts/verify-prompts` -> `ptbk coder verify`
    -   `scripts/find-fresh-emoji-tag` -> `ptbk coder find-fresh-emoji-tag`
-   Preserve the flags and the auto-committing features.
-   Use `commander` to implement the CLI utility. _(it is already used in the Promptbook CLI, just do it for all new commands)_
-   The logic of the transfer should be that you are preserving the structure and logic of the `ptbk` CLI utility and just moving the coding utilities there, not changing them much, just making them work in the new structure. So the coding utilities should be as they are, but just in a different place and with a different way to call them.
-   Upldate all the usage of theese utilities in the usage, there are lot of places and scripts which are using these utilities, update them to use the new `ptbk coder` command; Be aware that externally _(when someone outside using Promptbook CLI)_ calls `ptbk about` but internally _(when inside here, in Promptbook, repository, using Promptbook CLI)_ we call `npx ts-node ./src/cli/test/ptbk.ts about`
-   Keep in mind the DRY _(don't repeat yourself)_ principle, same coding utilities should be used in the Promptbook CLI and in the `ptbk` CLI utility with no duplicated code.
-   Do a proper analysis of the current functionality or the coding scripts and ptbk CLI utility and how Promptbook repository is structured before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌶] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌶] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌶] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

