# Goal Chat (the agent's thread with itself)

Every agent has exactly **one** goal chat: the thread the agent keeps with itself to plan work towards its goal. It is not a place for people to talk to the agent — it is the agent's internal planning and its record of what it intends to do next.

Where a normal [user chat](user-chats.md) is one of N conversations per agent (one per user and thread), the goal chat is a **singleton per agent**.

## Identity and storage

The goal chat is stored as one ordinary `prefix_UserChat` row with `source = 'AGENT_GOAL'`:

-   its `id` is derived from the agent permanent id (`goal-<agentPermanentId>`), so the singleton is enforced by the primary key and any layer holding only a `chatId` can recognize a goal chat without an extra lookup;
-   its `userId` is the agent owner (with a stable fallback when the agent has no owner), because `UserChat.userId` is a non-null foreign key — the chat conceptually belongs to the agent, not to that user;
-   it is ensured when the agent is created and lazily repaired on first use for older agents; concurrent requests can never duplicate it.

## Access

The goal chat exposes the agent's own planning, so it follows exactly the same rule as the agent source book: **whoever may read the agent book may read the goal chat**. When visible it appears among the agent's other chats in the chat sidebar, pinned above all of them and marked with its own goal icon.

The goal chat is **read-only for people** — only the agent (and the server acting on its behalf) writes into it, so the chat surface renders no input area and shows a notice explaining what makes this thread special.

## What is written into it

| Event | Note left in the goal chat |
| --- | --- |
| Agent created | The server queues an agent-owned turn containing the effective `GOAL` / `GOALS` so the agent can begin useful work. |
| Agent book modified | The server queues an agent-owned turn containing the new effective goal so the agent can re-check its work and planned messages. |
| Planned message scheduled | The planned message and the time it will fire. |
| Planned message cancelled | The cancellation of that planned message. |

## Planned messages

Planned messages are [timeouts](timeouts.md): future wake-ups that inject a synthetic turn and run a normal agent turn. They can be scheduled from the goal chat or from any other chat of the agent, and **all of them are listed in the goal chat** together with the time they are planned to be executed, where they can also be cancelled at any time.

Because a planned message belongs to the agent rather than to one user, the goal-chat listing spans every chat and every user of that agent.

Every Agents Server chat invocation exposes `set_timeout`, `list_timeouts`, and `cancel_timeout`. `set_timeout` always stores the future message in the singleton goal chat, regardless of which conversation invoked the agent. Managed coding-agent runners receive the same operations through the authenticated internal runtime API. When the timeout fires, its agent-authored message queues a durable goal-chat turn and wakes the agent immediately.

## Task manager

A chat completion or timeout that runs in the goal chat keeps its normal kind in the [task manager](../admin/task-manager.md), so it is still listed among the chat completions — it only carries an extra `isAgentGoalTask` flag, rendered as a **Goal chat** badge, so agent-initiated work stays distinguishable from user-invoked work.

## Routes

| Route | Behavior |
| --- | --- |
| `/agents/:agentName/goal` | Resolves the singleton goal chat and opens it in the shared chat surface. |
| `GET /agents/:agentName/api/timeouts` | Lists the planned messages shown in the goal chat. |
| `DELETE /agents/:agentName/api/timeouts/:timeoutId` | Cancels one planned message from the goal chat. |
| `POST /api/internal/agent-goal-chat-planned-messages` | Authenticated `set`, `list`, and `cancel` bridge for Agents Server-managed coding agents. |
