# Data model — Messaging

A generic, channel-agnostic message store used for inbound/outbound communication that is **not** part of a
live `UserChat` — primarily [email](../features/email-messaging.md). See also the outbound message
providers there.

## `Message`

One message on some communication channel.

| Column | Type | Notes |
|---|---|---|
| `id` | bigint identity PK | |
| `channel` | text | e.g. `EMAIL`, `PROMPTBOOK_CHAT`. |
| `direction` | text | Whether the message is sent **from** or **to** the Promptbook. |
| `sender` | jsonb | Who sent it. |
| `recipients` | jsonb \| null | Recipients. |
| `content` | text | Markdown content. |
| `threadId` | text \| null | Thread the message belongs to. |
| `metadata` | jsonb \| null | Channel-specific metadata. |
| `createdAt` | timestamptz | |

## `MessageSendAttempt`

Each attempt to deliver a `Message` through a provider.

| Column | Type | Notes |
|---|---|---|
| `messageId` | bigint → `Message.id` (CASCADE) | |
| `providerName` | text | Provider used (e.g. SMTP/SendGrid/Zeptomail). |
| `isSuccessful` | boolean | Outcome. |
| `raw` | jsonb \| null | Raw provider response/error. |
| `createdAt` | timestamptz | |

## Related specs

- [Email & messaging](../features/email-messaging.md) — inbound/outbound flows and providers
- [Messages API](../api/integrations-api.md)
