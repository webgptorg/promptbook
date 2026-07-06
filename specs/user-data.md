# User Data

User data includes memories, wallet records, profile data, preferences, files, images, push subscriptions, and share-target payloads.

## User Profile

Public user projections MAY include:

- `id`
- `username`
- `isAdmin`
- `profileImageUrl`
- `email`
- `displayName`
- `authenticationProvider`
- timestamps

API responses MUST NOT expose `passwordHash`.

## Memory

`UserMemory` stores text memories for a user.

Memory scope:

- Global memory applies across agents.
- Agent memory applies to one `agentPermanentId`.

Memory records are soft-deletable. Chat runtime MAY include relevant memories in prompt context when memory is enabled and private mode does not disable persistence-related behavior.

## Wallet

`Wallet` stores credentials or secrets for a user or agent.

Supported record types:

- `USERNAME_PASSWORD`
- `SESSION_COOKIE`
- `ACCESS_TOKEN`

Wallet records may be:

- user-scoped
- agent-scoped
- global

Secrets MUST be redacted in normal API responses and admin exports unless the route explicitly performs an operation that needs the secret value.

Chat runtime can use wallet records to supply credentials to enabled tools. It MUST pass only the credentials needed by that tool invocation.

## User Key/Value Data

`UserData` stores JSON values by `(userId, key)`.

The server SHOULD use this table for structured user preferences or small feature state that does not justify a dedicated table.

## Files

Uploads are tracked by the `File` table.

File handling MUST record:

- owner user
- file name, size, and MIME type
- storage URL
- short URL when generated
- purpose
- status
- optional agent id
- security result

Upload limits MUST respect `MAX_FILE_UPLOAD_SIZE_MB`. File attachments passed into chat MUST be normalized before prompt/runtime use.

## Images

Images are tracked by the `Image` table and are used for agent avatars, testing, and generated media.

Image records include filename, prompt, CDN URL/key, agent id, purpose, and timestamps.

## Push Subscriptions

`UserPushSubscription` stores browser push subscription endpoints and keys. Endpoints MUST be unique.

Push preferences are controlled by metadata defaults and user settings. The server SHOULD avoid sending push notifications when the subscription is disabled or stale.

## Share Target

`ShareTargetPayload` stores payloads submitted through the PWA share target.

Payloads are scoped to an agent, may include message and attachment data, and are marked consumed after the target chat flow reads them.

## Settings

User settings APIs include theme, notification, keybinding, language, sound, vibration, private-mode, and chat-visual preferences.

Defaults come from metadata. User-level settings override defaults where the route family supports it.

