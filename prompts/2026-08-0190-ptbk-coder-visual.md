[ ]

[✨🐹] Create a better agent visual avatar for the Promptbook coder.

```console
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md

@@@@
@@@@
┌ Session ─────────────────────────────────────────────────────────────────────────────────────┐
│ State     RUNNING  Calling codex (attempt 1)                                                 │
│ Runner   codex  ·  gpt-5.6-luna  ·  thinking max                                             │
│ Context  AGENTS.md                                                                           │
│ Test     npm run test-for-ptbk-coder                                                         │
│ Script   .promptbook/coder-prompts/2026-07-1100-ptbk-coder-test-before.sh                    │
│ This run Task 1/6  ·  0 done  ·  6 left                                                      │
│ Backlog  Repo 434 total                                                                      │
│ Timing   Elapsed 42m  ·  Total estimating...  ·  ETA after first completion                  │
│ Timing   Elapsed 37m  ·  Total estimating...  ·  ETA after first completion                  │
│ Progress ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0% complete (0/6 done) │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
│ ⠹ prompts/2026-07-1100-ptbk-coder-test-before.md#1                                           │
│ ⠇ prompts/2026-07-1100-ptbk-coder-test-before.md#1                                           │
│ Attempt 1/3  ·  Calling codex (attempt 1)                                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
│ ›     61016           58760 node.exe "C:\Users\me\.nvm\versions\node\v22.11.0\bin\\node.e... │
│ ›     22684           61016 cmd.exe  C:\WINDOWS\system32\cmd.exe /d /s /c jest --forceExit   │
│ ›     21848           22684 node.exe "node"   "C:\Users\me\work\ai\promptbook\node_module... │
│ ›     31220           21848 cmd.exe  C:\WINDOWS\system32\cmd.exe /d /s /c "ts-node src/cl... │
│ ›     37404           31220 node.exe "node"   "C:\Users\me\work\ai\promptbook\node_module... │
│ ›     30372           55788 pwsh.exe "C:\Program Files\PowerShell\7\pwsh.exe" -Command "t... │
│ › exec                                                                                       │
│ › "C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command '$testProcess = Get-Process -Id 5... │
│ › "C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command 'rg -n -C 4 "test-before|test bef... │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Controls ────────────────────────────────────────────────────────────────────────────────────┐
│  P  Pause   S  Skip current waiting   X  End with this prompt   CTRL+C  Exit                 │
```

-   @@@@@@@@@@@@@@@@@@@@
-   Use already existing time estimation of the tasks.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
