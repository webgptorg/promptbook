# Security & access control

This document covers authentication, authorization/roles, and the request-level access controls (IP
restriction, embedding, visibility/indexing, private mode, CSP). The endpoints are in
[Auth API](../api/auth-api.md); user/identity tables are in [User data model](../data-model/user.md).

## Identity & sessions

- **Session cookie.** Authenticated identity is carried in an HTTP-only cookie `sessionToken` holding a
  signed payload `{ username, isAdmin, isGlobalAdmin? }`. The payload is base64 JSON with an
  **HMAC-SHA256** signature keyed by `SESSION_SECRET`; verification is constant-time. Invalid/forged tokens
  parse to "anonymous".
- **`SESSION_SECRET` is mandatory in production** — the server refuses to sign sessions without it (so a
  leak of another credential cannot forge sessions). Outside production a random per-process key is
  generated (sessions reset on restart).
- **Cookie flags.** `httpOnly`, `path=/`, ~2-year `maxAge`, and `secure` decided per request: HTTPS is
  required for production domains but relaxed for the standalone-VPS raw-IP bootstrap over `http://<IP>`.
- **Legacy admin cookie.** A legacy `adminToken` cookie equal to `ADMIN_PASSWORD` is still accepted and maps
  to the `admin` user.

### Authentication providers

`User.authenticationProvider` is `LOCAL` (username + `passwordHash`) or `SHIBBOLETH`.

- **Local login** — `POST /api/auth/login` verifies the password and sets the session; `logout` clears it;
  `change-password` updates the hash.
- **Shibboleth SSO (SAML)** — optional, enabled by `IS_SHIBBOLETH_AUTH_ACTIVE`. The server exposes SAML SP
  metadata, a login redirect, and an Assertion Consumer Service (ACS). On success it maps configured SAML
  attributes (email / display name / institutional id) to a `User`, records a
  `ShibbolethUserIdentity`, logs each attempt in `ShibbolethAuthenticationAttempt`, and sets the session.
  Configuration lives in [`Metadata`](./configuration.md) (`SHIBBOLETH_*`). See [Auth API](../api/auth-api.md).

## Roles & authorization

- **Anonymous** — unauthenticated; may be assigned a stable id derived from browser cookies so chats/history
  can attribute to them.
- **User** — an authenticated account; owns agents/folders/chats/memory/wallet.
- **Admin** (`User.isAdmin`) — elevated within a server; may access the [admin console](../features/admin.md)
  and admin APIs, and see other users' data where applicable.
- **Global admin** (`isGlobalAdmin`, via `ADMIN_PASSWORD`) — environment-backed super-admin.

Authorization is enforced at each route/resource (e.g. chat scope resolution checks the requester owns the
chat or is an admin). Ownership uses `userId`; durable resource links use `agentPermanentId`.

### Programmatic auth

- **Management API keys** — `ptbk_...` bearer tokens (`ApiTokens`), each owned by a `userId`. Sent as
  `Authorization: Bearer ptbk_...`. Revocable. See [Management API](../api/management-api-v1.md).
- **Internal worker token** — `PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN` authorizes `/api/internal/*`
  (constant-time compared). See [Chat execution](../chat/execution-model.md).
- **Same-server team token** — `PROMPTBOOK_TEAM_AGENT_ACCESS_TOKEN` authorizes `TEAM` calls to private
  teammate agents on the same server; if unset the feature fails closed.

## Request-level access control (middleware)

The [middleware](./multi-server.md) computes, per request:

- **IP restriction.** If `RESTRICT_IP` (metadata) is set, only clients whose IP matches the allow-list
  (IPs/CIDRs) may access — **unless** they are logged in or present a valid API token. Otherwise the request
  is treated as access-restricted (→ the restricted page/response).
- **Embedding.** `IS_EMBEDDING_ALLOWED` controls whether the iframe/headless chat route may be framed by
  other sites; embedding headers (frame-ancestors etc.) are set accordingly.
- **Visibility headers.** Based on `SERVER_VISIBILITY` and the target agent's visibility, indexing headers
  (`X-Robots-Tag`, robots/sitemap behavior) are applied — see below.
- **Content-Security-Policy.** A fresh single-use **nonce** is generated per request; only inline scripts
  the server explicitly renders (theme bootstrap, admin custom JS, analytics) carry the nonce and may run.

## Visibility & indexing

Two independent axes:

- **Agent visibility** — `PRIVATE` / `UNLISTED` / `PUBLIC` (see [Agent](../agent.md)). Governs who can see
  and list an agent.
- **Server visibility** — `SERVER_VISIBILITY` = `PRIVATE` (blocks sitemap + indexing entirely) or `PUBLIC`
  (allows indexing of `PUBLIC` agents). `robots.txt` and `sitemap.xml` honor this.

## Private mode

A per-user browser preference (`USE PRIVACY` can request it). When on, the server **does not persist**
chat-history telemetry, and message-send/enqueue routes reject with 403 where persistence would be implied.
It can be toggled in the control panel unless disabled by `IS_CONTROL_PANEL_PRIVATE_MODE_ENABLED`. Agents
can prompt the user to enable it via the [`USE PRIVACY`](../commitments.md) capability.

## Secrets hygiene (summary)

- `SESSION_SECRET`, `PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN`, and
  `PROMPTBOOK_TEAM_AGENT_ACCESS_TOKEN` must be **dedicated** random strings, not reused from other
  credentials; several deliberately refuse to fall back to `ADMIN_PASSWORD`/service keys.
- Inbound email webhooks are signature-verified and host-allow-listed. See
  [Email](../features/email-messaging.md).

## Related specs

- [Auth API](../api/auth-api.md) · [Management API](../api/management-api-v1.md)
- [Multi-server model](./multi-server.md) · [Configuration](./configuration.md)
- [User data model](../data-model/user.md)
