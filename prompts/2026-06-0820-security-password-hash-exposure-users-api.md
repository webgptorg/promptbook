[-]

[🔐] Fix `passwordHash` exposure in `/api/users` admin endpoint of Agents Server

-   [`apps/agents-server/src/app/api/users/route.ts`](apps/agents-server/src/app/api/users/route.ts) line 17–20 selects `*` from the `User` table and returns the full row to the admin UI, including the `passwordHash` column. Even though the endpoint is gated by `isUserAdmin()`, exposing bcrypt hashes over HTTP is unnecessary and dangerous: the hashes land in the admin's browser memory, the network log of any in-the-middle proxy, browser dev-tools history, and any CDN / WAF that buffers responses. An admin account compromise then leaks **every** user's offline-crackable bcrypt hash in one request.
-   The fix is to restrict the selected columns to what the UI actually needs (typically `id, username, isAdmin, createdAt, updatedAt`) and to explicitly exclude `passwordHash`. The same applies to the single-user route under [`apps/agents-server/src/app/api/users/[username]/route.ts`](apps/agents-server/src/app/api/users/%5Busername%5D/route.ts) — verify it does not return `passwordHash` either, and tighten it the same way.
-   Apply the same principle to any other route that does `select('*')` on the `User` table (e.g. helpers under `apps/agents-server/src/utils/` that hand the row to the UI through Server Components or `getCurrentUser`). Returning a typed projection (`Pick<UserRow, ...>`) at the boundary is the simplest and most defensible pattern.
-   Do a proper analysis of the current functionality before you start implementing — search the Agents Server frontend for which fields it actually reads from the `/api/users` response (`grep` for `passwordHash`, `users.map`, etc.), and adjust the type returned by the route accordingly so the UI keeps compiling.
-   Keep in mind the DRY _(don't repeat yourself)_ principle and the SOLID principles — consider a small shared `toPublicUser(row)` mapper.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
