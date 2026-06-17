[-]

[🔐] Fix session signing key reusing `ADMIN_PASSWORD` with insecure hardcoded fallback in Agents Server

-   The session signing key in [`apps/agents-server/src/utils/session.ts`](apps/agents-server/src/utils/session.ts) line 14 is set to `process.env.ADMIN_PASSWORD || 'default-secret-key-change-me'`. This has two critical problems: (1) When `ADMIN_PASSWORD` is not configured, the session HMAC signing key falls back to the hardcoded string `'default-secret-key-change-me'`, which is publicly known from the source code — anyone who reads the code can forge valid session tokens for any user including the admin. (2) Even when `ADMIN_PASSWORD` is set, reusing a password as a cryptographic signing key is poor practice — knowing the admin password lets an attacker forge arbitrary session tokens, and vice versa: a session token leak reveals the admin password.
-   The fix is to introduce a dedicated `SESSION_SECRET` environment variable for the HMAC signing key. The session module should require this variable to be explicitly set in production, and fail with a clear error message if it is missing (rather than silently falling back to a hardcoded value). A separate dedicated secret prevents any single leaked credential from compromising both authentication paths.
-   The vulnerability is in [`apps/agents-server/src/utils/session.ts`](apps/agents-server/src/utils/session.ts) line 14:
    ```typescript
    const SECRET_KEY = process.env.ADMIN_PASSWORD || 'default-secret-key-change-me';
    ```
-   Do a proper analysis of the current functionality before you start implementing — check how the session is currently used across `serializeSessionToken`, `getSession`, and `setSession` in that file, and update any deployment documentation or `.env.example` files to document the new `SESSION_SECRET` variable.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
