[ ]

[✨🖕] When `ptbk coder` is using `--test-before yes-and-fix` and the test will do changes in the repository, do not fail but commit them

```console
me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook (main)
$ ptbk coder run --harness claude-code --model claude-opus-5 --thinking-level max --agent agents/coding/developer.book --context AGENTS.md --test npm run test-for-ptbk-coder --test-before yes-and-fix  --auto-pull --auto-push
✔ Claude Code 2.1.228 is up to date.


│ State     LOADING  Checking the working tree...                                              │
│ Runner   claude-code  ·  claude-opus-5  ·  thinking max                                      │
│ Context  AGENTS.md                                                                           │
│ Test     npm run test-for-ptbk-coder                                                         │
│ This run Task 1/2  ·  0 done  ·  2 left                                                      │
│ Backlog  Repo 425 total                                                                      │
│ Scope    All priorities  ·  Write 124 prompts first                                          │
│ Timing   Elapsed 19m  ·  Total estimating...  ·  ETA after first completion                  │
│ Progress ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0% complete (0/2 done) │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Queue ───────────────────────────────────────────────────────────────────────────────────────┐
│ Checking the working tree...                                                                 │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Live output ─────────────────────────────────────────────────────────────────────────────────┐
│ › 🔒 Migration lock acquired                                                                 │
│ › 🏗️ Migrating prefix: "server_PavolHejny_"                                                 │
│ › ✅ Automatic database migration check finished for prefix "server_PavolHejny_"              │
│ › (node:38560) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please ... │
│ › (Use `node --trace-deprecation ...` to show where the warning was created)                 │
│ › Prerendered home page and saved to C:\Users\me\work\ai\promptbook\apps\agents-server\.n... │
│ › 🎉 All tests passed!                                                                       │
│ › Pre-coding tests passed.                                                                   │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Controls ────────────────────────────────────────────────────────────────────────────────────┐
│  P  Pause   X  End with this prompt   CTRL+C  Exit                                           │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
Tip: `ptbk coder run` used your default Git config because the coding-agent identity environment variables are incomplete.
For cleaner commit history, set `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, and either `CODING_AGENT_GIT_SIGNING_KEY` or `CODING_AGENT_GPG_KEY_ID`.
Error
Error: Git working tree is not clean.

Please commit or stash your changes before running this script
OR run script with flag --ignore-git-changes


Aborting
    at ensureWorkingTreeClean (C:\Users\me\work\ai\promptbook\scripts\run-codex-prompts\git\ensureWorkingTreeClean.ts:10:15)
    at processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async runCodexPrompts (C:\Users\me\work\ai\promptbook\scripts\run-codex-prompts\main\runCodexPrompts.ts:243:17)
    at async C:\Users\me\work\ai\promptbook\src\cli\cli-commands\coder\run.ts:256:17
    at async Command.<anonymous> (C:\Users\me\work\ai\promptbook\src\cli\cli-commands\common\handleActionErrors.ts:35:13)

me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook (main)
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
