[-]

[🔐] Fix owner-scoped access control for private agents and folders in Agents Server

-   Several Agents Server routes still treat "the caller is signed in" as enough authorization for data that belongs to a specific agent owner. This lets any authenticated user access or mutate private agents and folders owned by other users when they know or can guess the agent identifier or folder id.
-   The shared private-agent access helper is affected: [`apps/agents-server/src/utils/agentAccess.ts`](apps/agents-server/src/utils/agentAccess.ts) returns `true` for every `PRIVATE` agent whenever `currentUser` exists. Every route that calls `resolveAgentAccess` inherits this behavior, including:
    -   [`apps/agents-server/src/app/agents/[agentName]/page.tsx`](apps/agents-server/src/app/agents/%5BagentName%5D/page.tsx)
    -   [`apps/agents-server/src/app/agents/[agentName]/chat/page.tsx`](apps/agents-server/src/app/agents/%5BagentName%5D/chat/page.tsx)
    -   [`apps/agents-server/src/app/agents/[agentName]/textarea/page.tsx`](apps/agents-server/src/app/agents/%5BagentName%5D/textarea/page.tsx)
    -   [`apps/agents-server/src/app/agents/[agentName]/timeouts/page.tsx`](apps/agents-server/src/app/agents/%5BagentName%5D/timeouts/page.tsx)
    -   [`apps/agents-server/src/app/agents/[agentName]/api/chat/route.ts`](apps/agents-server/src/app/agents/%5BagentName%5D/api/chat/route.ts)
    -   [`apps/agents-server/src/app/agents/[agentName]/api/profile/route.ts`](apps/agents-server/src/app/agents/%5BagentName%5D/api/profile/route.ts)
    -   [`apps/agents-server/src/app/agents/[agentName]/api/voice/route.ts`](apps/agents-server/src/app/agents/%5BagentName%5D/api/voice/route.ts)
    -   [`apps/agents-server/src/app/agents/[agentName]/api/mcp/route.ts`](apps/agents-server/src/app/agents/%5BagentName%5D/api/mcp/route.ts)
-   The organization and folder APIs have the same root vulnerability:
    -   [`apps/agents-server/src/utils/agentOrganization/loadAgentOrganizationState.ts`](apps/agents-server/src/utils/agentOrganization/loadAgentOrganizationState.ts) loads all active folders and agents for any signed-in user instead of filtering by `userId` or requiring admin access.
    -   [`apps/agents-server/src/app/api/agent-organization/route.ts`](apps/agents-server/src/app/api/agent-organization/route.ts) lets any signed-in user reorder or move arbitrary `AgentFolder` and `Agent` rows by id / identifier.
    -   [`apps/agents-server/src/app/api/agent-folders/route.ts`](apps/agents-server/src/app/api/agent-folders/route.ts) accepts a caller-provided `parentId` without checking that the parent folder belongs to the caller.
    -   [`apps/agents-server/src/app/api/agent-folders/[folderId]/route.ts`](apps/agents-server/src/app/api/agent-folders/%5BfolderId%5D/route.ts) updates and deletes folders by id without checking owner/admin rights; deletion also cascades to descendants and agents in those folders.
    -   [`apps/agents-server/src/app/api/agent-folders/[folderId]/visibility/route.ts`](apps/agents-server/src/app/api/agent-folders/%5BfolderId%5D/visibility/route.ts) changes visibility for an arbitrary folder subtree without owner/admin checks.
    -   [`apps/agents-server/src/app/api/agent-folders/[folderId]/restore/route.ts`](apps/agents-server/src/app/api/agent-folders/%5BfolderId%5D/restore/route.ts) restores arbitrary deleted folder subtrees without owner/admin checks.
    -   [`apps/agents-server/src/app/api/agents/[agentName]/restore/route.ts`](apps/agents-server/src/app/api/agents/%5BagentName%5D/restore/route.ts) restores arbitrary deleted agents by identifier without owner/admin checks.
    -   [`apps/agents-server/src/app/api/agents/[agentName]/clone/route.ts`](apps/agents-server/src/app/api/agents/%5BagentName%5D/clone/route.ts) can clone an agent source into the caller's account after only checking that the caller is signed in; private source should not be readable or copyable by unrelated users.
-   The fix should define one consistent authorization model for agent and folder ownership:
    1.  `PUBLIC` and `UNLISTED` agents may keep their intended public read behavior.
    2.  `PRIVATE` agents must be readable and usable only by the owner, an admin, or a valid same-server `TEAM` internal call where explicitly allowed.
    3.  Folder reads and mutations must be limited to folders owned by the caller, with admin override only where the UI/API is intentionally administrative.
    4.  Agent restore, folder restore, visibility changes, movement, deletion, and cloning must all resolve the target owner before mutating or exposing source.
-   Reuse existing ownership primitives in [`apps/agents-server/src/utils/agentOwnership.ts`](apps/agents-server/src/utils/agentOwnership.ts), [`apps/agents-server/src/utils/findAgentForCallerWriteAccess.ts`](apps/agents-server/src/utils/findAgentForCallerWriteAccess.ts), and the owner-scoped v1 routes such as [`apps/agents-server/src/app/api/v1/folders/[folderId]/route.ts`](apps/agents-server/src/app/api/v1/folders/%5BfolderId%5D/route.ts). If those helpers are not enough, extend them in one shared place instead of creating route-local authorization logic.
-   Update `loadAgentOrganizationState` so normal signed-in users receive only their own private agents/folders plus the public/unlisted data they are allowed to see. Admin callers should have an explicit admin path, not an accidental `currentUser` path.
-   Add tests covering at least two users: user A creates private agents/folders, user B must not view, chat with, clone, move, restore, delete, or change visibility for user A's data. Also verify that admin access and public/unlisted access continue to work as intended.
-   This is a follow-up to the completed chat-history and agent CRUD access-control prompt; do not duplicate that work, but do analyze the current routes because the vulnerable surface is broader than the earlier PRD.
-   Do a proper analysis of the current functionality before you start implementing. Keep in mind the DRY _(don't repeat yourself)_ principle and the SOLID principles.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

