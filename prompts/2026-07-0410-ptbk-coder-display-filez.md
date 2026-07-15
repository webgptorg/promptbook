[x] ~$0.4251 an hour by OpenAI Codex `gpt-5.5`

[✨🦏] Show the full paths to a files in ptbk coder in the terminal UI

```console
ptbk coder run --harness openai-codex --model gpt-5.6 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md --test npm run test-for-ptbk-coder --limit 1


┌ Session ─────────────────────────────────────────────────────────────────────────────────────┐
│ State     WAITING  Waiting 9m of 10m before retrying after error...                          │
│ Runner   codex  ·  gpt-5.6  ·  thinking xhigh                                                │
│ Context  AGENTS.md                                                                           │
│ Test     npm run test-for-ptbk-coder                                                         │
│ Script   .promptbook/coder-prompts/2026-07-0480-agents-server-browser-preview.sh             │
│ This run Task 1/1  ·  0 done  ·  1 left                                                      │
│ Backlog  Repo 384 total                                                                      │
│ Scope    Priority ≥0  ·  Limit 1 prompt run  ·  Write 118 prompts first                      │
│ Timing   Elapsed 14s  ·  Total estimating...  ·  ETA after first completion                  │
│ Progress ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0% complete (0/1 done) │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Current task ────────────────────────────────────────────────────────────────────────────────┐
│ prompts/2026-07-0480-agents-server-browser-preview.md#1                                      │
│ Attempt 1/3  ·  Waiting 9m of 10m before retrying after error...                             │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Live output ─────────────────────────────────────────────────────────────────────────────────┐
│ ›     -   `PERSONA You are a helpful assistant that helps with cooking recipes.`             │
│ ›     -   `USE SEARCH ENGINE Search only in French.`                                         │
│ › -   In the commitment context, you can reference external agents, for example:             │
│ ›     -   `TEAM You can talk to {Criminal lawyer} and {Financial advisor}`                   │
│ › warning: Model metadata for `gpt-5.6` not found. Defaulting to fallback metadata; this ... │
│ › ERROR:                                                                                     │
│ › {"type":"error","status":400,"error":{"type":"invalid_request_error","message":"The 'gp... │
│ › ERROR: {"type":"error","status":400,"error":{"type":"invalid_request_error","message":"... │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Errors ──────────────────────────────────────────────────────────────────────────────────────┐
│ ✗ Command "bash /Users/hejny/work/promptbook/.promptbook/coder-prompts/2026-07-0480-agent... │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Controls ────────────────────────────────────────────────────────────────────────────────────┐
│  P  Pause   CTRL+C  Exit                                                                     │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

-  The file referenced in "Errors" section is trimmed so it cannot be clicked to navigate
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)