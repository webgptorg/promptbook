[ ] !!!

[✨🤟] When the agent runner fails 3x do not try forever but fail

-   Now when there is some problem (for example exceeded limit or invalid API key) and the agent runner infinitelly retries
-   After 3 retries it should fail and stop retrying, so it does not consume resources and does not cause infinite loop of retries, which can be problematic and can cause issues on the server, so it is better to fail after 3 retries and show some meaningful message to the user that the agent runner has failed and stopped retrying, so they know what is going on and that they need to fix the issue before trying again
-   The 3x should be taken from limits of the server which is configurable in `/admin/tool-limits`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

```bash
eated automatically when using the SQL tool for the first time.</sql_tables>\n</system_reminder>","attachments":[],"supportedNativeDocumentMimeTypes":[],"interactionId":"1f11cd52-29ea-41d6-ac74-d3c315e95806","parentAgentTaskId":"25e43017-b57b-4d2d-be35-1a8e5794d5d9"},"id":"63a09608-d9ef-4c8e-ac97-3fbcaeade8f9","timestamp":"2026-06-04T14:46:27.593Z","parentId":"aee20e87-d6d5-4540-bda2-22485a0ebf8b"}
0|promptbook-agents-server  | 2026-06-04T14:46:27:
0|promptbook-agents-server  | 2026-06-04T14:46:28: {"type":"assistant.turn_start","data":{"turnId":"0","interactionId":"1f11cd52-29ea-41d6-ac74-d3c315e95806"},"id":"8a8db836-b528-4f36-80d9-22a99e15357a","timestamp":"2026-06-04T14:46:27.701Z","parentId":"63a09608-d9ef-4c8e-ac97-3fbcaeade8f9"}
0|promptbook-agents-server  | 2026-06-04T14:46:28:
0|promptbook-agents-server  | 2026-06-04T14:46:28: {"type":"model.call_failure","data":{"model":"gpt-5.4","apiCallId":"00000-fd65fa79-1f2d-4719-b2bd-49f4cefd4d47","providerCallId":"D256:CF394:F91700:1074E02:6A218FC3","serviceRequestId":"0c03f787-ac2c-46a8-b7e2-de01af266e60","statusCode":402,"durationMs":174,"source":"top_level","errorMessage":"{\"message\":\"You have exceeded your monthly quota\",\"code\":\"quota_exceeded\"}"},"id":"9e7171af-f2d7-4e31-995d-e6b1183c392d","timestamp":"2026-06-04T14:46:28.305Z","parentId":"8a8db836-b528-4f36-80d9-22a99e15357a","ephemeral":true}
0|promptbook-agents-server  | 2026-06-04T14:46:28:
0|promptbook-agents-server  | 2026-06-04T14:46:28: {"type":"assistant.turn_end","data":{"turnId":"0"},"id":"d1e14e6d-106e-4d26-a995-b855913f617d","timestamp":"2026-06-04T14:46:28.316Z","parentId":"8a8db836-b528-4f36-80d9-22a99e15357a"}
0|promptbook-agents-server  | 2026-06-04T14:46:28:
0|promptbook-agents-server  | 2026-06-04T14:46:28: {"type":"session.error","data":{"errorType":"quota","errorCode":"quota_exceeded","message":"You have exceeded your monthly quota (Request ID: D256:CF394:F91700:1074E02:6A218FC3)","statusCode":402,"providerCallId":"D256:CF394:F91700:1074E02:6A218FC3","serviceRequestId":"0c03f787-ac2c-46a8-b7e2-de01af266e60"},"id":"7b9001c8-93e9-4eb6-8ca1-8aa12a4bc299","timestamp":"2026-06-04T14:46:28.319Z","parentId":"d1e14e6d-106e-4d26-a995-b855913f617d"}
0|promptbook-agents-server  | 2026-06-04T14:46:28:
0|promptbook-agents-server  | 2026-06-04T14:46:28: {"type":"result","timestamp":"2026-06-04T14:46:28.492Z","sessionId":"7ec9ed6d-10f0-454f-84a5-f103bdd74304","exitCode":1,"usage":{"premiumRequests":0,"totalApiDurationMs":0,"sessionDurationMs":2144,"codeChanges":{"linesAdded":0,"linesRemoved":0,"filesModified":[]}}}
0|promptbook-agents-server  | 2026-06-04T14:46:28:
0|promptbook-agents-server  | 2026-06-04T14:46:29: Error: {"type":"session.mcp_server_status_changed","data":{"serverName":"github-mcp-server","status":"connected"},"id":"606b4dae-fc22-44c6-a0dd-c28473760e86","timestamp":"2026-06-04T14:46:26.948Z","parentId":"f87ffa48-3442-4213-b91b-f3cca99a0ee7","ephemeral":true}
```

