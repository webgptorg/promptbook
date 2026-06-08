[x] ~$0.00 an hour by OpenAI Codex `gpt-5.5`

---

[ ] !!

[✨🐄] Use openai-coder with api key as configured agent runner

-   This is already mid-way implemented, but it is not working, when the user enters the OpenAI API key during the installation process, then the openai-coder runner should be configured with that API key, so the user can start using it immediately after the installation is complete without the need to setup the login in interactive mode, and also without the need to create a new agent and configure it to use openai-coder runner with that API key, this will make the onboarding experience much better and smoother for the users, and also will allow them to start using the openai-coder runner with their OpenAI API key right after the installation is complete, so they can start experimenting with it and creating their own agents based on it
-   If the user enters the OpenAI API key during the installation process, then the openai-coder runner should be configured with that API key
-   All of the runners should be available, just the default behavior should be that if the user enters the OpenAI API key during the installation process, then the openai-coder runner should be configured with that API key instead of asking in interactive mode to setup the login

**This is how the Agents server is installed:**

```bash
root@collboard-agents-server-x21:~# sudo curl -fsSL https://raw.githubusercontent.com/webgptorg/promptbook/refs/heads/main/other/vps/install.sh | bash
```

This is the fail when server is set by OpenAI API key:

```bash
0|promptbook-agents-server  | 2026-06-08T15:03:45: Reading prompt from stdin...
0|promptbook-agents-server  | 2026-06-08T15:03:45: Not inside a trusted directory and --skip-git-repo-check was not specified.
0|promptbook-agents-server  | 2026-06-08T15:03:45:     at ChildProcess.handleExit (/opt/promptbook-agents-server/bin/8a90018/scripts/run-codex-prompts/common/runGoScript/runScriptUntilMarkerIdle.ts:170:56)
0|promptbook-agents-server  | 2026-06-08T15:03:45:     at ChildProcess.emit (node:events:519:28)
0|promptbook-agents-server  | 2026-06-08T15:03:45:     at ChildProcess.emit (node:domain:489:12)
0|promptbook-agents-server  | 2026-06-08T15:03:45:     at Process.ChildProcess._handle.onexit (node:internal/child_process:293:12)
0|promptbook-agents-server  | 2026-06-08T15:03:45: Logged recoverable watcher failure to /opt/promptbook-agents-server/.logs/ptbk-agent-error-2026-06-08T15-03-44-999Z.log. Continuing to watch...
0|promptbook-agents-server  | 2026-06-08T15:03:45: Processing agent-caarx8bc6ihppa with Lucy Gray.
0|promptbook-agents-server  | 2026-06-08T15:03:45: OpenAI Codex credit spending is disabled. Use `--allow-credits` to explicitly opt in.
0|promptbook-agents-server  | 2026-06-08T15:03:45: Processing messages/queued/2026-06-08-4hHKAdvpRxtbta.book
0|promptbook-agents-server  | 2026-06-08T15:03:45: /opt/promptbook-agents-server/.promptbook/agents-server/agents/agent-caarx8bc6ihppa/.promptbook/agent-messages/2026-06-08-4hHKAdvpRxtbta.sh: line 42: warning: here-document at line 25 delimited by end-of-file (wanted `CODEX_PROMPT')
0|promptbook-agents-server  | 2026-06-08T15:03:45:
0|promptbook-agents-server  | 2026-06-08T15:03:45: Reading prompt from stdin...
0|promptbook-agents-server  | 2026-06-08T15:03:45:
0|promptbook-agents-server  | 2026-06-08T15:03:45: Not inside a trusted directory and --skip-git-repo-check was not specified.
0|promptbook-agents-server  | 2026-06-08T15:03:45:
0|promptbook-agents-server  | 2026-06-08T15:03:45: Error: Command "bash /opt/promptbook-agents-server/.promptbook/agents-server/agents/agent-caarx8bc6ihppa/.promptbook/agent-messages/2026-06-08-4hHKAdvpRxtbta.sh" exited with code 1
0|promptbook-agents-server  | 2026-06-08T15:03:45:
0|promptbook-agents-server  | 2026-06-08T15:03:45: /opt/promptbook-agents-server/.promptbook/agents-server/agents/agent-caarx8bc6ihppa/.promptbook/agent-messages/2026-06-08-4hHKAdvpRxtbta.sh: line 42: warning: here-document at line 25 delimited by end-of-file (wanted `CODEX_PROMPT')
0|promptbook-agents-server  | 2026-06-08T15:03:45: Reading prompt from stdin...
0|promptbook-agents-server  | 2026-06-08T15:03:45: Not inside a trusted directory and --skip-git-repo-check was not specified.
0|promptbook-agents-server  | 2026-06-08T15:03:45:     at ChildProcess.handleExit (/opt/promptbook-agents-server/bin/8a90018/scripts/run-codex-prompts/common/runGoScript/runScriptUntilMarkerIdle.ts:170:56)
0|promptbook-agents-server  | 2026-06-08T15:03:45:     at ChildProcess.emit (node:events:519:28)
0|promptbook-agents-server  | 2026-06-08T15:03:45:     at ChildProcess.emit (node:domain:489:12)
0|promptbook-agents-server  | 2026-06-08T15:03:45:     at Process.ChildProcess._handle.onexit (node:internal/child_process:293:12)
0|promptbook-agents-server  | 2026-06-08T15:03:45: Logged recoverable watcher failure to /opt/promptbook-agents-server/.logs/ptbk-agent-error-2026-06-08T15-03-45-223Z.log. Continuing to watch...
0|promptbook-agents-server  | 2026-06-08T15:03:45: Moved messages/queued/2026-06-08-4hHKAdvpRxtbta.book to messages/failed after 3 failed attempt(s).
```

![alt text](prompts/screenshots/2026-06-0151-agents-server-use-codex-with-openai-api-key-as-default.png)
