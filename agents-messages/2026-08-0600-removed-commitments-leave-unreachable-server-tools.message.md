# Removing the capability commitments left the Agent Server runtime tools unreachable by the model

While removing `COMPONENT`, `WALLET`, `MEMORY`, `USE BROWSER`, `USE DEEPSEARCH`, `USE SEARCH ENGINE`,
`USE SPAWN`, `USE TIMEOUT`, `USE TIME`, `USE EMAIL` and generic `META`
(`prompts/2026-08-0030-remove-commitments.md`), the Book language part was straightforward — the
commitment definitions, their tool definitions, tool functions and runtime adapters are gone.

**But the reasoning in the prompt ("every agent can use the browser / deepsearch / search engine /
timeouts / time / e-mail, no need to specify it in agent source") is not yet true in the code.** A
commitment was the only thing that ever pushed a tool definition into
`AgentModelRequirements.tools`, so after this change **no agent gets these tools at all**:

| Capability          | Tool(s) that are now never offered to the model                       |
| ------------------- | --------------------------------------------------------------------- |
| Browser             | `fetch_url_content`, `run_browser`                                     |
| Web search          | `web_search`                                                           |
| Deep research       | `deep_search`                                                          |
| Current time        | `get_current_time`                                                     |
| Chat timeouts       | `set_timeout`, `cancel_timeout`, `list_timeouts`, `update_timeout`     |
| E-mail              | `send_email`                                                           |
| User memory         | `retrieve_user_memory`, `store_user_memory`, `update_user_memory`, `delete_user_memory` |
| User wallet         | `retrieve_wallet_records`, `store_wallet_record`, `update_wallet_record`, `delete_wallet_record`, `request_wallet_record` |

The Agent Server implementations behind them were intentionally **kept**, because the prompt states
that these are properties of the server, not of the agent:

-   `apps/agents-server/src/tools/run_browser.ts` (+ the whole `runBrowser*` module family) and
    `GET /api/scrape`
-   `apps/agents-server/src/tools/send_email.ts` and `POST /api/send-email`
-   `apps/agents-server/src/tools/spawn_agent.ts` and `POST /api/spawn-agent`
-   user memory (`/api/user-memory`, `/system/user-memory`) and user wallet (`/system/user-wallet`)
    database tables, routes and admin UI
-   chat timeouts (`prefix_UserChatTimeout`, the timeout worker, `/agents/<name>/api/timeouts`)
-   the chat tool-call chips and modals in `src/book-components/Chat` for all of the tool names above

So the data, the UI, and the implementations are all still there — only the wiring that made the
model able to call them is missing.

## Why it was not fixed here

Making these capabilities **unconditionally available to every agent** is a new feature (a
server-wide default tool set with its own gating, per-user credential resolution, privacy handling
and progress reporting), not part of "remove the commitments". Implementing it as a side effect
would have changed the behaviour of every existing agent on every server and would have gone well
beyond the requested change.

## Suggested follow-up

Add a server-wide default tool set that is attached to every chat execution (next to the existing
`agent_progress` and chat-attachment tools in
`apps/agents-server/src/tools/getAllToolFunctionsForServer.ts`), together with the matching tool
definitions in the compiled model requirements, and re-register the runtime adapters that were
removed from `$provideOpenAiAgentKitExecutionToolsForServer` (memory) and
`$provideOpenAiAssistantExecutionToolsForServer` (timeouts).
