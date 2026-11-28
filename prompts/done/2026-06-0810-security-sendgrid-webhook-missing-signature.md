[x] ~$1.31 2 hours by OpenAI Codex `gpt-5.5`

[🔐] Fix missing signature verification on SendGrid Inbound Parse webhook of Agents Server

-   [`apps/agents-server/src/app/api/emails/incoming/sendgrid/route.ts`](apps/agents-server/src/app/api/emails/incoming/sendgrid/route.ts) accepts a multipart `POST` with an `email` field, parses it via `parseInboundSendgridEmail`, and inserts the resulting record into the `Message` table as an `INBOUND` `EMAIL` from a caller-supplied `sender` and `recipients`. The route does **not** verify that the request actually originated from SendGrid.
-   Anyone on the public internet can `POST` to `https://<server>/api/emails/incoming/sendgrid` with a hand-crafted multipart payload and inject **arbitrary** records into the inbound-message pipeline. Depending on downstream consumers, this can:
    -   Spoof inbound email from any sender to any agent / address, enabling phishing of operators or other agents that act on inbound mail.
    -   Forge user replies if an agent treats inbound mail as user input (e.g. inbound-email-driven chat continuation).
    -   Pollute admin dashboards and audit logs with bogus traffic.
-   SendGrid Inbound Parse offers a signed-webhook mechanism (HMAC of the body against a configured shared secret, sent as `X-Twilio-Email-Event-Webhook-Signature` and `X-Twilio-Email-Event-Webhook-Timestamp`). The fix is to:
    1.  Read the SendGrid signing key from a dedicated environment variable (e.g. `SENDGRID_INBOUND_PARSE_PUBLIC_KEY` or a shared secret if the operator uses the HMAC variant) and refuse the request when the variable is missing.
    2.  Reject the request unless the signature header matches the body using a constant-time comparison (`crypto.timingSafeEqual` on equal-length `Buffer`s — see [`2026-06-0760-security-timing-unsafe-token-comparisons.md`](prompts/2026-06-0760-security-timing-unsafe-token-comparisons.md)).
    3.  Reject requests where the timestamp is too old (replay-window of a few minutes) to prevent replay attacks.
    4.  Also bind the route to the configured SendGrid Inbound Parse host(s) so that an attacker who only learns the URL cannot reach it without also defeating IP allowlisting.
-   Do a proper analysis of the current functionality before you start implementing — check `parseInboundSendgridEmail` and any other inbound-email consumer to understand what downstream side-effects a forged message triggers, and document the new env variable in the deployment guide.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

