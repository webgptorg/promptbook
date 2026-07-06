# Authentication

Agents Server supports browser sessions, local users, an environment-defined admin user, API tokens, management API identities, internal worker tokens, and optional Shibboleth authentication.

## User Types

The server recognizes these user identities:

- Environment admin: username `admin`, authenticated by `ADMIN_PASSWORD`.
- Database user: row in `User`, authenticated by password hash or linked external identity.
- Synthetic legacy/global admin: used for bootstrap and legacy admin-token compatibility.
- API-token identity: database API token resolved to a user.
- Anonymous visitor: no authenticated identity.

Administrative behavior MUST be based on the resolved user having `isAdmin = true`.

## Browser Sessions

The browser session cookie is named `sessionToken`.

The token format is:

```text
base64(json-session-payload).hmacSha256Signature
```

The payload includes at least:

- `username`
- `isAdmin`
- optional `isGlobalAdmin`

The signature MUST be generated with `SESSION_SECRET`. In production, missing `SESSION_SECRET` is a configuration error. Outside production, the server MAY generate a random per-process secret and warn that sessions will be invalidated on restart.

The session cookie MUST be:

- `httpOnly`
- path `/`
- max age of two years
- `secure` in production except for explicit raw-IP bootstrap cases

`clearSession` MUST clear both `sessionToken` and the legacy `adminToken` cookie.

## Login

`POST /api/auth/login` accepts JSON:

```json
{
  "username": "admin",
  "password": "secret"
}
```

Behavior:

- Missing or invalid credentials return `401`.
- Rate-limited attempts return `429` and a `Retry-After` header.
- Successful authentication sets `sessionToken`.
- Environment admin login succeeds only for username `admin` and password equal to `ADMIN_PASSWORD`.
- Database user login verifies the stored password hash.

## Authentication Attempt Rate Limiting

Password authentication MUST be rate-limited per process:

- Window: 15 minutes.
- Maximum failed attempts per IP: 30.
- Maximum failed attempts per username: 10.
- Pair-level `(IP, username)` exponential backoff starts at 1 second and caps at 5 minutes.

Successful authentication clears the pair-level failure state. Failed, successful, and rate-limited attempts SHOULD be logged with the requesting IP address.

## Password Change

`POST /api/auth/change-password` requires a browser session. It accepts:

```json
{
  "currentPassword": "old",
  "newPassword": "new"
}
```

Environment admin users cannot change their password through this API. They MUST receive `403` with a message instructing them to update `ADMIN_PASSWORD`.

Database users must pass the current-password check, using the same rate limiter as login.

## API Tokens

API tokens are stored in `ApiTokens`.

Token format:

```text
ptbk_<uuid-without-hyphens>
```

An API token is valid when:

- The request has `Authorization: Bearer <token>`.
- The token starts with `ptbk_`.
- The token exists in `ApiTokens`.
- `isRevoked` is false.

Legacy UI APIs may accept either a valid API token or a signed session cookie. Management API routes MUST require an API token. See [Management API](management-api.md).

## API Token Management

`/api/api-tokens` is administrator-only and user-scoped.

- `GET` returns the current user's tokens, newest first.
- `POST` creates a token with a human note and the current user's `userId`.
- `DELETE?id=<id>` deletes a token only when it belongs to the current user.

## Management API Identity

The management API resolves identity from a bearer API token only. A missing, malformed, missing-owner, revoked, or unknown token MUST produce the error behavior defined in [Management API](management-api.md).

Legacy tokens with no `userId` MAY be assigned to an owner only when the owner can be inferred safely. Otherwise the request MUST fail with `token_owner_missing`.

## Internal Worker Token

Internal worker routes use the `x-user-chat-worker-token` header and the dedicated secret `PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN`.

In production, a missing worker token is a configuration error. Outside production, the server MAY generate a random per-process token and warn.

The worker token MUST NOT fall back to `ADMIN_PASSWORD`, Supabase service keys, public URLs, or hardcoded literals.

## Team Internal Access Token

Same-server team calls into private teammate agents use `PROMPTBOOK_TEAM_AGENT_ACCESS_TOKEN`. If the token is missing, team internal access is disabled and MUST fail closed.

## Private Mode

Private mode is a browser preference carried by cookie. Values `true` and `1` enable it.

When private mode is enabled:

- Stateless chat may still run.
- Persistent chat history and self-learning MUST be skipped where the chat path supports private mode.
- Durable user-chat and timeout APIs MUST reject requests.

See [Chat Runtime](chat-runtime.md) and [User Chats](user-chats.md).

## Shibboleth

Shibboleth authentication is optional and metadata-controlled. It links external identities to `User` rows and records authentication attempts. Its exact identity-provider configuration is part of [Integrations](integrations.md) and [Configuration](configuration.md).

