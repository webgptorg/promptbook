[ ] !!

[✨🌐] Allow to run `ptbk` without `npx`

```bash
$ npm install ptbk


# Working
$ npx ptbk ...
$ npx ptbk coder
...

# Not working
$ ptbk

/usr/bin/ptbk: line 1: ts-node: command not found

```

-   Now, `ptbk` can only be run with `npx`, allow to run it without `npx` as well
-   Installing `ptbk` either locally or globally with `npm install ptbk` / `npm install -g ptbk` should allow to run `ptbk` without `npx`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk` and related functionality before you start implementing.
-   You are working with [`ptbk`](src/cli/cli-commands/)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🌐] foo

```bash
@@@

npm install ptbk

ptbk coder init

ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🌐] foo

```bash
@@@

npm install ptbk

ptbk coder init

ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🌐] foo

```bash
@@@

npm install ptbk

ptbk coder init

ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
