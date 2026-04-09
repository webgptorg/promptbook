[ ]

[✨👜] `ptbk coder` must work standalone in external project

```bash
me@DESKTOP-2QD9KQQ MINGW64 ~/work/promptbook-experiments-and-landing-pages/aldaron (landing-page/main)
$ npx ptbk coder generate-boilerplates --count 10 --template agents-server
(node:26384) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
🚀  Generate prompt boilerplate files
ENOENT: no such file or directory, open 'C:\Users\me\work\promptbook-experiments-and-landing-pages\aldaron\scripts\generate-prompt-boilerplate\templates\agents-server.template.md'

me@DESKTOP-2QD9KQQ MINGW64 ~/work/promptbook-experiments-and-landing-pages/aldaron (landing-page/main)
$ npx ptbk coder generate-boilerplates --count 10
(node:33508) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
🚀  Generate prompt boilerplate files
ENOENT: no such file or directory, open 'C:\Users\me\work\promptbook-experiments-and-landing-pages\aldaron\scripts\generate-prompt-boilerplate\templates\common.template.md'

me@DESKTOP-2QD9KQQ MINGW64 ~/work/promptbook-experiments-and-landing-pages/aldaron (landing-page/main)
$


```

-   Boilerplate templates should be located in the project itself and the `--template foo/bar/agents-server.md` should be path to the template file relative to the project root, not relative to the `ptbk` package
-   The `ptbk init` command should create the default boilerplate templates in the project itself, so they can be used and customized by the users of `ptbk coder` without need to modify `ptbk` package itself
-   When `--template` not specified, it should just create the boilerplates based on the default template which is internally used in `ptbk coder init`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Also update [`terminals.json` file with local workflows that codes on Promptbook itself](.vscode/terminals.json) and the templates used in the Promptbook workflow itself
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[ ]

[✨👜] Enhance `ptbk coder init` to work standalone in external project

```bash
$  npx ptbk coder init
(node:31120) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Promptbook coder configuration initialized.
- prompts/: unchanged
- prompts/done/: unchanged
- .env: unchanged
- Required coder env variables are already present.

```

-   Add checkmarks before each point ✔
-   Add into `gitignore` if not present:

```
# Prmptbook Coder
/.tmp
```

-   Add scripts into `package.json` to do:
    -   npx ptbk coder generate-boilerplates
    -   npx ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md --no-wait
    -   npx ptbk coder find-refactor-candidates
    -   npx ptbk coder verify
-   Into VSCode setting should be added that images in `prompts` folder are put into `prompts/screenshots` _(look at current solution and put same thing into `ptbk coder init` .vscode/settings.json)_
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨👜] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨👜] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
