[x] ~$0.1501 6 minutes by OpenAI Codex `gpt-5.4`

[✨🎂] Respect `--no-wait` flag of `ptbk coder run`

```bash
## Locally
$ npx ts-node ./src/cli/test/ptbk.ts coder run
$ npx ts-node ./src/cli/test/ptbk.ts coder run --no-wait

## On external project as dependency
$ npm install ptbk
$ ptbk coder run
$ ptbk coder run --no-wait
```

-   This flag should work but it doesnt
-   When not present it should wait for user input during the coding
-   Now it doesnt wait even if the flag is not present, it just finishes immediately after coding and git operations without waiting for user input
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🎂] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🎂] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🎂] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)
