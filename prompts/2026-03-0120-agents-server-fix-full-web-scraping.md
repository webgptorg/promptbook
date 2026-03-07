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

### Raw error log


```
# Tool call report

- **Title:** 🌐 Running browser
- **Tool:** `run_browser`
- **Created at:** `2026-03-07T15:44:18.018Z`
- **Idempotency key:** `raw:call_4QE83kOle0ykNCBbjO3Zmson`

## Input payload

~~~json
{
  "toolName": "run_browser",
  "arguments": "{\"url\":\"https://www.pavolhejny.com/\",\"actions\":[{\"type\":\"wait\",\"value\":\"3\"},{\"type\":\"scroll\",\"value\":\"1200\"},{\"type\":\"wait\",\"value\":\"2\"},{\"type\":\"scroll\",\"value\":\"1200\"},{\"type\":\"wait\",\"value\":\"2\"},{\"type\":\"scroll\",\"value\":\"1200\"},{\"type\":\"wait\",\"value\":\"2\"}]}"
}
~~~

## Output payload

~~~text
        # Browser run failed

        **URL:** https://www.pavolhejny.com/
        **Session:** agents-server-run-browser-bace4ed5-ab7b-4e09-b604-21b12d0df0d4
        **Mode:** remote-browser
        **Environment:** Node v22.22.0 (linux/x64) • production
        **Remote browser URL:** ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4
        **Error:** browserType.connect: WebSocket error: connect ECONNREFUSED 159.203.128.124:3000
Call log:
  - <ws connecting> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4
  - <ws error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 error connect ECONNREFUSED 159.203.128.124:3000
  - <ws connect error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 connect ECONNREFUSED 159.203.128.124:3000
  - <ws disconnected> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 code=1006 reason=


        
                ## Error details

                browserType.connect: WebSocket error: connect ECONNREFUSED 159.203.128.124:3000
Call log:
  - <ws connecting> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4
  - <ws error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 error connect ECONNREFUSED 159.203.128.124:3000
  - <ws connect error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 connect ECONNREFUSED 159.203.128.124:3000
  - <ws disconnected> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 code=1006 reason=

    at m.createRemoteBrowserContext (/var/task/apps/agents-server/.next/server/chunks/7866.js:6:2999)
    at m.getBrowserContext (/var/task/apps/agents-server/.next/server/chunks/7866.js:6:1216)
    at g (/var/task/apps/agents-server/.next/server/chunks/7866.js:48:8603)
    at r (/var/task/apps/agents-server/.next/server/chunks/7866.js:62:980)
    at D (/var/task/apps/agents-server/.next/server/chunks/7866.js:122:54)
    at eval (<anonymous>:59:17)
    at eval (<anonymous>:60:3)
    at JavascriptEvalExecutionTools.execute (/var/task/apps/agents-server/.next/server/chunks/7866.js:148:74)
    at Object.execute (/var/task/apps/agents-server/.next/server/chunks/4146.js:1:4854)
    at l (/var/task/apps/agents-server/.next/server/chunks/8343.js:46:30238)
    at async ec.data.name (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:71920)
    at async /var/task/apps/agents-server/.next/server/chunks/8343.js:50:29920
    at async fG (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:69791)
    at async gh (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:91753)
    at async #Y (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:114706)
            

        The browser tool could not complete the requested actions.
        Please verify action arguments (selectors/values) or try a simpler interaction sequence.
~~~

## Model payload

~~~json
{
  "type": "function_call_result",
  "name": "run_browser",
  "callId": "call_4QE83kOle0ykNCBbjO3Zmson",
  "status": "completed",
  "output": {
    "type": "text",
    "text": "        # Browser run failed\n\n        **URL:** https://www.pavolhejny.com/\n        **Session:** agents-server-run-browser-bace4ed5-ab7b-4e09-b604-21b12d0df0d4\n        **Mode:** remote-browser\n        **Environment:** Node v22.22.0 (linux/x64) • production\n        **Remote browser URL:** ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4\n        **Error:** browserType.connect: WebSocket error: connect ECONNREFUSED 159.203.128.124:3000\nCall log:\n  - <ws connecting> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4\n  - <ws error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 error connect ECONNREFUSED 159.203.128.124:3000\n  - <ws connect error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 connect ECONNREFUSED 159.203.128.124:3000\n  - <ws disconnected> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 code=1006 reason=\n\n\n        \n                ## Error details\n\n                browserType.connect: WebSocket error: connect ECONNREFUSED 159.203.128.124:3000\nCall log:\n  - <ws connecting> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4\n  - <ws error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 error connect ECONNREFUSED 159.203.128.124:3000\n  - <ws connect error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 connect ECONNREFUSED 159.203.128.124:3000\n  - <ws disconnected> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 code=1006 reason=\n\n    at m.createRemoteBrowserContext (/var/task/apps/agents-server/.next/server/chunks/7866.js:6:2999)\n    at m.getBrowserContext (/var/task/apps/agents-server/.next/server/chunks/7866.js:6:1216)\n    at g (/var/task/apps/agents-server/.next/server/chunks/7866.js:48:8603)\n    at r (/var/task/apps/agents-server/.next/server/chunks/7866.js:62:980)\n    at D (/var/task/apps/agents-server/.next/server/chunks/7866.js:122:54)\n    at eval (<anonymous>:59:17)\n    at eval (<anonymous>:60:3)\n    at JavascriptEvalExecutionTools.execute (/var/task/apps/agents-server/.next/server/chunks/7866.js:148:74)\n    at Object.execute (/var/task/apps/agents-server/.next/server/chunks/4146.js:1:4854)\n    at l (/var/task/apps/agents-server/.next/server/chunks/8343.js:46:30238)\n    at async ec.data.name (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:71920)\n    at async /var/task/apps/agents-server/.next/server/chunks/8343.js:50:29920\n    at async fG (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:69791)\n    at async gh (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:91753)\n    at async #Y (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:114706)\n            \n\n        The browser tool could not complete the requested actions.\n        Please verify action arguments (selectors/values) or try a simpler interaction sequence."
  }
}
~~~

## Full event

~~~json
{
  "name": "run_browser",
  "arguments": "{\"url\":\"https://www.pavolhejny.com/\",\"actions\":[{\"type\":\"wait\",\"value\":\"3\"},{\"type\":\"scroll\",\"value\":\"1200\"},{\"type\":\"wait\",\"value\":\"2\"},{\"type\":\"scroll\",\"value\":\"1200\"},{\"type\":\"wait\",\"value\":\"2\"},{\"type\":\"scroll\",\"value\":\"1200\"},{\"type\":\"wait\",\"value\":\"2\"}]}",
  "rawToolCall": {
    "type": "function_call_result",
    "name": "run_browser",
    "callId": "call_4QE83kOle0ykNCBbjO3Zmson",
    "status": "completed",
    "output": {
      "type": "text",
      "text": "        # Browser run failed\n\n        **URL:** https://www.pavolhejny.com/\n        **Session:** agents-server-run-browser-bace4ed5-ab7b-4e09-b604-21b12d0df0d4\n        **Mode:** remote-browser\n        **Environment:** Node v22.22.0 (linux/x64) • production\n        **Remote browser URL:** ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4\n        **Error:** browserType.connect: WebSocket error: connect ECONNREFUSED 159.203.128.124:3000\nCall log:\n  - <ws connecting> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4\n  - <ws error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 error connect ECONNREFUSED 159.203.128.124:3000\n  - <ws connect error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 connect ECONNREFUSED 159.203.128.124:3000\n  - <ws disconnected> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 code=1006 reason=\n\n\n        \n                ## Error details\n\n                browserType.connect: WebSocket error: connect ECONNREFUSED 159.203.128.124:3000\nCall log:\n  - <ws connecting> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4\n  - <ws error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 error connect ECONNREFUSED 159.203.128.124:3000\n  - <ws connect error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 connect ECONNREFUSED 159.203.128.124:3000\n  - <ws disconnected> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 code=1006 reason=\n\n    at m.createRemoteBrowserContext (/var/task/apps/agents-server/.next/server/chunks/7866.js:6:2999)\n    at m.getBrowserContext (/var/task/apps/agents-server/.next/server/chunks/7866.js:6:1216)\n    at g (/var/task/apps/agents-server/.next/server/chunks/7866.js:48:8603)\n    at r (/var/task/apps/agents-server/.next/server/chunks/7866.js:62:980)\n    at D (/var/task/apps/agents-server/.next/server/chunks/7866.js:122:54)\n    at eval (<anonymous>:59:17)\n    at eval (<anonymous>:60:3)\n    at JavascriptEvalExecutionTools.execute (/var/task/apps/agents-server/.next/server/chunks/7866.js:148:74)\n    at Object.execute (/var/task/apps/agents-server/.next/server/chunks/4146.js:1:4854)\n    at l (/var/task/apps/agents-server/.next/server/chunks/8343.js:46:30238)\n    at async ec.data.name (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:71920)\n    at async /var/task/apps/agents-server/.next/server/chunks/8343.js:50:29920\n    at async fG (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:69791)\n    at async gh (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:91753)\n    at async #Y (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:114706)\n            \n\n        The browser tool could not complete the requested actions.\n        Please verify action arguments (selectors/values) or try a simpler interaction sequence."
    }
  },
  "createdAt": "2026-03-07T15:44:18.018Z",
  "idempotencyKey": "raw:call_4QE83kOle0ykNCBbjO3Zmson",
  "result": "        # Browser run failed\n\n        **URL:** https://www.pavolhejny.com/\n        **Session:** agents-server-run-browser-bace4ed5-ab7b-4e09-b604-21b12d0df0d4\n        **Mode:** remote-browser\n        **Environment:** Node v22.22.0 (linux/x64) • production\n        **Remote browser URL:** ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4\n        **Error:** browserType.connect: WebSocket error: connect ECONNREFUSED 159.203.128.124:3000\nCall log:\n  - <ws connecting> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4\n  - <ws error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 error connect ECONNREFUSED 159.203.128.124:3000\n  - <ws connect error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 connect ECONNREFUSED 159.203.128.124:3000\n  - <ws disconnected> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 code=1006 reason=\n\n\n        \n                ## Error details\n\n                browserType.connect: WebSocket error: connect ECONNREFUSED 159.203.128.124:3000\nCall log:\n  - <ws connecting> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4\n  - <ws error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 error connect ECONNREFUSED 159.203.128.124:3000\n  - <ws connect error> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 connect ECONNREFUSED 159.203.128.124:3000\n  - <ws disconnected> ws://159.203.128.124:3000/790ee3e4fa3ff74f1d2ac5ce307865c4 code=1006 reason=\n\n    at m.createRemoteBrowserContext (/var/task/apps/agents-server/.next/server/chunks/7866.js:6:2999)\n    at m.getBrowserContext (/var/task/apps/agents-server/.next/server/chunks/7866.js:6:1216)\n    at g (/var/task/apps/agents-server/.next/server/chunks/7866.js:48:8603)\n    at r (/var/task/apps/agents-server/.next/server/chunks/7866.js:62:980)\n    at D (/var/task/apps/agents-server/.next/server/chunks/7866.js:122:54)\n    at eval (<anonymous>:59:17)\n    at eval (<anonymous>:60:3)\n    at JavascriptEvalExecutionTools.execute (/var/task/apps/agents-server/.next/server/chunks/7866.js:148:74)\n    at Object.execute (/var/task/apps/agents-server/.next/server/chunks/4146.js:1:4854)\n    at l (/var/task/apps/agents-server/.next/server/chunks/8343.js:46:30238)\n    at async ec.data.name (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:71920)\n    at async /var/task/apps/agents-server/.next/server/chunks/8343.js:50:29920\n    at async fG (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:69791)\n    at async gh (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:91753)\n    at async #Y (/var/task/apps/agents-server/.next/server/chunks/8343.js:50:114706)\n            \n\n        The browser tool could not complete the requested actions.\n        Please verify action arguments (selectors/values) or try a simpler interaction sequence."
}
~~~
```


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