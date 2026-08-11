[x] by OpenAI Codex `gpt-5.6-terra` thinking `max` (ChatGPT account) - Implementation ~$0.8889 an hour; Testing 23 minutes

---

[ ] !!!!!!

[✨➝] Automatically check that the Promptbook CLI is up to date.

-   When the Promptbook CLI is started and runs in interactive mode, it should check if the Promptbook CLI is up to date. If not, it should ask the user if he wants to update it.
-   This is relevant when you run `ptbk` locally or globally
-   When the Promptbook is running locally, update the dependencies or dev dependencies in the package.json.
-   When the Promptbook is running globally, update the harnesses globally
-   When the Promptbook is installed in both places, update them both.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
    -   There is already checking that the harnesses are up to date. Check if you can share some code with this checking.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
