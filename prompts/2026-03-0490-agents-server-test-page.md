[ ]

[✨🚅] Create testing page on `/test` on Agents server showing miscellaneous system capabilities

-   Create a simple, developer-facing testing page accessible at **`/test`** in the **Agents Server** web app (`apps/agents-server`).
-   The purpose of this page is to quickly verify and demo **misc capabilities** of the system in a single place (without needing to navigate multiple screens).

## Scope

### Route + visibility

-   Add a route **`/test`** (exact path).
-   The page should be available in development and production builds.
-   The page should be **non-indexable** by search engines.
    -   Add `robots` metadata / header in a way consistent with the existing Agents Server patterns.
-   Decide whether it should be publicly accessible or access-restricted (admin/dev-only): **@@@**
    -   If restricted, specify mechanism (e.g. env flag, secret query param, auth role): **@@@**

### Page content (capabilities to showcase)

The page should be composed from small sections/cards. Each section should:
-   explain what is being tested,
-   provide an interactive control (button/form), and
-   show the raw response (JSON/text) and a human-readable status.

Include at least these sections (unless not applicable in this repo; then replace with closest equivalent and document it):

1. **Server health & version**
    - Show Agents Server version/build info (`@@@` how to fetch)
    - Show runtime environment (`NODE_ENV`, deployment identifier if available)

2. **Auth/session status**
    - Show whether the user is signed in
    - Show user id / email (if available) and key session flags
    - Provide a button to refresh the session state

3. **API smoke tests**
    - Provide a small UI to call a handful of internal API routes used by the Agents Server UI (GET/POST)
    - Show HTTP status, latency, and parsed JSON
    - The exact endpoints to test: **@@@**

4. **Tooling/capabilities detection**
    - Display which tools/capabilities are available for the current user/agent/server configuration (e.g. browser tool, scraping, email, filesystem, MCP, etc.)
    - This should reuse the real detection logic used elsewhere in Agents Server (DRY)
    - Source of truth module/function to reuse: **@@@**

5. **File upload / attachments** (if supported)
    - Provide a file input to upload a small file
    - Display resulting attachment metadata and a way to download/preview
    - If not supported in Agents Server, document why and remove the section

6. **Realtime/streaming check**
    - Provide a test for streaming responses (SSE/stream) if Agents Server supports it
    - Show streamed chunks as they arrive
    - If not supported, add a placeholder note and link to relevant code path

7. **UI utilities**
    - Small widget(s) to verify:
        - toast/notification system
        - modal/dialog system
        - copy-to-clipboard
        - dark mode / theme toggle (if supported)
    - Reuse existing UI components.

### Navigation

-   Add a discreet way to reach the page:
    -   either a small link in an existing developer/admin menu, or
    -   a keyboard shortcut (documented on the page), or
    -   no navigation entry (direct URL only)
-   Preferred approach: **@@@**

## Non-goals

-   This is not a polished end-user feature.
-   Do not add new backend functionality just for the test page (only expose/compose what already exists).
-   Do not introduce new large UI frameworks.

## UX / design requirements

-   Keep layout minimal and fast.
-   Each test section should clearly show:
    - last run time
    - pass/fail indicator
    - raw response
    - errors (stack/trace if available)

## Technical notes

-   Use existing Agents Server conventions (routing, layouts, components, data fetching).
-   Keep the implementation DRY by reusing existing API clients/hooks/components.
-   Add basic unit/integration coverage only if there is an established pattern for UI route testing in this repo: **@@@**

## Acceptance criteria

-   Visiting `/test` renders the testing page without errors.
-   Page is non-indexable.
-   Page contains interactive sections that demonstrate at least:
    - health/version info
    - auth/session info
    - at least one internal API smoke test
    - at least one capability/tool detection output
-   Responses/errors are visible and useful for debugging.

---

@@@
