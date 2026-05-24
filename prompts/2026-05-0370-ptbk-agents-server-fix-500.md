[x] ~$0.2828 41 minutes by OpenAI Codex `gpt-5.5`

[✨🫖] Fix `ptbk agents-server start` "Internal user chat worker returned 500 Internal Server Error."

```bash
│ ✗ Internal user chat worker returned 500 Internal Server Error.                              │
│ ✗ Internal user chat worker returned 500 Internal Server Error.                              │
│ ✗ Internal user chat worker returned 500 Internal Server Error.                              │
│ ✗ Internal user chat worker returned 500 Internal Server Error.                              │
│ ✗ Internal user chat worker returned 500 Internal Server Error.                              │
│ ✗ Internal user chat worker returned 500 Internal Server Error.                              │
│ ✗ Internal user chat worker returned 500 Internal Server Error.                              │
│ ✗ Internal user chat worker returned 500 Internal Server Error.                              │
│ ✗ Internal user chat worker returned 500 Internal Server Error.                              │
│ ✗ Internal user chat worker returned 500 Internal Server Error.                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
┌ Controls ────────────────────────────────────────────────────────────────────────────────────┐
│  P  Pause   CTRL+C  Exit                                                                     │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook (main)
$ npx ts-node ./src/cli/test/ptbk.ts agents-server start --agent github-copilot --model gpt-5.4 --thinking-level xhigh --port 4440
```

-   Server is working and responding as expected despite the error, but the error is filling the logs and may indicate some underlying issue BUT may also just be a misleading error message or a non-critical issue with the internal user chat worker that doesn't affect the main server functionality. Either way, it should be investigated and fixed or at least properly logged to clarify the situation.
-   Both draft and real answer in chat is working as supposed
-   Fix the error or at least log more details about it to help with debugging.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk agents-server` and related functionality before you start implementing.
-   Look at [the logs](.logs)
-   You are working with [`ptbk agents-server start`](src/cli/cli-commands/agents-server/run.ts)
