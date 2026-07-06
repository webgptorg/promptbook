# Data Model

Agents Server stores data in PostgreSQL/Supabase or local SQLite. PostgreSQL/Supabase is the production model; SQLite is a local adapter that preserves the same logical tables and Supabase-shaped behavior.

## Table Namespaces

Most tables are per logical server. Their physical table name is:

```text
<tablePrefix><TableName>
```

Migration files use `prefix_` as the placeholder. For example, `prefix_Agent` becomes `server_example_com_Agent` for a server with table prefix `server_example_com_`.

The global `_Server` table is not prefixed.

## Global Server Table

`_Server` stores logical server registrations:

- `id`
- `name`
- `environment`
- `domain`
- `tablePrefix`
- `createdAt`
- `updatedAt`

`name`, `domain`, and `tablePrefix` MUST be unique.

## Agent Tables

`Agent` stores the current state of each agent:

- `id`: database id.
- `permanentId`: stable id used for long-lived references.
- `agentName`: human-readable name.
- `agentSource`: book-language source.
- `agentHash`: source/runtime hash.
- `agentProfile`: resolved profile metadata.
- `preparedModelRequirements`: cached model requirements.
- `promptbookEngineVersion`
- `usage`
- `visibility`: `PRIVATE`, `UNLISTED`, or `PUBLIC`.
- `folderId`
- `sortOrder`
- `userId`
- `createdAt`, `updatedAt`, `deletedAt`

`AgentHistory` stores append-only source snapshots:

- `agentName`
- `permanentId`
- `agentHash`
- `previousAgentHash`
- `agentSource`
- `promptbookEngineVersion`
- `versionName`
- `createdAt`

`AgentFolder` stores organization hierarchy:

- `id`
- `name`
- `parentId`
- `sortOrder`
- `icon`
- `color`
- `userId`
- `createdAt`, `updatedAt`, `deletedAt`

Active folder names MUST be unique within `(userId, parentId)`. Folder deletion is soft deletion and cascades behaviorally to descendant folders and owned agents.

`AgentPreparation` tracks background preparation:

- `agentPermanentId`
- `targetFingerprint`
- `lastPreparedFingerprint`
- `status`
- `triggerReason`
- scheduling and run timestamps
- retry count, error, and duration fields

`AgentExternals` maps agents to vendor-side external resources:

- `type`
- `hash`
- `externalId`
- `vendor`
- optional `note`

## Chat Tables

`ChatHistory` stores stateless chat records:

- message hash and previous message hash
- `agentName`
- `agentPermanentId`
- `agentHash`
- serialized message content
- telemetry: URL, IP, user agent, language, platform
- `source`: for example `AGENT_PAGE_CHAT` or `OPENAI_API_COMPATIBILITY`
- `actorType`: `ANONYMOUS`, `TEAM_MEMBER`, or `API_KEY`
- `apiKey`
- `usage`
- `userId`
- timestamps

`ChatFeedback` stores user feedback about chat answers:

- rating/text fields
- user note and expected answer
- agent identity fields
- telemetry
- timestamps

`UserChat` stores durable conversations:

- text `id`
- `userId`
- `agentPermanentId`
- `source`: `WEB_UI`, `OPENAI_API`, or `TEAM_MEMBER`
- `title`
- `messages` JSON array
- `draftMessage`
- `lastMessageAt`
- timestamps

`UserChatJob` stores durable generation jobs:

