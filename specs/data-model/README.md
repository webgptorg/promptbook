# Data model

Every database table the Agents Server uses, grouped by domain. Tables are named **without** their
per-server prefix (see [Database](../architecture/database.md)); at runtime each becomes
`<tablePrefix><TableName>`. The one exception is the global unprefixed [`_Server`](../architecture/multi-server.md)
registry.

All tables have Row-Level Security enabled. Most have `createdAt`/`updatedAt` (`TIMESTAMP WITH TIME ZONE`).
Only columns that carry meaning are listed here; see [Database conventions](../architecture/database.md) for
id/timestamp/soft-delete patterns.

## Grouped tables

- [Agents](./agent.md): `Agent`, `AgentHistory`, `AgentFolder`, `AgentExternals`, `AgentPreparation`,
  `OpenAiAssistantCache`, `VectorStoreKnowledgeSourceHashes`, `DefaultFederatedAgent`
- [Chat](./chat.md): `UserChat`, `UserChatJob`, `UserChatTimeout`, `ChatHistory`, `ChatFeedback`,
  `ShareTargetPayload`
- [Users](./user.md): `User`, `UserData`, `UserMemory`, `Wallet`, `UserPushSubscription`,
  `ShibbolethUserIdentity`, `ShibbolethAuthenticationAttempt`, `ApiTokens`, `CalendarConnection`,
  `CalendarActivity`
- [Messaging](./messaging.md): `Message`, `MessageSendAttempt`
- [Misc / infrastructure](./misc.md): `Metadata`, `ServerLimit`, `LlmCache`, `GenerationLock`, `Image`,
  `File`, `CustomStylesheet`, `CustomJavascript`, and the global `_Server`

## Central relationships

```
User ──1:N── Agent ──1:N── AgentHistory        (versions, by permanentId)
             │  ├─ AgentExternals               (by agentHash: vector stores, assistants)
             │  ├─ AgentPreparation             (compile/prepare lifecycle)
             │  └─ folderId → AgentFolder ──self──▶ parentId (tree)
             │
User ──1:N── UserChat ──1:N── UserChatJob       (durable reply generation)
                       └─1:N── UserChatTimeout   (scheduled wake-ups)

Agent(permanentId) ◀── UserChat, UserChatJob, UserChatTimeout, UserMemory, Wallet,
                       CalendarConnection, ShareTargetPayload, ChatHistory, ChatFeedback
User(id)          ◀── UserChat, UserData, UserMemory, Wallet, ApiTokens, UserPushSubscription,
                       CalendarConnection, ShibbolethUserIdentity
```

- **Durable agent links use `agentPermanentId` → `Agent.permanentId`** with `ON DELETE CASCADE`, not the
  mutable `agentName`. This is why deleting an agent cascades to its chats, memory, wallet, timeouts, etc.
- `ChatHistory`/`ChatFeedback` were migrated from `agentName` FKs to `agentPermanentId` (duplicate agent
  names are allowed).
- `UserChat.id`, `UserChatJob.id`, `UserChatTimeout.id`, `UserPushSubscription.id`, and
  `ShareTargetPayload.id` are **string** primary keys (not identity integers).

## Related specs

- [Database](../architecture/database.md) — backends, prefixing, migrations
- [Multi-server model](../architecture/multi-server.md) — the `_Server` registry
