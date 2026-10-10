[-]

[🔐] Fix server-side request forgery in Agents Server URL proxy endpoints

-   The Agents Server exposes browser-reachable endpoints that fetch attacker-controlled URLs on the server side, which makes the server usable as an SSRF primitive against services reachable only from the server network.
-   [`apps/agents-server/src/app/api/scrape/route.ts`](apps/agents-server/src/app/api/scrape/route.ts) accepts any `url` query parameter and passes it into [`src/commitments/USE_BROWSER/fetchUrlContent.ts`](src/commitments/USE_BROWSER/fetchUrlContent.ts) without authentication, destination allowlisting, private-network blocking, redirect validation, or response-size/rate controls.
-   [`apps/agents-server/src/app/api/team-agent-profile/route.ts`](apps/agents-server/src/app/api/team-agent-profile/route.ts) has the same class of issue for profile lookups, because [`src/utils/validators/url/isValidAgentUrl.ts`](src/utils/validators/url/isValidAgentUrl.ts) allows arbitrary `http://` and `https://` URLs and even contains a commented-out TODO about private-network URLs.
-   In the current state, an attacker can make the server request `localhost`, RFC1918 addresses, link-local metadata endpoints, or internal admin panels that are not reachable from the public internet.
-   Fix this by gating the browser proxy routes behind the correct authorization model, blocking private and loopback destinations after DNS resolution and across redirects, and narrowing the teammate-profile endpoint to trusted team-agent origins instead of arbitrary URLs.
-   Group all findings of this same SSRF class into this one PRD instead of creating separate prompts for `/api/scrape` and `/api/team-agent-profile`.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
