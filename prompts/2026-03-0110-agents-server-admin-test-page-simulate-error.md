[ ]

[✨🌈] Admin test page for simulating errors on Agents Server

-   We need an internal/testing-only page available in the Agents Server administration UI that allows developers/admins to intentionally trigger (simulate) different kinds of failures.
-   The goal is to be able to quickly verify:
    -   error UI states (toast / inline error / error boundary)
    -   server-side error handling and logging
    -   client-side handling of failed fetches
    -   monitoring/alerting pipeline in staging/production-like environments
-   The page must be located in the [Agents Server](apps/agents-server) admin area (route under `/admin/...`) and must not be publicly accessible.

## Scope

### 1) New admin page

-   Add a new admin page (name: **Testing / Error simulator**; final route: `@@@`, suggested `/admin/test` or `/admin/testing`)
-   Link it from the admin navigation/menu (location: `@@@`)

### 2) Error simulation actions

Provide simple UI controls (buttons/forms) to trigger at least these scenarios:

-   **Server 500**
    -   Call a dedicated API route that throws an exception and returns HTTP 500.
-   **Server error with custom message / code**
    -   Call an API route that returns a structured error payload (e.g. `{ code, message, requestId }`).
-   **Slow request / timeout**
    -   Call an API route that intentionally delays response by N ms (N configurable) so we can test spinners, cancellation, and timeouts.
-   **Client-side crash**
    -   Button that throws in React render/effect handler to test error boundaries.

Notes:

-   The exact list may be extended, but keep it small and practical.
-   Each action must clearly show what happened:
    -   status code
    -   response body (if any)
    -   correlation/request id if available

### 3) API routes (admin-only)

-   Implement corresponding API route(s) under `/api/admin/...` (exact paths `@@@`).
-   Protect the routes with the same admin authorization as the rest of admin.
-   Make sure these routes are disabled/blocked in non-admin contexts.

### 4) Safety & access

-   Restrict the page and the API routes to admin users only.
-   Add clear warning copy at the top of the page: this is for testing; may create errors in logs.
-   Ensure the feature cannot be reached by normal users (including anonymous).

## UX / UI requirements

-   Keep UI minimal:
    -   a list of “scenarios”
    -   button to run scenario
    -   a result panel showing latest outcome
-   Provide “Copy result” button (copies status code + payload + timestamp).

## Acceptance criteria

-   Admin can open the new page in administration and run all scenarios.
-   Running **Server 500** produces a real HTTP 500 that is visible in the UI result panel.
-   Running **Slow request** delays response by the selected amount and the UI indicates loading state.
-   Running **Client-side crash** triggers the app’s error boundary (or expected crash handling) in a predictable way.
-   Non-admin users cannot access the page nor call the API routes.

## Implementation notes

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current admin routing/auth approach before implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it _(not expected for this task)_
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌈] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌈] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🌈] bar

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)