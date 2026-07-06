# Data model — Users & identity

Accounts, per-user data, memory, credentials, notifications, auth identities, API tokens, and calendar
links. See [Security & access](../architecture/security-and-access.md) for auth behavior.

## `User`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `username` | text | Unique. |
| `passwordHash` | text | Local-login password hash. |
| `isAdmin` | boolean | Server admin flag (default false). |
| `email` | text \| null | From Shibboleth or profile. |
| `displayName` | text \| null | |
| `authenticationProvider` | text | `LOCAL` (default) or `SHIBBOLETH`. |
| `profileImageUrl` | text \| null | Custom avatar. |
| `createdAt` / `updatedAt` | timestamptz | |

## `UserData`

Generic per-user key/value JSON store (e.g. UI preferences).

| Column | Type | Notes |
|---|---|---|
| `userId` | int → `User.id` | |
| `key` | text | |
| `value` | jsonb | |

## `UserMemory`

Facts the agent may recall across chats (self-learning / `MEMORY`). See [User memory](../features/user-memory.md).

| Column | Type | Notes |
|---|---|---|
| `userId` | bigint → `User.id` (CASCADE) | |
| `agentPermanentId` | text → `Agent.permanentId` (CASCADE) \| null | Set for agent-scoped memory. |
| `content` | text | The remembered fact. |
| `isGlobal` | boolean | Global (user-wide) vs. agent-scoped. |
| `deletedAt` | timestamptz \| null | Soft delete. |

Scope constraint: exactly one of `isGlobal=true, agentPermanentId=null` **or**
`isGlobal=false, agentPermanentId=<id>`.

## `Wallet`

Stored credentials an agent may use on the user's behalf (`WALLET` capability). Formerly `UserWallet`
(renamed). See [Wallet](../features/wallet.md).

| Column | Type | Notes |
|---|---|---|
| `userId` | bigint → `User.id` (CASCADE) | |
| `agentPermanentId` | text → `Agent.permanentId` (CASCADE) \| null | Null for global-scoped records. |
| `recordType` | text | `USERNAME_PASSWORD` / `SESSION_COOKIE` / `ACCESS_TOKEN`. |
| `service` | text | Which service the credential is for. |
| `key` | text | Sub-key (default `default`). |
| `username` / `password` / `secret` / `cookies` | text \| null | Credential material by type. |
| `jsonSchema` | jsonb \| null | Optional schema describing the record. |
| `isGlobal` | boolean | Global vs. agent-scoped. |
| `isUserScoped` | boolean | Whether scoped to the user. |
| `deletedAt` | timestamptz \| null | Soft delete. |

Scope constraint mirrors `UserMemory` (`isGlobal` ⇔ no `agentPermanentId`).

## `UserPushSubscription`

Web-push subscriptions and chat-focus state for delivering [notifications](../features/notifications.md).
**String** PK.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `userId` | bigint → `User.id` (CASCADE) | |
| `endpoint` | text | Push endpoint (indexed). |
| `p256dh` / `auth` | text | Web-push keys. |
| `userAgent` | text \| null | |
| `isChatFocused` | boolean | Whether a chat is currently focused (suppresses redundant pushes). |
| `focusedAgentPermanentId` / `focusedChatId` | text \| null | Current focus. |
| `focusUpdatedAt` | timestamptz \| null | |

## `ShibbolethUserIdentity`

Links a `User` to a SAML identity. See [Auth API](../api/auth-api.md).

| Column | Type | Notes |
|---|---|---|
| `userId` | bigint → `User.id` (CASCADE) | |
| `email` | text | |
| `displayName` | text \| null | |
| `nameId` / `nameIdFormat` | text \| null | SAML NameID. |
| `unstructuredName` / `eduPersonPrincipalName` | text \| null | Institutional identifiers. |
| `rawAttributes` | jsonb \| null | Full SAML attributes. |
| `lastLoggedInAt` | timestamptz \| null | |
| `loginCount` | bigint | |

## `ShibbolethAuthenticationAttempt`

Audit log of SSO attempts (stage, status, ip, error, attributes). `userId` → `User.id` (SET NULL).

## `ApiTokens`

Management/programmatic API keys (`ptbk_...`). See [Management API](../api/management-api-v1.md).

| Column | Type | Notes |
|---|---|---|
| `token` | text | The key value (`ptbk_...`). |
| `userId` | bigint → `User.id` (SET NULL) \| null | Owner (legacy rows may be null → backfilled). |
| `note` | text \| null | Label. |
| `isRevoked` | boolean | Default false. |

## `CalendarConnection` & `CalendarActivity`

`USE CALENDAR` connections and their activity log. See [Calendar](../features/calendar.md).

**`CalendarConnection`** — `userId` (CASCADE), `agentPermanentId` (CASCADE), `provider`, `calendarUrl`,
`calendarId`, `tokenRef` (reference to stored OAuth token), `scopes` (jsonb), `status` (default
`CONNECTED`), `disconnectedAt`, `lastSyncedAt`. Unique per `(userId, agentPermanentId, provider,
calendarUrl)` while connected.

**`CalendarActivity`** — append-only log: `userId` (SET NULL), `agentPermanentId` (CASCADE),
`connectionId` (SET NULL), `provider`, `operation`, `calendarUrl`, `eventId`, `status`, `details` (jsonb).

## Related specs

- [Security & access](../architecture/security-and-access.md) · [Auth API](../api/auth-api.md)
- [User memory](../features/user-memory.md) · [Wallet](../features/wallet.md) ·
  [Notifications](../features/notifications.md) · [Calendar](../features/calendar.md)
