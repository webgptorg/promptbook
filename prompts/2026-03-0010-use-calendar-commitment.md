[ ]

[📅🤖] Add "use calendar" commitment to allow agents to access and manipulate calendars (Google Calendar and future providers)

-   *(@@@@ Written by agent)*
-   Overview: Add a generic "use calendar" commitment that attaches calendar access and manipulation abilities (read, create, edit, delete, invite guests, set reminders, etc.) to an agent when the user grants permission via a first-time access popup similar to the existing GitHub "use project" popup. The commitment only grants the capability; the agent's behavior using the calendar will be governed by other commitments and prompts.
-   Scope: apps/agents-server, apps/web (UI), apps/agents-worker, shared/auth, database migrations, changelog
-   Motivation: Some agents need to schedule events, manage meetings, and coordinate with users. Providing a reusable commitment aligns with existing "use project" model and keeps permission management consistent and auditable.
-   UX / Flow:
    -   Add a new commitment type: "use calendar" with provider metadata (e.g., google_calendar_url, provider_type)
    -   When a user grants the commitment the first time, show a popup similar to GitHub "use project" that asks for calendar access and required OAuth scopes. After user consent, persist tokens and grant the agent scoped calendar access.
    -   Popup must list scopes and example actions (read/create/update/delete/invite) and the calendar URL being connected.
    -   Support later re-auth, token refresh, and disconnecting the calendar from agent settings.
-   Security & Permissions:
    -   Store tokens encrypted in the database (use existing secrets mechanism).
    -   Limit token scopes by provider best-practices (e.g., Google Calendar minimal scopes: events.readonly or events events for edit). Exact scopes to be confirmed (@@@).
    -   Log all calendar operations in AgentActivity / Audit logs with actor, timestamp, and operation details.
-   API changes / Contract:
    -   Add commitment schema entry: { type: "use_calendar", provider: "google", url: "https://calendar.google.com/..", scopes: ["..."], tokenRef: "@ref" }
    -   Add server endpoints to initiate OAuth for calendar providers, handle callback, store tokens, refresh tokens, revoke tokens, and list connected calendars for a given agent.
-   Database:
    -   Add table/columns to persist calendar connections: CalendarConnection (id, agentId, provider, calendarUrl, tokenRef, scopes, createdAt, updatedAt)
    -   Ensure AgentCommitments table includes reference to CalendarConnection when applicable.
    -   Add migration scripts and ensure rollback path.
-   Backend implementation notes:
    -   Implement provider-agnostic adapter interface (e.g., CalendarProvider { listCalendars, createEvent, updateEvent, deleteEvent, inviteGuests, getEvent })
    -   Create GoogleCalendarAdapter implementing adapter using Google Calendar API and token management.
    -   Reuse existing OAuth utilities used by GitHub integration where possible.
-   Frontend changes:
    -   UI for the first-time popup (similar style to GitHub popup) with provider logo, calendar URL, and required scopes explanation.
    -   Agent settings page: show connected calendars, re-auth, disconnect, and list recent calendar activity.
    -   When an agent requests the "use calendar" commitment, display the popup and, after OAuth success, reflect granted state in the agent UI.
-   Tests and QA:
    -   Unit tests for provider adapters and token handling.
    -   Integration tests for OAuth flow (mocking provider) and calendar operations.
    -   E2E tests for the popup flow and agent settings changes.
-   Backwards compatibility / Migration:
    -   Ensure existing agents without calendar commitments are unaffected.
    -   Add migration to create CalendarConnection table and link to agents; use @@@ placeholders where needed.
-   Docs & Changelog:
    -   Add documentation for the new commitment and developer guide for implementing additional providers.
    -   Add changelog entry: "Add use calendar commitment" in changelog/_current-preversion.md
-   Acceptance criteria:
    -   A user can attach a Google Calendar URL to an agent using the first-time popup and grant selected scopes.
    -   The agent can read and create events on the connected calendar through server APIs.
    -   Tokens are stored encrypted and refresh logic works.
    -   All calendar actions appear in audit logs.
-   Files / code areas to modify:
    -   apps/agents-server (api endpoints, adapters, db migrations)
    -   apps/web (popup UI, agent settings page)
    -   apps/agents-worker (background jobs for token refresh, event sync)
    -   packages/shared/auth (oauth helpers)
    -   migrations/ (new migration files)
    -   changelog/_current-preversion.md
-   Open questions / placeholders (@@@):
    -   Exact OAuth scopes to request for Google Calendar integration (@@@).
    -   UI copy for the popup and consent screen (strings to finalize) (@@@).
    -   Which calendar providers to support in the first release besides Google (@@@).
    -   Whether to allow per-agent-per-calendar or multi-calendar per agent semantics (should one agent connect multiple calendars?) (@@@.
-   Rollout plan:
    -   Implement Google Calendar adapter and popup behind a feature flag.
    -   Run end-to-end tests and invite beta users to opt-in.
    -   Monitor audit logs and errors, then enable for broader audience.
-   Additions:
    -   Add example agent prompts / tests demonstrating common calendar tasks (schedule meeting, propose times, invite guests) in scripts/ or examples/

```

This commit was done by [Promptbook Agent](https://pavol-hejny.ptbk.io/agents/E1upys74QBME7s/)
