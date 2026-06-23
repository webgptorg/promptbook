[-]

[🔐] Fix broken access control on chat history, chat feedback and agent CRUD routes of Agents Server

-   Multiple Agents Server endpoints guard themselves with `getCurrentUser()` (i.e. "the caller is logged in") but never check that the **specific record** being read, modified, or deleted belongs to the caller or that the caller is an admin. Any authenticated user — including unprivileged self-registered users — can therefore read, mutate, or destroy data that belongs to other users / other agents.
-   Affected routes:
    -   [`apps/agents-server/src/app/api/chat-history/route.ts`](apps/agents-server/src/app/api/chat-history/route.ts) — `GET` returns the **entire** `ChatHistory` table (paged) for every logged-in user; `DELETE ?agentName=...` wipes the chat history of any agent.
    -   [`apps/agents-server/src/app/api/chat-history/[id]/route.ts`](apps/agents-server/src/app/api/chat-history/%5Bid%5D/route.ts) — `DELETE` removes any single chat-history row by id, no ownership check.
    -   [`apps/agents-server/src/app/api/chat-feedback/route.ts`](apps/agents-server/src/app/api/chat-feedback/route.ts) — same pattern: any logged-in user can list all chat feedback (including `userNote`, `expectedAnswer`) across all agents and delete feedback for any agent.
    -   [`apps/agents-server/src/app/api/agents/[agentName]/route.ts`](apps/agents-server/src/app/api/agents/%5BagentName%5D/route.ts) — `PATCH` lets any logged-in user rename or change the visibility of **any** agent; `DELETE` lets them tombstone any agent. The route never resolves the agent's owner and never compares it to the current user.
-   The fix is to scope each query / mutation to the caller's `userId` (or require `isUserAdmin()` for admin-only views):
    -   For chat history and feedback, filter `select`/`delete` by `userId` (or by `agentName` where the caller owns the agent). If these screens are intentionally admin-only, replace `getCurrentUser()` with `isUserAdmin()` and update the UI accordingly.
    -   For `PATCH/DELETE /api/agents/[agentName]`, resolve the agent owner via [`findOwnedAgentByIdentifier`](apps/agents-server/src/utils/agentOwnership.ts) (already used by the v1 management API) and reject when the agent does not belong to the caller, with an admin override only when `isUserAdmin()` returns true.
-   Do a proper analysis of the current functionality before you start implementing — read [`apps/agents-server/src/utils/agentOwnership.ts`](apps/agents-server/src/utils/agentOwnership.ts) and the v1 management routes ([`apps/agents-server/src/app/api/v1/agents/[agentId]/route.ts`](apps/agents-server/src/app/api/v1/agents/%5BagentId%5D/route.ts)) for how ownership is enforced today, and reuse the same primitives instead of inventing a new check.
-   Keep in mind the DRY _(don't repeat yourself)_ principle and the SOLID principles — small ownership-check helpers should be shared across routes.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
