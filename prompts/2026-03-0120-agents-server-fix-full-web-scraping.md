[ ]

[✨🌏] Fix full web scraping reliability (remote browser ECONNREFUSED)

-   The `run_browser` tool (remote-browser mode) sometimes fails before any page interaction, with `browserType.connect: WebSocket error: connect ECONNREFUSED <ip>:3000`.
-   This blocks “full web scraping” workflows that rely on graphical browsing (scrolling / dynamic content) and should gracefully fall back when remote browser infrastructure is unavailable.

### Goal

Make Agents Server web scraping more reliable by:

-   Detecting remote browser connection failures early and surfacing them in a structured way.
-   Adding robust retry + fallback behavior so scraping continues (best-effort) instead of failing hard.
-   Improving observability so we can distinguish: infrastructure outage vs. website-specific failures vs. invalid actions.

### Non-goals

-   Implementing a full crawler product.
-   Bypassing paywalls / logins / CAPTCHAs.
-   Making remote browser always available (we still need infra fixes, but this PRD focuses on Agents Server behavior).

### Requirements

#### 1) Error classification + UX

-   When `playwright.connect` (or equivalent) fails with `ECONNREFUSED`, `ETIMEDOUT`, DNS errors, or WS handshake errors:
    -   Classify it as `REMOTE_BROWSER_UNAVAILABLE`.
    -   Return a tool error object with:
        -   `code`, `message`, `isRetryable`, `suggestedNextSteps`, `debug` (includes remote WS URL host/port but not secrets).
    -   Ensure the UI/tool-call modal renders this clearly (not as a long raw stack trace), while still allowing expansion to “show debug details”.

#### 2) Retries with backoff

-   Add retry for connection establishment to remote browser:
    -   default 2 retries (total 3 attempts)
    -   exponential backoff (e.g. 250ms, 1000ms)
    -   jitter
-   Do not retry on deterministic input errors (invalid actions schema, invalid selector syntax) – only on network/infra-like failures.

#### 3) Fallback strategy (“best effort scraping”)

-   If remote browser is unavailable, automatically fall back to a non-graphical scraping approach:
    -   Use existing `scrape_url` / server-side HTML fetcher if present
    -   If multiple scrapers exist, choose the most similar output format to `run_browser` output.
-   Fallback response must include:
    -   `modeUsed: "fallback" | "remote-browser"`
    -   a warning that dynamic content may be missing
    -   the extracted content (html/text/markdown) in the same shape as other scrapers where possible

#### 4) Timeouts + cancellation

-   Make timeouts explicit and configurable:
    -   connect timeout
    -   page navigation timeout
    -   per-action timeout
-   Ensure cancellation (client abort / request timeout) stops ongoing retry loops and remote browser session acquisition.

#### 5) Observability

-   Add structured logs/metrics:
    -   remote browser connect success/failure counters
    -   error codes distribution
    -   time to first byte / time to connect
    -   fallback usage rate
-   Tag logs with `tool=run_browser`, `mode=remote-browser|fallback`, `sessionId`.

#### 6) Regression test coverage

-   Add tests for:
    -   ECONNREFUSED during connect → classified + retry → fallback
    -   invalid actions input → no retry, returns validation error
    -   remote browser ok but page navigation fails → proper classification

### Acceptance criteria

-   When remote browser websocket endpoint is down/unreachable, `run_browser` does not fail with a raw stack trace and does not block scraping completely.
-   In ≥90% of such outages, the system returns a fallback scrape result plus clear warning.
-   Retries do not increase average tool latency by more than @@@ in the success path.

### Technical notes / implementation hints

-   Primary area:
    -   `apps/agents-server/src/tools/run-browser.ts` (or equivalent)
    -   tool-call UI rendering in Promptbook chat tool-call modal
-   Prefer a small shared helper for retry/backoff used by other network tools.

### Product notes

-   Consider adding a user-facing toggle later: `strictRemoteBrowser: true|false` (out of scope for this PRD, but keep design extensible).

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌏] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌏] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌏] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)