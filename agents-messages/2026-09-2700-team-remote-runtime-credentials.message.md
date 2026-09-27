# Existing Agents Server TEAM credential forwarding

While checking Coder TEAM isolation, I found an existing cross-origin credential risk in Agents Server TEAM execution.

`src/commitments/TEAM/TEAM.ts` removes `projects` from the child runtime context, but retains `agentsServer`,
`email` and `calendars`. `buildTeammatePrompt` serializes that context into prompt parameters, and
`src/llm-providers/agent/RemoteAgent.ts` sends those parameters in the body of the remote `/api/chat` request.
The same-origin check in `createTeamInternalAgentAccessHeaders` protects the HTTP header but not this body.
A foreign TEAM endpoint could therefore receive an internal TEAM access token or other runtime credentials.

Coder's new local Book consultation runtime does not use that remote execution path or forward those credentials.
The existing Agents Server implementation was left intact in this task. A separate fix should allowlist remote
context fields, keep credentials host-owned, and test both headers and request bodies across server origins.
