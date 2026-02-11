[ ]

[✨♑️] Make script that can verify which prompts are done.

-   There is the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts) which can run prompts and mark them done.
-   The done prompts are directly in the `prompts` folder on the top level of the project with `[x]`
-   List all the files which are on the top level, and all of the prompts are marked as done `[x]` _(no prompt has `[ ]`)_
-   Go one by one and ask user if the prompt is done, provide theese options and wait:
    1. Done -> The script will move the prompts under the `prompts/done` folder
    2. Not done -> The script will add another prompt in this file using template:

```markdown
[ ]

[✨♑️] Fix "foo"

-   \@\@\@
-   You have implemented the "foo" feature, but it is not working, fix it
```

-   Instead of `[✨♑️]` put the same emoji as the previous prompt, and instead of "Fix "foo"" put the title of the previous prompt with "Fix" at the beginning.
-   This will go in loop until all the prompts in this folder are resolved.
-   When the script is terminated. It doesn't matter because the script can run once again anytime and resume on the last unresolved prompt file.
-   Use some nice terminal UI and UX
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Register it in the `.vscode/terminals.json`
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨♑️] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨♑️] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨♑️] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
