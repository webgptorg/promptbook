[ ]

[🔐] Fix unauthenticated infinite-stream DoS in `/api/long-streaming` of Agents Server

-   [`apps/agents-server/src/app/api/long-streaming/route.ts`](apps/agents-server/src/app/api/long-streaming/route.ts) exposes a `GET` route that opens a `ReadableStream` and pushes a single byte `'x'` every 100 ms inside a `while (just(true))` loop with no termination condition, no `request.signal` abort handling, no authentication, and no rate limit.
-   Any anonymous client can hold one connection open indefinitely (and hold many in parallel) to consume Node's event-loop, HTTP keep-alive slots, and reverse-proxy connection budget on the standalone VPS deployment — a denial-of-service primitive that needs **zero** authentication or skill to exploit.
-   The fix is to either remove this endpoint entirely (it appears to be a `[🐚]` test / demo route — see the trailing comment in the file) or, if it must remain for diagnostic purposes, gate it on `NODE_ENV !== 'production'` **and** on `isUserGlobalAdmin()`, and bound the loop with a maximum-duration / max-chunk limit plus `request.signal.aborted` handling.
-   Do a proper analysis of the current functionality before you start implementing — search the Agents Server frontend for any caller of `/api/long-streaming` to confirm it is not exercised by a real feature.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
