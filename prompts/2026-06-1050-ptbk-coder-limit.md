[x] $1.44 23 minutes by Claude Code

[✨🦝] Add `--limit` option to `ptbk coder run`

```bash
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --limit 2
```

-   When set, the `--limit` option will limit the number of runs and will stop the execution after the limit is reached
-   By default, limit isnt set
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Look at [the dev scripts in `terminals.json`](.vscode/terminals.json) and add script for zig-zag between Codex and Claude using `--limit 1` option
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[ ]

[✨🦝] When `--limit` option is used with `ptbk coder run`, show the limit in the terminal UI

```bash
ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --limit 2
```

**But nothing is shown in the terminal UI about the limit, so add it to the terminal UI:**

```console
┌ Session ─────────────────────────────────────────────────────────────────────────────────────┐
│ State     ERROR  Recording prompt failure                                                    │
│ Runner   claude-code  ·  claude-opus-4-8  ·  thinking max                                    │
│ Context  AGENTS.md                                                                           │
│ Test     npm run test-for-ptbk-coder                                                         │
│ Script   .promptbook/coder-prompts/2026-07-0030-specs.sh                                     │
│ This run Task 1/9  ·  0 done  ·  9 left                                                      │
│ Backlog  Repo 353 total                                                                      │
│ Scope    Priority ≥0  ·  Write 114 prompts first                                             │
│ Timing   Elapsed 21m  ·  Total estimating...  ·  ETA after first completion                  │
│ Progress ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0% complete (0/9 done) │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Current task ────────────────────────────────────────────────────────────────────────────────┐
│ prompts/2026-07-0030-specs.md#1                                                              │
│ Attempt 1/3  ·  Recording prompt failure                                                     │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Live output ─────────────────────────────────────────────────────────────────────────────────┐
│ › it · resets 7:50pm (Europe/Prague)","stop_reason":"stop_sequence","session_id":"dcbcc8d... │
│ › {"type":"system","subtype":"init","cwd":"C:\\Users\\me\\work\\ai\\promptbook","session_... │
│ › ,"claude_code_version":"2.1.199","output_style":"default","agents":["claude","Explore",... │
│ › {"type":"system","subtype":"status","status":"requesting","uuid":"06cea158-151a-480d-87... │
│ › {"type":"rate_limit_event","rate_limit_info":{"status":"rejected","resetsAt":1783360200... │
│ › {"type":"assistant","message":{"id":"5d6ee51e-a701-4ebb-ae28-2883a8be5fdd","container":... │
│ › {"type":"result","subtype":"success","is_error":true,"api_error_status":429,"duration_m... │
│ › it · resets 7:50pm (Europe/Prague)","stop_reason":"stop_sequence","session_id":"b802887... │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Errors ──────────────────────────────────────────────────────────────────────────────────────┐
│ ✗ {"type":"system","subtype":"init","cwd":"C:\\Users\\me\\work\\ai\\promptbook","session_... │
│ ✗ {"type":"system","subtype":"init","cwd":"C:\\Users\\me\\work\\ai\\promptbook","session_... │
│ ✗ {"type":"system","subtype":"init","cwd":"C:\\Users\\me\\work\\ai\\promptbook","session_... │
│ ✗ {"type":"system","subtype":"init","cwd":"C:\\Users\\me\\work\\ai\\promptbook","session_... │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Controls ────────────────────────────────────────────────────────────────────────────────────┐
│  P  Pause   CTRL+C  Exit                                                                     │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
