[x] by Claude Code `claude-opus-5` thinking `max` - Implementation $4.44 35 minutes; Testing 34 minutes

[✨➝] Automatically check that the harness is installed and up to date. 

```bash
ptbk coder init

ptbk coder run --harness github-copilot --model gpt-5.4 --thinking-level xhigh --agent agents/coding/developer.book --context AGENTS.md
```

-   When running the harnesses, for example Claude Code or OpenAI Codex, automatically check that this harness is installed globally and also up-to-date. 
- If it's not installed or up to date, ask the user if he wants to install or update it. 
- This should be implemented for all the supported harnesses and applied for the harness which is currently used. 
- Every time that the harness is run, check the installed version and compare it to the newest version. 
- When using coder init, it should also check that the Codex and Claude Code harnesses are installed and up to date.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

