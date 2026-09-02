[ ]

[✨🆓] bar

```bash
@@@

npm install ptbk

ptbk coder init

ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md
```

-   @@@@@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![alt text](screenshots/2026-08-0810-ptbk-coder-smarter-waiting-for-limit.png)
![alt text](screenshots/2026-08-0810-ptbk-coder-smarter-waiting-for-limit-1.png)
![alt text](screenshots/2026-08-0810-ptbk-coder-smarter-waiting-for-limit-2.png)
![For claude code the waiting is working](screenshots/2026-08-0810-ptbk-coder-smarter-waiting-for-limit-3.png)
![alt text](screenshots/2026-08-0810-ptbk-coder-smarter-waiting-for-limit-4.png)
