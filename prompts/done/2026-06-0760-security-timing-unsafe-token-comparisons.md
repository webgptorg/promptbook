[x] $3.34 29 minutes by Claude Code

[🔐] Fix timing-unsafe `===` / `!==` comparisons for secrets and tokens in Agents Server

-   Several places in the codebase compare secrets, HMAC signatures, or shared internal tokens with JavaScript's `===` / `!==` operator. String equality in V8 short-circuits on the first byte that differs, so a remote attacker who can measure response timing can recover the secret one byte at a time. The fix is the same approach as [`2026-06-0420-security-timing-attack-admin-password.md`](prompts/2026-06-0420-security-timing-attack-admin-password.md): use Node's `crypto.timingSafeEqual` on equal-length `Buffer`s (and reject early when the lengths differ — that branch leaks only the length, not the content).
-   The vulnerability is found in **three places**:
    -   [`apps/agents-server/src/utils/session.ts`](apps/agents-server/src/utils/session.ts) line 99 — `if (signature !== expectedSignature) { return null; }` in `parseSessionToken`. Compares the HMAC signature carried in the user's `sessionToken` cookie against the expected signature with `!==`. This protects authentication for the whole web UI.
    -   [`src/commitments/_common/teamInternalAgentAccess.ts`](src/commitments/_common/teamInternalAgentAccess.ts) line 82 — `providedToken === expectedToken` in `isTeamInternalAgentAccessToken`. This is the shared secret that lets same-server TEAM calls reach private teammate agents.
    -   [`apps/agents-server/src/app/api/internal/agent-runner-limits/route.ts`](apps/agents-server/src/app/api/internal/agent-runner-limits/route.ts) line 50 and [`apps/agents-server/src/app/api/internal/user-chat-jobs/run/route.ts`](apps/agents-server/src/app/api/internal/user-chat-jobs/run/route.ts) line 92 — `token === resolveUserChatWorkerInternalToken()`. The shared worker token protects all "internal" worker tick routes; leaking it lets an attacker drive arbitrary user-chat jobs.
-   The fix is to:
    1.  Extract a small `isTimingSafeEqualString(candidate: string, expected: string): boolean` helper (or reuse [`apps/agents-server/src/utils/isAdminPasswordEqual.ts`](apps/agents-server/src/utils/isAdminPasswordEqual.ts) as a pattern). It should `Buffer.from` both sides, return `false` immediately on length mismatch, and otherwise call `timingSafeEqual`.
    2.  Replace each of the three `===` / `!==` sites with the new helper.
-   Do a proper analysis of the current functionality before you start implementing — confirm that the helper handles `undefined`/`null` inputs gracefully and that the session-cookie path remains compatible with legacy tokens.
-   Keep in mind the DRY _(don't repeat yourself)_ principle — there should be one shared timing-safe string-compare utility.
-   You are working with the [Promptbook Engine](src) and the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

