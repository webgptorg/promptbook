[ ]

[✨🥣] Fix full web scraping (run_browser remote connection refused)

-   Problem: `run_browser` fails with `browserType.connect: WebSocket error: connect ECONNREFUSED <ip>:3000` which prevents “full web scraping” flows that rely on a remote Playwright browser (example scraping https://www.pavolhejny.com/). The failure looks infrastructure-related (remote browser not reachable), but from product perspective the tool should be robust and give a reliable result or a clear actionable error.
-   Goal: Make web scraping in [Agents Server](apps/agents-server) reliable by improving `run_browser` connection strategy, fallbacks, diagnostics, and adding automated tests/healthchecks.

### Scope / Requirements

-   **Connection robustness**
    -   Detect remote-browser unavailability early (fast connect timeout, retry with backoff, explicit DNS/TCP diagnostics).
    -   Implement a **fallback strategy** when remote browser is unavailable:
        -   Prefer: connect to an alternative remote browser endpoint/pool if configured.
        -   Otherwise: fall back to a local/headless browser execution mode (if allowed in the runtime) OR return a structured error that suggests switching tool (`scrape_url` / non-graphical) or trying again.
    -   Ensure we do not hang the request; total time budget @@@ seconds (include per-step timeouts).

-   **Structured errors (tool UX)**
    -   When failing, return a machine-parseable error payload with:
        -   `category` (e.g. `REMOTE_BROWSER_UNREACHABLE`, `NAVIGATION_TIMEOUT`, `SELECTOR_NOT_FOUND`, ...)
        -   `retryable` boolean
        -   sanitized connection details (host:port, mode), plus troubleshooting hints
        -   a short user-facing summary suitable for chat UI
    -   Preserve the existing human-readable error report, but add the structured fields.

-   **Improve scraping result quality**
    -   Add a standard “post-processing” step for `run_browser` web scraping flows:
        -   extract main content (readability-like) + metadata (title, canonical url)
        -   remove cookie banners / navigation where possible (simple heuristics)
    -   Ensure output size limits are respected; summarize when needed (@@@ tokens/chars limit).

-   **Observability & operations**
    -   Add logging around remote browser connection attempts:
        -   connect start/end, duration, timeout reason
        -   which endpoint selected, whether fallback happened
    -   Add a lightweight healthcheck mechanism for remote browser endpoints (cached for @@@ seconds) to avoid repeated connection attempts when the endpoint is down.

-   **Testing**
    -   Add integration tests for:
        -   remote browser down → fallback path executed (or structured retryable error returned)
        -   navigation success → returns expected artifacts (screenshot/html/text) @@@
        -   timeouts handled correctly
    -   Tests must not depend on the real remote endpoint; use mocks or a local WS server fixture.

-   **Documentation**
    -   Document configuration options (env vars) for remote browser endpoints, timeouts, retries, fallback behaviour.
    -   Update any internal docs describing scraping tools (`run_browser`, `scrape_url`) and when to use each.

### Non-goals

-   Building a full crawler/spider (this PRD is about fixing the existing “full web scraping” path reliability).
-   Changing the LLM prompting strategy beyond what is needed to surface better errors.

### Acceptance criteria

-   When remote browser endpoint is down (ECONNREFUSED), `run_browser`:
    -   either successfully uses a fallback and completes the requested actions, **or** returns a structured retryable error within the time budget, without crashing.
-   Error message in chat is actionable (suggest retry / alternative tool / contact ops) and includes a short reason.
-   Integration tests cover remote-down scenario and are stable in CI.
-   Changes are reflected in [changelog](changelog/_current-preversion.md).

### Implementation notes

-   You are working with the [Agents Server](apps/agents-server).
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   If you need to do the database migration, do it (likely not needed here, but verify).
-   Add the changes into the [changelog](changelog/_current-preversion.md).

---

[-]

[✨🥣] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🥣] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🥣] qux

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)