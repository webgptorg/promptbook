[x] ~$0.4356 21 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🚼] When I try use Promptbook CLI on an external project, these errors are happening. Fix them:

```bash
$ ptbk about
CWD must be root of the project
```

```bash
$ ptbk about
/usr/bin/ptbk: line 1: ts-node: command not found
```

```bash
$ ptbk about
Error: Cannot find module 'playwright'
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Promptbook CLI](src/cli/test/ptbk.ts)

---

[x] ~$0.9165 15 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🚼] The `ptbk coder run` should run on locally configured agent NOT old promptbook.studio login

**The script from Promptbook CLI:**

```bash
$ npx ptbk coder run  --agent openai-codex --model gpt-5.3-codex
You will be logged in to https://promptbook.s5.ptbk.io
If you don't have an account, it will be created automatically.
? Enter your email: »

```

Should work exactly as the local script:

```bash
npx ts-node ./src/cli/test/ptbk.ts coder run --agent openai-codex --model gpt-5.3-codex
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle, theese two scripts should be unified and work the same way. The login should be in one place and should work the same way for both local and global run of the Promptbook CLI. - It should be **the same script**, just run with `npx` or with `ts-node` directly.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Promptbook CLI](src/cli/test/ptbk.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$1.27 14 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🚼] Implement

```bash
$ npx ptbk coder init
$ npx ptbk coder initialize
```

-   This will initialize all the needed configuration for the Promptbook coder cli in external project
-   The `init` and `initialize` are aliases
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Promptbook CLI](src/cli/test/ptbk.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚼] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Promptbook CLI](src/cli/test/ptbk.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚼] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Promptbook CLI](src/cli/test/ptbk.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚼] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Promptbook CLI](src/cli/test/ptbk.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚼] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Promptbook CLI](src/cli/test/ptbk.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚼] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Promptbook CLI](src/cli/test/ptbk.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)


