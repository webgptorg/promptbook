[x] $0.2989 21 minutes by Claude Code

[🔐] Fix timing attack vulnerability in admin password comparison of Agents Server

-   Admin password verification in three places uses JavaScript's `===` operator for string comparison instead of a constant-time function. This allows a timing attack: an attacker who can measure response times can determine the correct `ADMIN_PASSWORD` character by character by observing that correct prefixes return faster/slower than incorrect ones.
-   The fix is to use Node.js's built-in `timingSafeEqual` from the `crypto` module (already imported and used elsewhere in the codebase, e.g., in `apps/agents-server/src/utils/auth.ts` and `apps/agents-server/src/utils/githubApp/GithubAppConnectionState.ts`) for all admin password comparisons. Both operands must be `Buffer` of equal length before calling `timingSafeEqual`.
-   The vulnerability is found in **three places**:
    -   [`apps/agents-server/src/utils/isUserGlobalAdmin.ts`](apps/agents-server/src/utils/isUserGlobalAdmin.ts) line 21 — `cookieStore.get('adminToken')?.value === process.env.ADMIN_PASSWORD`
    -   [`apps/agents-server/src/utils/getCurrentUser.ts`](apps/agents-server/src/utils/getCurrentUser.ts) line 78 — `adminToken?.value === process.env.ADMIN_PASSWORD`
    -   [`apps/agents-server/src/utils/authenticateUser.ts`](apps/agents-server/src/utils/authenticateUser.ts) line 20 — `password === process.env.ADMIN_PASSWORD`
-   Do a proper analysis of the current functionality before you start implementing — look at how `timingSafeEqual` is already used in `apps/agents-server/src/utils/auth.ts` for inspiration.
-   Keep in mind the DRY _(don't repeat yourself)_ principle — consider extracting a shared `isAdminPasswordEqual(candidate: string): boolean` utility.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

