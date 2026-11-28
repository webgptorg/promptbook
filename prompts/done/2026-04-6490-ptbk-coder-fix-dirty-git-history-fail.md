[x] $2.47 an hour by OpenAI Codex `gpt-5.4`

[✨🖨] Fix failing `ptbk coder run`

**When running:**

```bash
ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md
```

It commits the done task but it leaves with single missing commited file and the following taks ends up in the error:

```
...
┌ Session ─────────────────────────────────────────────────────────────────────────────────────┐
│  LOADING  Loading prompts...                                                                 │
│ Working on 2/57 prompts with Priority ≥0                                                     │
│ Done 1/57 this run  ·  Repo total 646                                                        │
│ Write first 82 prompts                                                                       │
│ Elapsed 0s  ·  Est. total 0s  ·  Est. done Today 2:00                                        │
│ █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2% complete (1/57 done)   │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Current task ────────────────────────────────────────────────────────────────────────────────┐
│ ⠦ prompts/2026-04-4080-agents-server-background-worker-lease.md#1                            │
│ Attempt 1/3  ·  Loading prompts...                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Live output ─────────────────────────────────────────────────────────────────────────────────┐
│ › 🔒 Migration lock acquired                                                                 │
│ › 🏗️ Migrating prefix: "server_PavolHejny_"                                                 │
│ › ✅ Automatic database migration check finished for prefix "server_PavolHejny_"              │
│ › (node:49652) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please ... │
│ › (Use `node --trace-deprecation ...` to show where the warning was created)                 │
│ › importAgent "https://core-test.ptbk.io/agents/adam"                                        │
│ › Prerendered home page and saved to C:\Users\me\work\ai\promptbook\apps\agents-server\.n... │
│ › "🎉 All tests passed!"                                                                     │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Controls ────────────────────────────────────────────────────────────────────────────────────┐
│  P  Pause   CTRL+C  Exit                                                                     │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
Error──────────────────────────────────────────────────────────────────────────────────────────┘
Error: Git working tree is not clean.──────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────────────────────────────┘
Please commit or stash your changes before running this script─────────────────────────────────┘
OR run script with flag --ignore-git-changes───────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────────────────────────────┘
Aborting
    at ensureWorkingTreeClean (C:\Users\me\work\ai\promptbook\scripts\run-codex-prompts\git\ensureWorkingTreeClean.ts:10:15)
    at processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async runCodexPrompts (C:\Users\me\work\ai\promptbook\scripts\run-codex-prompts\main\runCodexPrompts.ts:342:17)
    at async C:\Users\me\work\ai\promptbook\src\cli\cli-commands\coder\run.ts:209:17
    at async Command.<anonymous> (C:\Users\me\work\ai\promptbook\src\cli\cli-commands\common\handleActionErrors.ts:24:13)

```

The file which is left is `.log.txt` file:

![alt text](prompts/screenshots/2026-04-6490-ptbk-coder-fix-dirty-git-history-fail.png)

-   Fix this problem, each task should self-contain everything in its own one commit, and it should not leave any uncommited changes after it finishes
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🖨] baz

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
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🖨] baz

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
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🖨] baz

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
-   Add the changes into the [changelog](changelog/_current-preversion.md)
