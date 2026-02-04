[ ] !

[✨🦁] Allow to ignore non-empty Git work tree in coding agent script.

When the Git work tray isn't clean, the coding agent fails on error:

```bash
$ npx ts-node ./scripts/run-codex-prompts/run-codex-prompts.ts --agent openai-codex
Running prompts with codex
Done: 29 | For agent: 12 | To be written: 4
Following prompts need to be written:
  1) ...

Upcoming tasks (grouped by priority):
...
Next prompt:
 ...
Press Enter to start the first task...
Error in run-codex-prompts.ts
Error: Git working tree is not clean. Aborting.
    at ensureWorkingTreeClean (C:\Users\me\work\ai\promptbook\scripts\run-codex-prompts\git\ensureWorkingTreeClean.ts:9:15)
    at processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async runCodexPrompts (C:\Users\me\work\ai\promptbook\scripts\run-codex-prompts\main\runCodexPrompts.ts:99:9)

```

But allow to bypass this rule with a flag `--ignore-git-changes`

```bash
$ npx ts-node ./scripts/run-codex-prompts/run-codex-prompts.ts --agent openai-codex --ignore-git-changes
Running prompts with codex
Done: 29 | For agent: 12 | To be written: 4
Following prompts need to be written:
  1) ...

Upcoming tasks (grouped by priority):
...
Next prompt:
 ...
Press Enter to start the first task...
... working on the prompts ...
```

-   Do not change the script in any other way, just add this flag.
-   This is relavant for every coding agent runner
-   You are working with the [coding agent script](./scripts/run-codex-prompts/run-codex-prompts.ts)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🦁] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🦁] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🦁] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
