[-]

[✨🔟] Testing page on `/test` on Agents Server showing misc capabilities of the system

-   Add a new internal-only page on the Agents Server available at route **`/test`**.
-   The goal of this page is to provide a **living playground / diagnostics dashboard** for developers to quickly verify that “misc capabilities” work end-to-end in the current deployment.
-   The page must be **safe by default**:
    -   It must not leak secrets.
    -   It must not allow unauthenticated public access to dangerous actions.
    -   It must not become a permanent user-facing feature.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

## Scope

### Route and access

-   Implement route **`/test`** in `apps/agents-server`.
-   Access control options (choose the best fitting current auth/infra):
    -   Preferred: allow only for authenticated users with admin/developer role/flag.
    -   Acceptable fallback: allow only in non-production environments (e.g. `NODE_ENV !== 'production'` or `VERCEL_ENV !== 'production'`).
    -   If neither exists in the codebase, add a minimal server-side guard + clear guidance in docs/config.
-   The page must show a clear banner:
    -   **“Test / Diagnostics page (not for end users)”**.
    -   Current environment: `@@@`.
    -   Build/version info: `@@@` (git SHA if available).

### Content: “misc capabilities” sections

Create a single page with multiple sections (cards). Each section should be **self-contained**, and when possible reuse existing components/utilities.

#### 1) Server & client diagnostics

-   Display:
    -   Runtime environment summary (env name, region, node version if available) `@@@`
    -   Feature flags relevant to Agents Server `@@@`
    -   Basic connectivity checks `@@@`
-   Provide a “Copy diagnostics to clipboard” button.

#### 2) Authentication / session

-   Show current auth status:
    -   logged in / logged out
    -   user id / email (if available)
    -   roles/permissions (if available)
-   Provide quick links:
    -   login/logout `@@@`

#### 3) API smoke tests (read-only)

-   Provide buttons that call safe read-only endpoints and display:
    -   response status
    -   response time
    -   truncated JSON preview
-   Include at least:
    -   `GET /api/health` or equivalent `@@@`
    -   `GET /api/version` or equivalent `@@@`
    -   One endpoint that reads current agent metadata `@@@`

#### 4) LLM / toolchain capabilities smoke tests

-   Provide a minimal UI to trigger a **non-destructive** LLM call (or a mocked provider if in dev):
    -   Input: prompt
    -   Output: streaming preview if supported, otherwise final text
    -   Capture token usage if available
-   Provide a minimal UI to test **tool calling** in a controlled way:
    -   Use a “demo tool” that returns deterministic output (no external side effects).

#### 5) File / attachment pipeline (safe)

-   Allow selecting a local file and verify the upload/processing path used by chat attachments.
-   Must include:
    -   size limit display
    -   MIME type display
    -   server response preview
-   If file upload requires auth, ensure it is enforced.

#### 6) Search / scraping / browser tools (guarded)

-   Provide optional test widgets for:
    -   “Search” (`@@@` provider)
    -   “Scrape URL”
    -   “Run browser”
-   These widgets must be behind an additional explicit confirmation (“I understand this may call external services”).
-   Do not allow arbitrary internal network access; ensure existing SSRF protections (or add them if missing) `@@@`.

#### 7) UI components & rendering checks

-   Add a section that renders:
    -   markdown preview
    -   code block
    -   error alert
    -   loading skeleton
    -   modals/toasts (if used)
-   Purpose: quickly catch styling regressions.

## Non-goals

-   Not a publicly documented feature.
-   Not a replacement for automated tests.
-   Not a permanent admin panel.

## Acceptance criteria

-   Visiting `/test`:
    -   is blocked in production for non-admins (or blocked entirely in production) `@@@`.
    -   loads without console errors.
    -   shows a clear “Test/Diagnostics” banner.
-   Each section has:
    -   a short description of what it tests.
    -   a “Run” button (where applicable).
    -   a visible result area.
-   All actions are safe by default:
    -   read-only where possible
    -   explicit confirmation for anything that can call external services
    -   no secrets displayed in responses (redact known keys like `Authorization`, `apiKey`, `token`) `@@@`.
-   Code is DRY:
    -   shared “TestCard” component `@@@`
    -   shared “fetch+timer+pretty print” helper `@@@`

## Technical notes

-   Implement as a Next.js route/page (matching current Agents Server routing) `@@@`.
-   Prefer server-side authorization guard to avoid flashing protected content.
-   Add minimal unit tests or a smoke test if there is an existing pattern `@@@`.

## Open questions

-   What is the preferred way to restrict access in production (admin role vs env-based) `@@@`?
-   Which existing endpoints/tools should be included by default on the page `@@@`?

---

[-]

[✨🔟] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🔟] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🔟] brr

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
