[-]

[🔐] Fix OAuth state secret falling back to `ADMIN_PASSWORD` in Agents Server

-   The GitHub App OAuth flow and the Google Calendar OAuth flow both use `ADMIN_PASSWORD` as a fallback when their dedicated state secrets are not configured. This means: (1) if `ADMIN_PASSWORD` is ever exposed or guessed, an attacker can forge OAuth state parameters and mount CSRF attacks against the OAuth callbacks, and (2) brute-forcing or leaking the OAuth state secret indirectly reveals the admin password. Secrets that serve distinct security purposes must be kept separate so that compromising one does not compromise the other.
-   The fix is to require dedicated environment variables for each OAuth state secret (`GITHUB_APP_STATE_SECRET` and `GOOGLE_CALENDAR_STATE_SECRET`) and remove the `|| process.env.ADMIN_PASSWORD` fallback. If the dedicated variable is not set, the application should disable the corresponding OAuth integration with a clear configuration error, rather than silently reusing the admin credential.
-   The vulnerability is found in two places:
    -   [`apps/agents-server/src/utils/githubApp/GithubAppConfiguration.ts`](apps/agents-server/src/utils/githubApp/GithubAppConfiguration.ts) line 56:
        ```typescript
        fallback: process.env.GITHUB_APP_STATE_SECRET || process.env.ADMIN_PASSWORD,
        ```
    -   [`apps/agents-server/src/utils/googleCalendarOAuth/GoogleCalendarOAuthConfiguration.ts`](apps/agents-server/src/utils/googleCalendarOAuth/GoogleCalendarOAuthConfiguration.ts) line 52:
        ```typescript
        fallback: process.env.GOOGLE_CALENDAR_STATE_SECRET || process.env.ADMIN_PASSWORD,
        ```
-   Do a proper analysis of the current functionality before you start implementing — understand how `GithubAppConfiguration` and `GoogleCalendarOAuthConfiguration` are used and what happens when they return `null` (i.e., when the integration is not configured).
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
