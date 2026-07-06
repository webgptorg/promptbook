# Data model — Agents

Tables that define agents, their versions, placement, prepared artifacts, and federation defaults. See
[Agent](../agent.md) for the concept and [Agent lifecycle](../agents/lifecycle.md) for how these evolve.

## `Agent`

The agent itself. One row per agent.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | Internal id. |
| `agentName` | text | Derived from the first source line. **Not unique** (a former unique index was dropped). |
| `permanentId` | text | Stable unique id; defaults to `gen_random_uuid()`. The durable key other tables reference. |
| `agentHash` | text | Hash of `agentSource`; identifies the version. |
| `agentSource` | text | The [Book language](../book-language.md) source. |
| `agentProfile` | jsonb | Presentational profile, recomputed on every source change. |
| `promptbookEngineVersion` | text | Engine version at last update. |
| `visibility` | text | `PUBLIC` / `PRIVATE` / `UNLISTED` (default `UNLISTED`). |
| `userId` | bigint → `User.id` (SET NULL) | Owner. |
| `folderId` | bigint → `AgentFolder.id` (SET NULL) | Placement; null = root. |
| `sortOrder` | bigint | Ordering within a folder. |
| `usage` | jsonb | Accumulated usage/spend stats. |
| `preparedModelRequirements` | jsonb | Cached [compiled requirements](../agent-model-requirements.md); recomputed only on explicit [preparation](../agents/preparation.md), tied to `agentHash`. |
| `deletedAt` | text | Soft-delete marker (recycle bin). |
| `createdAt` / `updatedAt` | timestamptz | |

Indexes support directory listing (`deletedAt, sortOrder, agentName`) and visibility filtering.

> A `preparedExternals` column existed historically but was dropped in favor of the `AgentExternals` table.

## `AgentHistory`

Append-only version history, one row per saved source version. Referenced by `permanentId`
(`ON DELETE CASCADE`).

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `permanentId` | text → `Agent.permanentId` | The agent this version belongs to. |
| `agentName` | text | Name at that version. |
| `agentHash` | text | Version hash. |
| `previousAgentHash` | text \| null | Prior version's hash (chain). |
| `agentSource` | text | Source at that version. |
| `versionName` | text \| null | Optional human-assigned version label. |
| `promptbookEngineVersion` | text | Engine version. |
| `createdAt` | timestamptz | |

Used by the [history view](../agents/lifecycle.md) and version restore.

## `AgentFolder`

Hierarchical folders for organizing agents (self-referential tree).

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `name` | text | Folder name; unique per `(userId, parentId)` among non-deleted rows. |
| `parentId` | bigint → self (SET NULL) | Parent folder; null = root. |
| `userId` | bigint → `User.id` (SET NULL) | Owner. |
| `sortOrder` | bigint | Ordering. |
| `icon` / `color` | text \| null | [Appearance](../features/customization.md). |
| `deletedAt` | timestamptz \| null | Soft delete. |

## `AgentExternals`

Provider-side resources prepared for an agent version (e.g. vector stores, OpenAI assistants), so
preparation is not repeated. Keyed by content, not by agent id.

| Column | Type | Notes |
|---|---|---|
| `type` | text | Kind of external (e.g. vector store, assistant). |
| `hash` | text | Content hash the external was built from. Unique together with `type`. |
| `vendor` | text | Provider (e.g. `OPENAI`). |
| `externalId` | text | The provider's id for the resource. |
| `note` | text \| null | Optional note. |

See [Preparation](../agents/preparation.md).

## `AgentPreparation`

Tracks the asynchronous [preparation](../agents/preparation.md) lifecycle per agent.

| Column | Type | Notes |
|---|---|---|
| `agentPermanentId` | text → `Agent.permanentId` (CASCADE) | |
| `targetFingerprint` | text | Fingerprint of the source state to prepare for. |
| `lastPreparedFingerprint` | text \| null | Last successfully prepared fingerprint. |
| `status` | text | e.g. `SCHEDULED`, running/completed/failed states. Default `SCHEDULED`. |
| `triggerReason` | text | Why preparation was scheduled. |
| `scheduledAt` / `runAfter` / `startedAt` / `completedAt` / `failedAt` | timestamptz | Lifecycle timestamps. |
| `retryCount` | int | |
| `lastError` | text \| null | |
| `lastDurationMs` | int \| null | |

## `OpenAiAssistantCache`

Maps an `agentHash` to a provider `assistantId` so the OpenAI Assistant execution path reuses assistants.

| Column | Type |
|---|---|
| `agentHash` | text |
| `assistantId` | text |

## `VectorStoreKnowledgeSourceHashes`

Tracks knowledge-source content so vector-store indexing is incremental.

| Column | Type | Notes |
|---|---|---|
| `source` | text | Knowledge source identifier. |
| `hash` | text | Content hash. |
| `etag` / `lastModified` | text \| null | HTTP validators. |
| `sizeBytes` | bigint \| null | |

See [Knowledge](../agents/knowledge.md).

## `DefaultFederatedAgent`

Maps a normalized agent name to a source federated server/agent, optionally linked to a locally imported
copy. See [Federation](../features/federation.md).

| Column | Type | Notes |
|---|---|---|
| `normalizedName` | text | Unique. |
| `sourceServerUrl` | text | Origin server. |
| `sourceAgentIdentifier` | text | Origin agent identifier. |
| `localPermanentId` | text → `Agent.permanentId` (SET NULL) \| null | Local imported copy, if any. |

## Related specs

- [Agent](../agent.md) · [Agent lifecycle](../agents/lifecycle.md) · [Preparation](../agents/preparation.md)
- [Knowledge](../agents/knowledge.md) · [Federation](../features/federation.md)
