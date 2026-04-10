[x] ~$0.3575 16 minutes by OpenAI Codex `gpt-5.4`

[✨🥊] Allow to pass thinking level into `ptbk coder run`

```bash
## Locally
$ npx ts-node ./src/cli/test/ptbk.ts coder run --thinking-level xhigh

## On external project as dependency
$ npm install ptbk
$ ptbk coder run --thinking-level xhigh
```

-   It should work with or without the flag
-   Implement it for OpenAI Codex and Github Copilot
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Also update [`terminals.json` file with local workflows that codes on Promptbook itself](.vscode/terminals.json)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[x] ~$0.00 28 minutes by GitHub Copilot `gpt-5.4`

[✨🥊] Add `--level` flag to `ptbk coder find-refactor-candidates`

```bash
ptbk coder find-refactor-candidates --level xhigh
```

-   The levels are `low`, `medium`, `high`, `xhigh`
-   Current configuration is `medium` but it should be possible to change it via the flag
-   The level should be passed to the cli and this should set the standards to find refactor candidates, for example `xhigh` should find more candidates and be more aggressive in finding them, while `low` should be more conservative and find only the most obvious candidates
-   Every level should have its own configuration about how many lines of code should be in a file, how many functions, how complex they should be, etc. This configuration should be used in the implementation of the `find-refactor-candidates` command
-   Extract this configuration into a separate file and use it in the implementation of the command
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[x] ~$0.00 30 minutes by GitHub Copilot `gpt-5.4`

[✨🥊] Modify `--level` flag in `ptbk coder find-refactor-candidates`

```bash
ptbk coder find-refactor-candidates --level xhigh
```

-   The levels are `low`, `medium`, `high`, `xhigh` add `extreme` and `xlow` level as well
-   The levels should have bigger spread, for example `xlow` should be very benevolent and find only the most obvious candidates, while `extreme` should be very aggressive and find a lot of candidates, even the ones that are not very good but could be improved
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[x] ~$0.00 17 minutes by GitHub Copilot `gpt-5.4`

[✨🥊] Respect `.gitignore` in `ptbk coder find-refactor-candidates`

```bash
ptbk coder find-refactor-candidates
```

-   This script finds refactor candidates in the codebase
-   Before searching for candidates, it should read the `.gitignore` file and ignore the files and directories specified in it. For example if there is `node_modules` in the `.gitignore`, the script should not search for refactor candidates in the `node_modules` directory
-   Also do not hardcode any specific path to the script itself, this should be dynamic and work in any (typescript) project, it should find the `.gitignore` file in the project and read it
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[ ]

[✨🥊] Level of `ptbk coder find-refactor-candidates` should have much bigger spread between levels

```bash
ptbk coder find-refactor-candidates --level xlow
ptbk coder find-refactor-candidates --level extreme
```

-   This script finds refactor candidates in the codebase
-   Before searching for candidates, it should read the `.gitignore` file and ignore the files and directories specified in it. For example if there is `node_modules` in
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.

---

[-]

[✨🥊] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🥊] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
