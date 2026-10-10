[-]

[🔐] Fix unauthenticated email-sending proxy in Agents Server browser APIs

-   The Agents Server exposes [`apps/agents-server/src/app/api/send-email/route.ts`](apps/agents-server/src/app/api/send-email/route.ts) as a browser-facing POST endpoint, but the route performs no authentication or authorization checks before forwarding the request body into the server-side [`send_email`](apps/agents-server/src/tools/send_email.ts) tool.
-   The tool trusts caller-supplied `__promptbookToolRuntimeContext.email.smtpCredential` and `fromAddress` values, so any client that can reach the route can make the server open SMTP connections and attempt to send arbitrary outbound mail.
-   This turns the server into a public email proxy / relay primitive, bypasses the admin-only UI at [`apps/agents-server/src/app/admin/messages/send-email/page.tsx`](apps/agents-server/src/app/admin/messages/send-email/page.tsx), and creates obvious abuse, spam, and auditing problems.
-   The browser helper in [`src/commitments/USE_EMAIL/sendEmailViaBrowser.ts`](src/commitments/USE_EMAIL/sendEmailViaBrowser.ts) also normalizes this route as the default browser transport, so the security boundary needs to be enforced in the server route instead of trusting clients to behave.
-   Fix this by requiring the appropriate authenticated user or agent context, rejecting runtime SMTP credentials that arrive directly from arbitrary browser requests, and moving credential selection to trusted server-side storage with rate limiting and audit logging.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
