# Users and Authentication

This spec defines every identity the Agents Server recognizes and the authorization boundaries between them. All identity data is scoped **per server instance** (table prefix — see [Servers and multi-tenancy](servers-and-multi-tenancy.md)).

## Identity kinds

| Identity            | Establishes                                             | How                                                                     |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| Anonymous visitor   | Public browsing, chat with accessible agents.           | No credentials; optional stable `anonymousUsername` cookie.             |
| User                | Team member of the instance; durable chats, editing.    | Signed session cookie after username/password or Shibboleth login.      |
| Admin user          | Everything a user can, plus `/admin` and admin APIs.    | `User.isAdmin = true`, or the environment admin.                        |
| Environment admin   | Global super-admin (`isGlobalAdmin`).                   | Username `admin` + password equal to the `ADMIN_PASSWORD` env variable. |
| API token           | Programmatic access ([Management API](api/management-api.md), OpenAI-compatible APIs, restricted-access bypass). | `Authorization: Bearer ptbk_…` matching a non-revoked `prefix_ApiTokens` row. |
| Worker token        | Internal background routes only.                        | Shared secret `PTBK_AGENTS_SERVER_USER_CHAT_WORKER_TOKEN` (see [Internal workers API](api/internal-workers.md)). |
| Team internal token | Same-server agent-to-agent access to `PRIVATE` agents.  | `X-Promptbook-Team-Agent-Access-Token` header equal to `PROMPTBOOK_TEAM_AGENT_ACCESS_TOKEN`. |

### Anonymous visitors

Anonymous chat participants get a generated identifier `anonymous-<random>` kept in the long-lived (2-year) `anonymousUsername` cookie so feedback/history can correlate turns without an account.

## Sessions

-   The session is a **signed, stateless cookie** named `sessionToken`, `httpOnly`, path `/`, max-age 2 years.
-   Token format: `base64(JSON payload).hexHmacSha256(payload)`, keyed by the `SESSION_SECRET` environment variable. Payload: `{ username, isAdmin, isGlobalAdmin? }`.
-   Verification MUST use a timing-safe comparison and reject any token whose payload is malformed (`username` not a string / `isAdmin` not a boolean).
-   In production the server MUST refuse to sign sessions when `SESSION_SECRET` is missing (no fallback to `ADMIN_PASSWORD` or a constant). Outside production a random per-process key MAY be generated (invalidating cookies on restart).
-   The `Secure` cookie flag is required in production, with one exception: the [standalone VPS raw-IP bootstrap](operations/deployment.md#standalone-vps) where login over `http://<IP>` must work before a domain/TLS exists.
-   A legacy `adminToken` cookie holding the raw admin password is still honored for the environment admin (compared timing-safely against `ADMIN_PASSWORD`) and is cleared on logout.

## Passwords

-   Stored as `salt:hash` using **scrypt** (32-byte salt, 64-byte key, both hex).
-   Minimum length 8. No maximum: passwords longer than 1024 characters are *compacted* — first 1024 chars + SHA-256 hex of the overflow — before hashing (DoS protection preserving entropy). Verification applies the same compaction and MUST be timing-safe and return `false` (never throw) on malformed input.

## Login endpoints

| Endpoint                              | Behavior                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /api/auth/login`                | Body `{ username, password }`. Order: (1) environment admin check, (2) `prefix_User` lookup + scrypt verify. On success sets the session cookie and returns `{ success: true }`; otherwise 401 `Invalid credentials`; 400 when fields missing. |
| `POST /api/auth/logout`               | Clears `sessionToken` and legacy `adminToken`.                                                                                                    |
| `POST /api/auth/change-password`      | Verifies the current password, validates and hashes the new one, updates the user row.                                                            |
| `GET /api/profile`                    | Returns the current session profile (or anonymous).                                                                                              |

**Brute-force protection:** failed login attempts are rate-limited in memory per IP (max 30 failures / 15 min) and per username (max 10 failures / 15 min) with growing backoff capped at 5 minutes; rate-limited attempts answer with a structured 429-style rejection and are recorded for forensics.

## User management

-   Users are **created by admins** (`POST /api/users` — `{ username, password, isAdmin? }`; UI `/admin/users`). There is no self-registration; the UI's "register" dialog sends a request to the configured `ADMIN_EMAIL` (via `POST /api/admin-email`), as does the forgotten-password dialog.
-   `GET /api/users` (admin) lists users; `/api/users/:username` reads/updates/deletes one (admin; password reset included). Users can update their own profile image.

## Shibboleth (SAML) login

Optional institutional SSO, enabled per instance by the `IS_SHIBBOLETH_AUTH_ACTIVE` metadata key and configured entirely through metadata (IdP metadata URL or pasted XML, SP entity-id override, accepted attribute names for email / display name / institutional identifier — see [Configuration](configuration.md)):

-   `GET /api/auth/shibboleth/login` — initiates the SP-initiated SAML flow (with sanitized RelayState back-URL).
-   `POST /api/auth/shibboleth/acs` — assertion consumer: validates the SAML response, extracts attributes, **finds or creates** the linked user (`prefix_ShibbolethUserIdentity` maps IdP identity → `prefix_User`), records the attempt in `prefix_ShibbolethAuthenticationAttempt`, sets the session cookie.
-   `GET /api/auth/shibboleth/metadata` — serves the generated SP metadata XML.
-   `GET /api/auth/shibboleth/status` — reports whether Shibboleth is active/configured (drives the login dialog button and `/admin/login-methods`).

## API tokens

-   Rows in `prefix_ApiTokens`: `token` (conventionally `ptbk_`-prefixed), `note`, `isRevoked`, optional `userId` owner.
-   Accepted as `Authorization: Bearer <token>`; revoked tokens MUST be rejected.
-   Used by: [OpenAI-compatible endpoints](api/openai-compatibility.md) (which alternatively accept a valid session cookie), the [Management API](api/management-api.md) (which additionally **requires** the token to have a `userId` owner), and the middleware [restricted-access](#restricted-access) bypass.
-   Managed by admins at `/admin/api-tokens` and `GET/POST/DELETE /api/api-tokens`.

## Team internal access token

Same-server `TEAM` conversations (agent calling a private teammate agent on the same instance) authorize with the dedicated secret `PROMPTBOOK_TEAM_AGENT_ACCESS_TOKEN` sent in the `X-Promptbook-Team-Agent-Access-Token` header. Routes explicitly opting in (`allowTeamInternalAccess`) accept it as a bypass for `PRIVATE` visibility only. When the variable is unset the feature **fails closed** (same-server private team access disabled). The value MUST be a dedicated random secret.

## Restricted access

When the instance's `RESTRICT_IP` metadata is a non-empty list of IPs/CIDR ranges, the middleware rejects requests whose client IP does not match **unless** the request carries a session cookie or a valid API token. Rejected browser requests land on the `/restricted` page. `/api/health` and static assets are never blocked.

## Authorization summary

-   Public: accessible-agent pages/APIs, docs, search of listed agents, embeds (subject to server visibility and embedding settings).
-   Session required: durable user chats, memory, wallet, settings, recycle bin, dashboards, agent creation/editing via UI APIs, mocked chats.
-   Admin required: `/admin/**`, `/api/admin/**`, `/api/users`, `/api/api-tokens`, `/api/metadata` writes, chat history/feedback administration, usage, send-email.
-   Worker token required: `/api/internal/**`.
-   The reference implementation treats all signed-in users of an instance as one team (no per-user isolation inside the UI); per-user scoping applies to durable chats, memory, wallet, settings, and Management-API ownership.
