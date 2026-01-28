[ ] !!!!!!!

[✨👏] Coding agent should always wait before the next prompt is started.

-   The waiting should work as follows:

    -   **(Already implemented)** Show the summary of all the prompts to be run and wait _(for user pressing enter)_
    -   **(Already implemented)** ... running prompt 1 ...
    -   **(Already implemented)** Wait _(for user pressing enter)_ before commmiting prompt 1
    -   **(TO BE IMPLEMENTED)** Show the summary of the prompt 2 to be run and wait _(for user pressing enter)_
    -   **(Already implemented)** ... running prompt 2 ...
    -   **(Already implemented)** Wait _(for user pressing enter)_ before commmiting prompt 2
    -   **(TO BE IMPLEMENTED)** Show the summary of the prompt 3 to be run and wait _(for user pressing enter)_
    -   **(Already implemented)**... running prompt 3 ...
    -   ...

-   This doesn't apply when the flag `--no-wait` is used.
-   You are working with the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)
-   Do not change the script in any other way, just waiting before each prompt is started.
-   This is relavant for all runners.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
