[-]

[🔐] Fix SSRF vulnerability in unauthenticated `/api/scrape` endpoint of Agents Server

-   The `/api/scrape` endpoint at `apps/agents-server/src/app/api/scrape/route.ts` accepts a `url` query parameter from the client and fetches its content server-side using `fetchUrlContent`. There is **no authentication check** on this route — any unauthenticated user can call it. This allows attackers to perform Server-Side Request Forgery (SSRF): they can use the server as a proxy to reach internal services (e.g., `http://localhost`, `http://169.254.169.254` for cloud metadata endpoints, databases, or other internal network resources that are not publicly accessible).
-   The fix involves two changes: (1) add an authentication guard so only logged-in users (or at minimum admin users) can call this endpoint, and (2) validate/allowlist the destination URL so it cannot target private/internal IP ranges (RFC1918: `10.x`, `172.16–31.x`, `192.168.x`, `127.x`, `169.254.x`, etc.) or non-HTTP(S) schemes.
-   The vulnerability is in [`apps/agents-server/src/app/api/scrape/route.ts`](apps/agents-server/src/app/api/scrape/route.ts), specifically in the `GET` handler where `url` from `searchParams` is passed directly to `fetchUrlContent(url)` without any auth or URL validation.
-   Do a proper analysis of the current functionality before you start implementing — check how other authenticated routes guard access (e.g., `getCurrentUser`) and how `fetchUrlContent` is used from `src/commitments/USE_BROWSER/fetchUrlContent.ts`.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
