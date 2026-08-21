# Agent access control reads the visibility of a deleted namesake

While fixing implicit `FROM @Adam` inheritance, `AgentCollectionInSupabase.getAgentPermanentId` was changed so that an
agent name resolves to the agent that is live rather than to the oldest agent that ever carried that name. The access
check in `apps/agents-server/src/utils/agentAccess.ts` still resolves the old way and was left unchanged, because the
current prompt explicitly forbids unrelated fixes.

## Failure

`resolveAgentVisibility` reads the visibility column with no `deletedAt` filter and no ordering:

```ts
const agentResult = await supabase
    .from(agentTable)
    .select('visibility')
    .or(buildAgentNameOrIdFilter(targetAgentIdentifier))
    .limit(1);
```

When an agent name was deleted and later created again, the recycle-bin leftover and the live agent both match the
filter, and `limit(1)` without an `order` picks whichever row the database returns first. Access to the live agent is
then decided by the visibility of a row that no longer exists. A deleted `PUBLIC` namesake can expose a live `PRIVATE`
agent, and a deleted `PRIVATE` namesake can lock out a live `PUBLIC` one.

## Evidence

-   On `live.ptbk.io`, `GET /agents/adam/api/profile` answers `This agent is private. Sign in to access it.` while
    `GET /agents/adam/images/default-avatar.png` fails with `NotFoundError: Agent "V1u7uhKJYDkvDU" not found` — the
    visibility came from the deleted Adam row, the source lookup from a different one.
-   `apps/agents-server/src/utils/resolveAgentStateFromSource.storedAgents.test.ts` reproduces the delete-and-reinstate
    history the report is about.

## Scope

A scoped follow-up should make `resolveAgentVisibility` prefer the live agent the same way `getAgentPermanentId` now
does, and cover a deleted namesake whose visibility differs from the live agent's.
