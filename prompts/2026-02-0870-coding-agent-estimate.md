[ ] !!

[✨🚞] Add progress to the coding agent.

-   When the Coding Agent script is running with `--no-wait` user has no chance to see the progress.
-   It should be always visible at the top of the CLI terminal. Use `colors` to highlight ot with white background.
-   Above the progress bar, the codex, claude code or whatever Coding Agent runner output is emitted in real-time.
-   It should look like `5/11 Prompts | 33% | 3h/9h | Estimated done Tomorrow 2:30`
-   The "5/11" represents the number of prompts (not the files but all prompts) that have been completed out of the total number of prompts.
-   The "33%" is the percentage of completion, calculated based on the number of prompts completed out of the total prompts.
-   The "3h/9h" represents the elapsed time (3 hours) and the estimated total time souly based on the elapsed time and the prompts completed so far
-   The "Estimated done Tomorrow 2:30" is the estimated completion time, calculated based on the elapsed time and the percentage of completion. Use `moment` library to calculate the estimated completion time and display it in a human-readable format.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the coding agent script before you start implementing.
-   You are working with the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)

---

[-]

[✨🚞] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the coding agent script before you start implementing.

---

[-]

[✨🚞] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the coding agent script before you start implementing.

---

[-]

[✨🚞] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the coding agent script before you start implementing.
