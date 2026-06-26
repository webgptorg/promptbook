[ ]

[🔐] Fix missing rate-limiting and lockout on `/api/auth/login` of Agents Server

-   [`apps/agents-server/src/app/api/auth/login/route.ts`](apps/agents-server/src/app/api/auth/login/route.ts) and the underlying [`apps/agents-server/src/utils/authenticateUser.ts`](apps/agents-server/src/utils/authenticateUser.ts) accept username + password and verify either the environment-backed `admin` account or a bcrypt-hashed database user. The route has **no rate limiting, no exponential backoff, no IP-based lockout, no CAPTCHA, and no failed-attempt logging**. An attacker can therefore run an unlimited online dictionary attack against any known username.
-   The risk is amplified because:
    -   The `admin` account name is fixed and always present, and on many deployments `ADMIN_PASSWORD` is the operator-chosen password — often shorter / weaker than the bcrypt-protected DB accounts.
    -   On a successful guess of `admin`, the attacker also gains every credential that **reuses** `ADMIN_PASSWORD` as a fallback secret (session signing, OAuth state, internal worker tokens — see [`2026-06-0430`](prompts/2026-06-0430-security-session-secret-key.md), [`2026-06-0460`](prompts/2026-06-0460-security-oauth-state-secret-fallback.md), and [`2026-06-0770-security-worker-and-team-token-secret-fallback.md`](prompts/2026-06-0770-security-worker-and-team-token-secret-fallback.md)).
    -   `bcrypt` already adds per-attempt CPU cost, which protects the database, but it does **not** stop unlimited online guessing — only rate limiting at the route does.
-   The fix is to add a small, server-process-wide failed-attempt store (e.g. an in-memory `Map<key, { failures, lockedUntil }>` keyed by `${ip}:${username}`, optionally backed by the existing database for multi-instance deployments) and:
    1.  Reject login (HTTP 429) when more than N attempts happen in a sliding window per IP or per username.
    2.  Apply exponential backoff (e.g. doubling delay) after each consecutive failure for the same `(ip, username)` pair.
    3.  Log every failed and successful login attempt with the requesting IP for forensics.
    4.  Consider also applying the same rate limit to [`apps/agents-server/src/app/api/auth/change-password/route.ts`](apps/agents-server/src/app/api/auth/change-password/route.ts), since `currentPassword` verification there is the same primitive and is similarly unbounded.
-   Do a proper analysis of the current functionality before you start implementing — check whether the project already has a rate-limit utility (search for `rateLimit`, `serverLimits`, or `LimitReachedError`), and reuse it before introducing a new one.
-   Keep in mind the DRY _(don't repeat yourself)_ principle and the SOLID principles.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
