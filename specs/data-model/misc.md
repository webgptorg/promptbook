# Data model — Misc / infrastructure

Configuration, caches, locks, media, customization, and the global registry.

## `Metadata`

Per-server runtime configuration. `key` (unique) / `value` (text) / `note` (optional). See
[Configuration](../architecture/configuration.md) for the full list of supported keys and semantics.

## `ServerLimit`

Numeric guardrails. `key` (unique) / `value` (bigint). Definitions and defaults in
[Configuration → ServerLimit](../architecture/configuration.md).

## `LlmCache`

Cache of LLM responses so identical requests reuse results. `hash` (request key) / `value` (jsonb result).
Backs the Engine's LLM cache; see [Engine boundary](../architecture/promptbook-engine.md).

## `GenerationLock`

Advisory locks with expiry, used to serialize work such as migrations and preparation. `lockKey` /
`expiresAt`. See [Database → migrations](../architecture/database.md).

## `Image`

Generated/stored images (avatars, testing, generated media). `filename`, `prompt`, `cdnUrl`, `cdnKey`,
optional `agentId` → `Agent.id` (CASCADE), `purpose` (`AVATAR` / `TESTING`). See
[Image generation](../features/tools-and-capabilities.md).

## `File`

Uploaded-file tracking. See [File uploads](../features/file-uploads.md).

| Column | Type | Notes |
|---|---|---|
| `userId` | bigint → `User.id` | Uploader. |
| `agentId` | int → `Agent.id` (SET NULL) \| null | Associated agent. |
| `fileName` / `fileSize` / `fileType` | | Basic metadata. |
| `purpose` | text | Why it was uploaded. |
| `status` | text | Upload status (default `COMPLETED`). |
| `storageUrl` / `shortUrl` | text \| null | Object-store + short URLs (a former `cdnUrl` was dropped). |
| `securityResult` | jsonb \| null | Result of the [file security check](../features/file-uploads.md). |

## `CustomStylesheet` & `CustomJavascript`

Admin-managed global CSS/JS injected into every page (see [Customization](../features/customization.md)).
Each is a singleton keyed by `scope` (`GLOBAL`), with `css` / `javascript` text respectively.

## `_Server` (global, unprefixed)

The multi-tenant routing/migration registry. Documented in [Multi-server model](../architecture/multi-server.md):
`id`, `name` (unique), `environment` (`LTS`/`PREVIEW`/`PRODUCTION`/`LIVE`), `domain` (unique),
`tablePrefix` (unique).

## Nonce tables

Migrations reserve nonce storage used for one-time tokens/anti-replay in auth/integration flows.

## Related specs

- [Configuration](../architecture/configuration.md) · [Database](../architecture/database.md)
- [File uploads](../features/file-uploads.md) · [Customization](../features/customization.md)
