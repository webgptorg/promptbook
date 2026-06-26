[ ]

[🔐] Fix authentication bypass in `validateApiKey` that trusts any `sessionToken` cookie value of Agents Server

-   The `validateApiKey` helper in [`apps/agents-server/src/utils/validateApiKey.ts`](apps/agents-server/src/utils/validateApiKey.ts) lines 25–29 short-circuits authentication when the request carries a cookie named `sessionToken`, **without** verifying the cookie value:
    ```typescript
    if (!authHeader) {
        const hasSession = request.cookies.has('sessionToken');
        if (hasSession) {
            return { isValid: true };
        }
        // ...
    }
    ```
    Any client can attach an arbitrary `Cookie: sessionToken=anything` header and the helper returns `isValid: true`. This is a **critical authentication bypass**: every endpoint that protects itself with `validateApiKey` becomes effectively public.
-   `validateApiKey` is used by [`handleChatCompletion`](apps/agents-server/src/utils/handleChatCompletion.ts) which protects the OpenAI-compatible chat endpoints, including [`/api/openai/v1/chat/completions`](apps/agents-server/src/app/api/openai/v1/chat/completions/route.ts) and the per-agent chat-completion routes. An unauthenticated attacker can forge a fake `sessionToken` cookie and trigger arbitrary LLM calls against the server's API keys, exhausting paid credits and bypassing API-key-based rate limits.
-   The fix is to **parse and verify the session cookie** using the existing `parseSessionToken` (or `getSession`) helper from [`apps/agents-server/src/utils/session.ts`](apps/agents-server/src/utils/session.ts) before accepting the request. The helper must only return `isValid: true` when the cookie value passes HMAC-signature verification.
-   The vulnerability is in [`apps/agents-server/src/utils/validateApiKey.ts`](apps/agents-server/src/utils/validateApiKey.ts), specifically lines 25–29 of the `validateApiKey` function.
-   Do a proper analysis of the current functionality before you start implementing — check every call site of `validateApiKey` (grep for `validateApiKey(`) and the helper `parseSessionToken`/`getSession` in `session.ts` so the fix preserves the legitimate browser-session flow.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
