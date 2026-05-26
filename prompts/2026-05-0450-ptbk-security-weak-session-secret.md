[-]

[🔐] Fix weak default session signing secret in Agents Server authentication

-   The Agents Server signs the `sessionToken` cookie with `process.env.ADMIN_PASSWORD || 'default-secret-key-change-me'`, which means any deployment that forgets to set `ADMIN_PASSWORD` falls back to a public, hard-coded secret.
-   In that state, an attacker can forge a valid session cookie with arbitrary `username`, `isAdmin`, and `isGlobalAdmin` values and gain administrative access without knowing any real credentials.
-   The current implementation also couples cookie signing to the admin login password, so one secret is doing two unrelated security jobs and rotation of the admin password can invalidate or weaken session trust.
-   Fix this by introducing one dedicated high-entropy session secret for cookie signing, refusing to start when the signing secret is missing in production-like environments, and reviewing the cookie verification flow so the signature check uses a timing-safe comparison.
-   The vulnerability is found in [`apps/agents-server/src/utils/session.ts`](apps/agents-server/src/utils/session.ts), and it affects the login/session flow used from [`apps/agents-server/src/app/api/auth/login/route.ts`](apps/agents-server/src/app/api/auth/login/route.ts) and admin authorization checks through [`apps/agents-server/src/utils/isUserAdmin.ts`](apps/agents-server/src/utils/isUserAdmin.ts).
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
