[ ] !!!

[✨𓀑] The Agents server is constantly looping through `/api/internal/user-chat-jobs/run`

-   There is a possible memory leak in the Agents server that is causing it to constantly loop through `/api/internal/user-chat-jobs/run`
-   The Agents server is working fine, but it is constantly looping through `/api/internal/user-chat-jobs/run`
-   Maybe its just agresively set up crone job, if so, just tweak it bit down
-   Analyze where and if its a problem and fix it
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

```bash
me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook (main)
$ npx ts-node ./src/cli/test/ptbk.ts agents-server dev --harness github-vel xhigh --port 4440 --no-ui
Starting Promptbook Agents Server on port 4440 in development mode.
[next]    ▲ Next.js 15.4.11
[next]    - Local:        http://localhost:4440
[next]    - Network:      http://172.25.32.1:4440
[next]    - Environments: .env
[next]    - Experiments (use with caution):
[next]      ✓ externalDir
[next]      · clientTraceMetadata
[next]  ✓ Starting...
[next]  ○ Compiling /instrumentation ...
[next]  ✓ Compiled /instrumentation in 6.6s (1453 modules)
[next]  ✓ Ready in 18s
[next]  ○ Compiling /api/internal/agent-runner-limits ...
[next]  ✓ Compiled /api/internal/agent-runner-limits in 21.3s (4681 modules)
[next] (node:15672) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
[next] (Use `node --trace-deprecation ...` to show where the warning was created)
Watching direct child agent repositories for queued messages.
[next]  GET /api/internal/agent-runner-limits 200 in 30529ms
[next]  ○ Compiling /api/internal/user-chat-jobs/run ...
[next]  ✓ Compiled /api/internal/user-chat-jobs/run in 4.8s (4684 modules)
[next]  POST /api/internal/user-chat-jobs/run 200 in 6617ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 71ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 56ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 335ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 65ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 53ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 59ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 65ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 79ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 64ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 52ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 48ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 48ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 50ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 65ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 41ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 65ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 109ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 124ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 115ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 111ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 112ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 104ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 98ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 107ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 90ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 101ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 131ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 143ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 117ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 115ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 112ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 93ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 88ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 90ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 100ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 104ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 100ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 95ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 134ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 151ms
[next]  POST /api/internal/user-chat-jobs/run 200 in 132ms
```