- text `id`
- `chatId`
- `userId`
- `agentPermanentId`
- `userMessageId`
- `assistantMessageId`
- `clientMessageId`
- `status`: `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, or `CANCELLED`
- `parameters` JSON
- queue, start, completion, cancel, heartbeat, and lease timestamps
- `attemptCount`
- `provider`
- `failureReason`
- `failureDetails`
- runtime diagnostics such as raw prompt/request and duration when available
- timestamps

`UserChatTimeout` stores delayed and recurring chat actions:

- text `id`
- `chatId`
- `userId`
- `agentPermanentId`
- `status`
- `message`
- `parameters`
- `durationMs`
- recurrence interval when configured
- due, queue, start, completion, cancel, pause, and lease timestamps
- `attemptCount`
- `failureReason`
- timestamps

## User and Security Tables

`User` stores accounts:

- `id`
- `username`
- `passwordHash`
- `isAdmin`
- `profileImageUrl`
- `email`
- `displayName`
- `authenticationProvider`
- timestamps

API responses MUST use a public projection and MUST NOT expose `passwordHash`.

`ApiTokens` stores API keys:

- `id`
- `token`
- `note`
- `isRevoked`
- `userId`
- timestamps

`ShibbolethUserIdentity` stores external identity links.

`ShibbolethAuthenticationAttempt` stores Shibboleth audit records.

## Configuration Tables

`Metadata` stores string configuration:

- `key`
- `value`
- optional `note`
- timestamps

`ServerLimit` stores numeric limits:

- `key`
- `value`
- timestamps

Both `key` columns MUST be unique.

## User Data Tables

`UserMemory` stores memory:

- `userId`
- `agentPermanentId`
- `content`
- `isGlobal`
- `deletedAt`
- timestamps

Global memories have no agent-specific scope. Agent memories include `agentPermanentId`.

`Wallet` stores secrets and credentials:

- `userId`
- `isUserScoped`
- `agentPermanentId`
- `recordType`: `USERNAME_PASSWORD`, `SESSION_COOKIE`, or `ACCESS_TOKEN`
- `service`
- `key`
- `jsonSchema`
- `username`
- `password`
- `secret`
- `cookies`
- `isGlobal`
- `deletedAt`
- timestamps

Wallet responses MUST redact secrets unless the route explicitly performs a credential operation that requires them.

`UserData` stores JSON values by `(userId, key)`.

`UserPushSubscription` stores web-push endpoints and public keys.

`ShareTargetPayload` stores PWA share-target payloads until consumed.

## File and Media Tables

`File` tracks uploads:

- `id`
- `userId`
- `fileName`
- `fileSize`
- `fileType`
- `storageUrl`
- `shortUrl`
- `purpose`
- `status`
- `agentId`
- `securityResult`
- `createdAt`

`Image` stores generated or uploaded image records:

- `filename`
- `prompt`
- `cdnUrl`
- `cdnKey`
- `agentId`
- `purpose`: `AVATAR` or `TESTING`
- timestamps

## Message and Email Tables

`Message` stores generic communication records:

- `channel`
- `direction`
- `sender` JSON
- `recipients` JSON
- `content`
- `threadId`
- `metadata`
- timestamps

`MessageSendAttempt` stores provider send attempts:

- `messageId`
- `providerName`
- `isSuccessful`
- raw provider response
- timestamps

## Integration and Cache Tables

`LlmCache` stores language-model cache entries.

`OpenAiAssistantCache` stores OpenAI assistant compatibility cache entries.

`GenerationLock` stores generation coordination records.

`VectorStoreKnowledgeSourceHashes` stores hashes for indexed knowledge sources.

`CustomStylesheet` and `CustomJavascript` store administrator-provided UI extensions.

`DefaultFederatedAgent` stores default federated-agent mappings.

`CalendarConnection` stores connected calendars:

- user and agent scope
- provider and calendar URL
- token reference
- scopes
- status
- disconnect and sync timestamps

Active connections MUST be unique for `(userId, agentPermanentId, provider, calendarUrl)`.

`CalendarActivity` stores calendar operation audit records.

## Deletion and History Rules

Soft deletion MUST be preferred for user-facing resources where historical references may exist:

- agents
- folders
- user memories
- wallet records

Agent source changes MUST preserve history snapshots. Durable chat job records SHOULD remain available for task-manager and audit views.