```bash
ub CLI
0|promptbook-agents-server  | 2026-06-04T14:45:54:     at ChildProcess.handleExit (/opt/promptbook-agents-server/bin/cca3b2c/scripts/run-codex-prompts/common/runGoScript/runBashScriptWithOutput.ts:88:29)
0|promptbook-agents-server  | 2026-06-04T14:45:54:     at ChildProcess.emit (node:events:519:28)
0|promptbook-agents-server  | 2026-06-04T14:45:54:     at ChildProcess.emit (node:domain:489:12)
0|promptbook-agents-server  | 2026-06-04T14:45:54:     at Process.ChildProcess._handle.onexit (node:internal/child_process:293:12)
0|promptbook-agents-server  | 2026-06-04T14:45:54: Logged recoverable watcher failure to /opt/promptbook-agents-server/.logs/ptbk-agent-error-2026-06-04T14-45-54-959Z.log. Continuing to watch...
0|promptbook-agents-server  | 2026-06-04T14:45:54: Processing agent-5mu7keajalwphv with Amelia Gray.
0|promptbook-agents-server  | 2026-06-04T14:45:55: Processing messages/queued/2026-06-04-GkwVXD3FkXLASi.book
0|promptbook-agents-server  | 2026-06-04T14:45:59: Error: No authentication information found.
0|promptbook-agents-server  | 2026-06-04T14:45:59:
0|promptbook-agents-server  | 2026-06-04T14:45:59: Copilot can be authenticated with GitHub using an OAuth Token or a Fine-Grained Personal Access Token.
0|promptbook-agents-server  | 2026-06-04T14:45:59:
0|promptbook-agents-server  | 2026-06-04T14:45:59: To authenticate, you can use any of the following methods:
0|promptbook-agents-server  | 2026-06-04T14:45:59:   • Start 'copilot' and run the '/login' command
0|promptbook-agents-server  | 2026-06-04T14:45:59:   • Set the COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable
0|promptbook-agents-server  | 2026-06-04T14:45:59:   • Run 'gh auth login' to authenticate with the GitHub CLI
0|promptbook-agents-server  | 2026-06-04T14:45:59:
0|promptbook-agents-server  | 2026-06-04T14:46:00: Error: Error: No authentication information found.
0|promptbook-agents-server  | 2026-06-04T14:46:00:
0|promptbook-agents-server  | 2026-06-04T14:46:00: Copilot can be authenticated with GitHub using an OAuth Token or a Fine-Grained Personal Access Token.
0|promptbook-agents-server  | 2026-06-04T14:46:00:
0|promptbook-agents-server  | 2026-06-04T14:46:00: To authenticate, you can use any of the following methods:
0|promptbook-agents-server  | 2026-06-04T14:46:00:   • Start 'copilot' and run the '/login' command
0|promptbook-agents-server  | 2026-06-04T14:46:00:   • Set the COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable
0|promptbook-agents-server  | 2026-06-04T14:46:00:   • Run 'gh auth login' to authenticate with the GitHub CLI
0|promptbook-agents-server  | 2026-06-04T14:46:00:     at ChildProcess.handleExit (/opt/promptbook-agents-server/bin/cca3b2c/scripts/run-codex-prompts/common/runGoScript/runBashScriptWithOutput.ts:88:29)
0|promptbook-agents-server  | 2026-06-04T14:46:00:     at ChildProcess.emit (node:events:519:28)
0|promptbook-agents-server  | 2026-06-04T14:46:00:     at ChildProcess.emit (node:domain:489:12)
0|promptbook-agents-server  | 2026-06-04T14:46:00:     at Process.ChildProcess._handle.onexit (node:internal/child_process:293:12)
0|promptbook-agents-server  | 2026-06-04T14:46:00: Logged recoverable watcher failure to /opt/promptbook-agents-server/.logs/ptbk-agent-error-2026-06-04T14-46-00-496Z.log. Continuing to watch...
0|promptbook-agents-server  | 2026-06-04T14:46:00: Processing agent-5mu7keajalwphv with Amelia Gray.
0|promptbook-agents-server  | 2026-06-04T14:46:00: Processing messages/queued/2026-06-04-GkwVXD3FkXLASi.book
0|promptbook-agents-server  | 2026-06-04T14:46:06: Error: No authentication information found.
0|promptbook-agents-server  | 2026-06-04T14:46:06:
0|promptbook-agents-server  | 2026-06-04T14:46:06: Copilot can be authenticated with GitHub using an OAuth Token or a Fine-Grained Personal Access Token.
0|promptbook-agents-server  | 2026-06-04T14:46:06:
0|promptbook-agents-server  | 2026-06-04T14:46:06: To authenticate, you can use any of the following methods:
0|promptbook-agents-server  | 2026-06-04T14:46:06:   • Start 'copilot' and run the '/login' command
0|promptbook-agents-server  | 2026-06-04T14:46:06:   • Set the COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable
0|promptbook-agents-server  | 2026-06-04T14:46:06:   • Run 'gh auth login' to authenticate with the GitHub CLI
0|promptbook-agents-server  | 2026-06-04T14:46:06:
0|promptbook-agents-server  | 2026-06-04T14:46:07: Error: Error: No authentication information found.
0|promptbook-agents-server  | 2026-06-04T14:46:07:
0|promptbook-agents-server  | 2026-06-04T14:46:07: Copilot can be authenticated with GitHub using an OAuth Token or a Fine-Grained Personal Access Token.
0|promptbook-agents-server  | 2026-06-04T14:46:07:
0|promptbook-agents-server  | 2026-06-04T14:46:07: To authenticate, you can use any of the following methods:
0|promptbook-agents-server  | 2026-06-04T14:46:07:   • Start 'copilot' and run the '/login' command
0|promptbook-agents-server  | 2026-06-04T14:46:07:   • Set the COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable
0|promptbook-agents-server  | 2026-06-04T14:46:07:   • Run 'gh auth login' to authenticate with the GitHub CLI
0|promptbook-agents-server  | 2026-06-04T14:46:07:     at ChildProcess.handleExit (/opt/promptbook-agents-server/bin/cca3b2c/scripts/run-codex-prompts/common/runGoScript/runBashScriptWithOutput.ts:88:29)
0|promptbook-agents-server  | 2026-06-04T14:46:07:     at ChildProcess.emit (node:events:519:28)
0|promptbook-agents-server  | 2026-06-04T14:46:07:     at ChildProcess.emit (node:domain:489:12)
0|promptbook-agents-server  | 2026-06-04T14:46:07:     at Process.ChildProcess._handle.onexit (node:internal/child_process:293:12)
0|promptbook-agents-server  | 2026-06-04T14:46:07: Logged recoverable watcher failure to /opt/promptbook-agents-server/.logs/ptbk-agent-error-2026-06-04T14-46-07-635Z.log. Continuing to watch...
0|promptbook-agents-server  | 2026-06-04T14:46:07: Processing agent-5mu7keajalwphv with Amelia Gray.
0|promptbook-agents-server  | 2026-06-04T14:46:07: Processing messages/queued/2026-06-04-GkwVXD3FkXLASi.book
0|promptbook-agents-server  | 2026-06-04T14:46:12: Error: No authentication information found.
0|promptbook-agents-server  | 2026-06-04T14:46:12:
0|promptbook-agents-server  | 2026-06-04T14:46:12: Copilot can be authenticated with GitHub using an OAuth Token or a Fine-Grained Personal Access Token.
0|promptbook-agents-server  | 2026-06-04T14:46:12:
0|promptbook-agents-server  | 2026-06-04T14:46:12: To authenticate, you can use any of the following methods:
0|promptbook-agents-server  | 2026-06-04T14:46:12:   • Start 'copilot' and run the '/login' command
0|promptbook-agents-server  | 2026-06-04T14:46:12:   • Set the COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable
0|promptbook-agents-server  | 2026-06-04T14:46:12:   • Run 'gh auth login' to authenticate with the GitHub CLI
0|promptbook-agents-server  | 2026-06-04T14:46:12:
0|promptbook-agents-server  | 2026-06-04T14:46:13: Error: Error: No authentication information found.
0|promptbook-agents-server  | 2026-06-04T14:46:13:
0|promptbook-agents-server  | 2026-06-04T14:46:13: Copilot can be authenticated with GitHub using an OAuth Token or a Fine-Grained Personal Access Token.
0|promptbook-agents-server  | 2026-06-04T14:46:13:
0|promptbook-agents-server  | 2026-06-04T14:46:13: To authenticate, you can use any of the following methods:
0|promptbook-agents-server  | 2026-06-04T14:46:13:   • Start 'copilot' and run the '/login' command
0|promptbook-agents-server  | 2026-06-04T14:46:13:   • Set the COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable
0|promptbook-agents-server  | 2026-06-04T14:46:13:   • Run 'gh auth login' to authenticate with the GitHub CLI
0|promptbook-agents-server  | 2026-06-04T14:46:13:     at ChildProcess.handleExit (/opt/promptbook-agents-server/bin/cca3b2c/scripts/run-codex-prompts/common/runGoScript/runBashScriptWithOutput.ts:88:29)
0|promptbook-agents-server  | 2026-06-04T14:46:13:     at ChildProcess.emit (node:events:519:28)
0|promptbook-agents-server  | 2026-06-04T14:46:13:     at ChildProcess.emit (node:domain:489:12)
0|promptbook-agents-server  | 2026-06-04T14:46:13:     at Process.ChildProcess._handle.onexit (node:internal/child_process:293:12)
0|promptbook-agents-server  | 2026-06-04T14:46:13: Logged recoverable watcher failure to /opt/promptbook-agents-server/.logs/ptbk-agent-error-2026-06-04T14-46-13-658Z.log. Continuing to watch...
0|promptbook-agents-server  | 2026-06-04T14:46:13: Processing agent-5mu7keajalwphv with Amelia Gray.
0|promptbook-agents-server  | 2026-06-04T14:46:13: Processing messages/queued/2026-06-04-GkwVXD3FkXLASi.book
0|promptbook-agents-server  | 2026-06-04T14:46:17: Error: No authentication information found.
0|promptbook-agents-server  | 2026-06-04T14:46:17:
0|promptbook-agents-server  | 2026-06-04T14:46:17: Copilot can be authenticated with GitHub using an OAuth Token or a Fine-Grained Personal Access Token.
0|promptbook-agents-server  | 2026-06-04T14:46:17:
0|promptbook-agents-server  | 2026-06-04T14:46:17: To authenticate, you can use any of the following methods:
0|promptbook-agents-server  | 2026-06-04T14:46:17:   • Start 'copilot' and run the '/login' command
0|promptbook-agents-server  | 2026-06-04T14:46:17:   • Set the COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable
0|promptbook-agents-server  | 2026-06-04T14:46:17:   • Run 'gh auth login' to authenticate with the GitHub CLI
0|promptbook-agents-server  | 2026-06-04T14:46:17:
0|promptbook-agents-server  | 2026-06-04T14:46:18: Error: Error: No authentication information found.
0|promptbook-agents-server  | 2026-06-04T14:46:18:
0|promptbook-agents-server  | 2026-06-04T14:46:18: Copilot can be authenticated with GitHub using an OAuth Token or a Fine-Grained Personal Access Token.
0|promptbook-agents-server  | 2026-06-04T14:46:18:
0|promptbook-agents-server  | 2026-06-04T14:46:18: To authenticate, you can use any of the following methods:
0|promptbook-agents-server  | 2026-06-04T14:46:18:   • Start 'copilot' and run the '/login' command
0|promptbook-agents-server  | 2026-06-04T14:46:18:   • Set the COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable
0|promptbook-agents-server  | 2026-06-04T14:46:18:   • Run 'gh auth login' to authenticate with the GitHub CLI
0|promptbook-agents-server  | 2026-06-04T14:46:18:     at ChildProcess.handleExit (/opt/promptbook-agents-server/bin/cca3b2c/scripts/run-codex-prompts/common/runGoScript/runBashScriptWithOutput.ts:88:29)
0|promptbook-agents-server  | 2026-06-04T14:46:18:     at ChildProcess.emit (node:events:519:28)
0|promptbook-agents-server  | 2026-06-04T14:46:18:     at ChildProcess.emit (node:domain:489:12)
0|promptbook-agents-server  | 2026-06-04T14:46:18:     at Process.ChildProcess._handle.onexit (node:internal/child_process:293:12)
0|promptbook-agents-server  | 2026-06-04T14:46:18: Logged recoverable watcher failure to /opt/promptbook-agents-server/.logs/ptbk-agent-error-2026-06-04T14-46-18-939Z.log. Continuing to watch...
0|promptbook-agents-server  | 2026-06-04T14:46:18: Processing agent-5mu7keajalwphv with Amelia Gray.
0|promptbook-agents-server  | 2026-06-04T14:46:18: Processing messages/queued/2026-06-04-GkwVXD3FkXLASi.book
0|promptbook-agents-server  | 2026-06-04T14:46:22: Error: No authentication information found.
0|promptbook-agents-server  | 2026-06-04T14:46:22:
0|promptbook-agents-server  | 2026-06-04T14:46:22: Copilot can be authenticated with GitHub using an OAuth Token or a Fine-Grained Personal Access Token.
0|promptbook-agents-server  | 2026-06-04T14:46:22:
0|promptbook-agents-server  | 2026-06-04T14:46:22: To authenticate, you can use any of the following methods:
0|promptbook-agents-server  | 2026-06-04T14:46:22:   • Start 'copilot' and run the '/login' command
0|promptbook-agents-server  | 2026-06-04T14:46:22:   • Set the COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable
0|promptbook-agents-server  | 2026-06-04T14:46:22:   • Run 'gh auth login' to authenticate with the GitHub CLI
0|promptbook-agents-server  | 2026-06-04T14:46:22:
0|promptbook-agents-server  | 2026-06-04T14:46:24: Error: Error: No authentication information found.
0|promptbook-agents-server  | 2026-06-04T14:46:24:
0|promptbook-agents-server  | 2026-06-04T14:46:24: Copilot can be authenticated with GitHub using an OAuth Token or a Fine-Grained Personal Access Token.
0|promptbook-agents-server  | 2026-06-04T14:46:24:
0|promptbook-agents-server  | 2026-06-04T14:46:24: To authenticate, you can use any of the following methods:
0|promptbook-agents-server  | 2026-06-04T14:46:24:   • Start 'copilot' and run the '/login' command
0|promptbook-agents-server  | 2026-06-04T14:46:24:   • Set the COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable
0|promptbook-agents-server  | 2026-06-04T14:46:24:   • Run 'gh auth login' to authenticate with the GitHub CLI
0|promptbook-agents-server  | 2026-06-04T14:46:24:     at ChildProcess.handleExit (/opt/promptbook-agents-server/bin/cca3b2c/scripts/run-codex-prompts/common/runGoScript/runBashScriptWithOutput.ts:88:29)
0|promptbook-agents-server  | 2026-06-04T14:46:24:     at ChildProcess.emit (node:events:519:28)
0|promptbook-agents-server  | 2026-06-04T14:46:24:     at ChildProcess.emit (node:domain:489:12)
0|promptbook-agents-server  | 2026-06-04T14:46:24:     at Process.ChildProcess._handle.onexit (node:internal/child_process:293:12)
0|promptbook-agents-server  | 2026-06-04T14:46:24: Logged recoverable watcher failure to /opt/promptbook-agents-server/.logs/ptbk-agent-error-2026-06-04T14-46-24-048Z.log. Continuing to watch...
0|promptbook-agents-server  | 2026-06-04T14:46:24: Processing agent-5mu7keajalwphv with Amelia Gray.
0|promptbook-agents-server  | 2026-06-04T14:46:24: Processing messages/queued/2026-06-04-GkwVXD3FkXLASi.book
0|promptbook-agents-server  | 2026-06-04T14:46:28: Error: No authentication information found.
0|promptbook-agents-server  | 2026-06-04T14:46:28:
0|promptbook-agents-server  | 2026-06-04T14:46:28: Copilot can be authenticated with GitHub using an OAuth Token or a Fine-Grained Personal Access Token.
0|promptbook-agents-server  | 2026-06-04T14:46:28:
0|promptbook-agents-server  | 2026-06-04T14:46:28: To authenticate, you can use any of the following methods:
0|promptbook-agents-server  | 2026-06-04T14:46:28:   • Start 'copilot' and run the '/login' command
0|promptbook-agents-server  | 2026-06-04T14:46:28:   • Set the COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable
0|promptbook-agents-server  | 2026-06-04T14:46:28:   • Run 'gh auth login' to authenticate with the GitHub CLI
0|promptbook-agents-server  | 2026-06-04T14:46:28:
```
