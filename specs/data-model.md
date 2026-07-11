# Data Model

All state lives in one relational (PostgreSQL-compatible) database. Instance-scoped tables carry the per-server [table prefix](servers-and-multi-tenancy.md#table-prefixes), written here as `prefix_`. Timestamps are `TIMESTAMP WITH TIME ZONE`; `createdAt`/`updatedAt` default to `now()`. Ids are identity `BIGINT` unless noted. JSON columns are `JSONB`. Migrations that materialize this model are specified in [Migrations](operations/migrations.md).

## Global tables (no prefix)

### `_Server`

Server-instance registry: `id`, `name` (unique), `environment` enum `LTS|PREVIEW|PRODUCTION|LIVE`, `domain` (unique), `tablePrefix` (unique), timestamps. See [Servers and multi-tenancy](servers-and-multi-tenancy.md#server-registry).

### `prefix_Migrations` (one per prefix)

Applied-migration bookkeeping: `filename` (PK), `appliedAt`, `appliedBy`.

## Agents

### `prefix_Agent`

The agent store (see [Agents](agents.md)): `id`, `agentName` (indexed, **not unique**), `permanentId` (unique), `agentHash`, `agentSource` (text), `agentProfile` (JSON profile snapshot), `promptbookEngineVersion`, `usage` (JSON, nullable), `preparedModelRequirements` (JSON, nullable), `folderId` → `AgentFolder.id`, `sortOrder`, `visibility` (`PUBLIC|PRIVATE|UNLISTED`), `userId` → `User.id` (nullable owner, `ON DELETE SET NULL`), `createdAt`, `updatedAt`, `deletedAt` (soft delete).

### `prefix_AgentHistory`

Append-only source versions: `id`, `createdAt`, `agentName`, `permanentId` → `Agent.permanentId`, `agentHash`, `previousAgentHash` (nullable — hash chain), `agentSource`, `promptbookEngineVersion`, `versionName` (nullable label). Every source change MUST append here.

### `prefix_AgentFolder`

Folder tree: `id`, `name`, `parentId` → self (nullable), `sortOrder`, `icon` (nullable), `color` (nullable), `userId` (nullable owner), `createdAt`, `updatedAt`, `deletedAt`. Names starting with `.` are hidden folders (e.g. `.core`). See [Folders and organization](agents/folders-and-organization.md).

### `prefix_AgentPreparation`

Background preparation queue, **one row per agent** (unique `agentPermanentId`, FK cascade): `targetFingerprint`, `lastPreparedFingerprint`, `status` (default `SCHEDULED`), `triggerReason`, `scheduledAt`, `runAfter`, `startedAt`, `completedAt`, `failedAt`, `retryCount`, `lastError`, `lastDurationMs`. See [Preparation and caching](agents/preparation-and-caching.md).

### `prefix_AgentExternals`

Mapping of agent artifacts to external-vendor resources: `type`, `hash`, `externalId`, `vendor`, `note`. Used to reuse provider-side objects (e.g. vector stores) across identical content.

### `prefix_VectorStoreKnowledgeSourceHashes`

Knowledge-source change detection: `source` (URL/identifier), `hash`, `etag`, `lastModified`, `sizeBytes`.

### `prefix_OpenAiAssistantCache`

`agentHash` → provider `assistantId` cache, so identical agent sources reuse the provider-side assistant.

## LLM infrastructure

### `prefix_LlmCache`

Generic LLM response cache keyed by `hash` with JSON `value`.

### `prefix_GenerationLock`

Cooperative locks for expensive generation: `lockKey`, `expiresAt`. Workers MUST treat expired rows as free.

## Conversations

### `prefix_ChatHistory`

Frozen observability log of stateless/OpenAI chats (see [History and feedback](chat/history-and-feedback.md)): `messageHash`, `previousMessageHash` (nullable — per-conversation hash chain), `agentName`, `agentHash`, `agentPermanentId` → `Agent.permanentId` (FK cascade; `agentName` kept as denormalized history), `message` (JSON `{role, sender, content, attachments?}`), `promptbookEngineVersion`, request context (`url`, `ip`, `userAgent`, `language`, `platform`), `source` (`AGENT_PAGE_CHAT|OPENAI_API_COMPATIBILITY`), `apiKey` (nullable), `actorType` (`ANONYMOUS|TEAM_MEMBER|API_KEY`), `usage` (JSON), `userId` (nullable).

### `prefix_ChatFeedback`

User feedback (see [History and feedback](chat/history-and-feedback.md#feedback)): `agentName`, `agentHash`, `agentPermanentId` FK, `rating`, `textRating`, `chatThread` (serialized thread), `userNote`, `expectedAnswer`, `promptbookEngineVersion`, request context columns as above.

### `prefix_UserChat`

Durable chats (see [User chats](chat/user-chats.md)): `id` TEXT PK (client-generated), `userId` FK, `agentPermanentId` FK, `source` (`WEB_UI|OPENAI_API|TEAM_MEMBER`), `messages` (JSON array, canonical message list), `draftMessage` (nullable), `title` (nullable), `lastMessageAt`, timestamps. Frozen sources (`TEAM_MEMBER`) are read-only conversation records.

### `prefix_UserChatJob`

One background turn per user message: `id` TEXT PK, `chatId` FK cascade, `userId` FK, `agentPermanentId` FK, `userMessageId`, `assistantMessageId`, `clientMessageId` (idempotency key), `status` (`QUEUED|RUNNING|COMPLETED|FAILED|CANCELLED`), `parameters` (JSON; also carries runner metadata under reserved keys), `queuedAt`, `startedAt`, `completedAt`, `cancelRequestedAt`, `lastHeartbeatAt`, `leaseExpiresAt`, `attemptCount`, `provider` (runner identifier), `failureReason`, `failureDetails`, `repliedToThreadId`/`repliedToMessageId` (reply references).

### `prefix_UserChatTimeout`

Scheduled wake-ups (see [Timeouts](chat/timeouts.md)): `id` TEXT PK, `chatId`/`userId`/`agentPermanentId` FKs cascade, `status` (same enum as jobs, CHECK-constrained), `message` (nullable wake-up text), `parameters` (JSON; recurrence), `durationMs`, `dueAt`, `queuedAt`, `startedAt`, `completedAt`, `cancelRequestedAt`, `leaseExpiresAt`, `attemptCount`, `failureReason`. Indexed by `(status, dueAt)` and per chat.

## Identity and personal data

### `prefix_User`

`id`, `username` (unique), `passwordHash` (`salt:hash` scrypt — see [Users and authentication](users-and-authentication.md#passwords)), `isAdmin`, `profileImageUrl` (nullable), timestamps.

### `prefix_ApiTokens`

`token`, `note`, `isRevoked`, `userId` (nullable owner, `ON DELETE SET NULL`), timestamps.

### `prefix_ShibbolethUserIdentity`

SAML identity link, unique per `userId`, `email`, and `nameId`: `displayName`, `nameIdFormat`, `unstructuredName`, `eduPersonPrincipalName`, `rawAttributes` (JSON), `lastLoggedInAt`, `loginCount`.

### `prefix_ShibbolethAuthenticationAttempt`

Audit log: `stage` (e.g. `LOGIN_REQUEST`, `ASSERTION_CONSUMER_SERVICE`), `status` (`STARTED|REDIRECTED|SUCCESS|FAILED|REJECTED`), `userId`, `email`, `displayName`, `nameId`, `relayState`, `ip`, `userAgent`, `errorMessage`, `rawAttributes`.

### `prefix_UserMemory`

Persistent memories (see [Memory](users/memory.md)): `userId` FK, `agentPermanentId` FK (nullable), `content`, `isGlobal`, `deletedAt` (soft delete), timestamps.

### `prefix_Wallet`

Stored credentials (see [Wallet](users/wallet.md)); renamed from `prefix_UserWallet`: `userId` FK, `isUserScoped`, `agentPermanentId` FK (nullable), `recordType` (`USERNAME_PASSWORD|SESSION_COOKIE|ACCESS_TOKEN`), `service`, `key`, `jsonSchema` (JSON, nullable), `username`, `password`, `secret`, `cookies`, `isGlobal`, `deletedAt`, timestamps.

### `prefix_UserData`

Free-form per-user key/value settings: `userId` FK, `key`, `value` (JSON). See [Settings and notifications](users/settings-and-notifications.md).

### `prefix_UserPushSubscription`

Web-push subscriptions: `id` TEXT PK, `userId` FK cascade, `endpoint` (unique), `p256dh`, `auth`, `userAgent`, focus tracking (`isChatFocused`, `focusedAgentPermanentId`, `focusedChatId`, `focusUpdatedAt`).

## Files and media

### `prefix_File`

Uploaded/derived files (see [Attachments and files](chat/attachments-and-files.md)): `userId` (nullable), `agentId` (nullable), `fileName`, `fileSize`, `fileType`, `storageUrl`, `shortUrl`, `purpose`, `status` (upload lifecycle), `securityResult` (JSON verdict).

### `prefix_Image`

Generated images: `filename`, `prompt`, `cdnUrl`, `cdnKey`, `agentId` (nullable), `purpose` (`AVATAR|TESTING`).

### `prefix_ShareTargetPayload`

Pending PWA share-target payloads: `id` TEXT PK, `agentPermanentId` FK cascade, `message`, `attachments` (JSON array), `consumedAt`. See [Embedding and PWA](ui/embedding-and-pwa.md#share-target).

## Messaging

### `prefix_Message`

Channel-agnostic message log (currently `EMAIL`): `channel`, `direction` (`INBOUND|OUTBOUND`), `sender` (JSON), `recipients` (JSON), `content`, `threadId`, `metadata` (JSON). See [Email](integrations/email.md).

### `prefix_MessageSendAttempt`

Delivery attempts per message: `messageId` FK, `providerName`, `isSuccessful`, `raw` (provider response JSON).

## Calendar

### `prefix_CalendarConnection`

`userId` + `agentPermanentId` FKs cascade, `provider`, `calendarUrl`, `calendarId`, `tokenRef` (reference to the wallet-held token), `scopes` (JSON), `status` (default `CONNECTED`), `disconnectedAt`, `lastSyncedAt`. Unique active connection per `(userId, agentPermanentId, provider, calendarUrl)`.

### `prefix_CalendarActivity`

Audit of calendar operations: `userId` (SET NULL), `agentPermanentId` FK cascade, `connectionId` (SET NULL), `provider`, `operation`, `calendarUrl`, `eventId`, `status`, `details` (JSON). See [Calendar](integrations/calendar.md).

## Configuration

### `prefix_Metadata`

Admin-editable instance configuration: `key`, `value` (text), `note`. Keys, defaults, and semantics in [Configuration](configuration.md#metadata).

### `prefix_ServerLimit`

Dedicated numeric limits: `key`, `value` (number). Keys in [Configuration](configuration.md#server-limits).

### `prefix_CustomStylesheet` / `prefix_CustomJavascript`

Admin-managed custom CSS/JS: unique `scope` + `css`/`js` text (see [Configuration](configuration.md#custom-css-and-javascript)).

## Cross-cutting invariants

-   **Soft deletion** (`deletedAt`) is used for `Agent`, `AgentFolder`, `UserMemory`, `Wallet`; hard deletes cascade where FKs specify.
-   **`permanentId` is the join key** for everything agent-related created after agent names stopped being unique; `agentName` columns retained in `ChatHistory`/`ChatFeedback` are denormalized snapshots.
-   **Backward-compatible migrations only**: columns/tables are added, never removed/renamed in meaning; older server versions MUST keep working against a newer schema (see [Migrations](operations/migrations.md#compatibility-rules)).
-   The reference implementation enables row-level security on all tables and accesses them exclusively with the service-role key server-side.
