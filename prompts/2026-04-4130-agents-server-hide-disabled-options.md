[ ]

[🧩🎛️] Hide disabled server options from control panel

-   *(@@@@ Written by agent)*
-   When an option is disabled by server metadata (e.g., notifications are disabled in metadata), the option must not be displayed in the Agents Server control panel for that server.
-   The control panel must show only options relevant to the currently selected server (i.e., options whose availability is true for that server).
-   Use a single source of truth for option availability derived from server metadata, and apply it consistently across all control-panel option groups.
-   Ensure the UI behavior is deterministic:
    -   If a flag is missing from metadata, use @@@ as the default behavior (assumption TBD).
    -   If a metadata value is malformed/unrecognized, hide the option and optionally log a warning (TBD).
-   UX requirements:
    -   If an entire option group has no available options for the server, hide the group container.
    -   Do not show disabled toggles as “greyed out”. They should be removed from the UI entirely.
-   Entry point in the project:
    -   You are working with the [Agents Server control panel UI](apps/agents-server/src/app/admin) and any components that render server-configurable toggles from metadata.
-   Implementation requirements (high level):
    -   Introduce/extend a metadata→availability mapping layer (likely around existing metadata flag handling like `MetadataFlagsContext`).
    -   Filter the option definitions based on the current server’s metadata before rendering.
    -   Keep filtering logic pure and testable.
-   Testing requirements:
    -   Add unit tests for the filtering function(s):
        -   given metadata disables notifications → notification options removed
        -   group container hidden when empty
    -   Add at least one integration/e2e test case for the control panel rendering on a server with disabled metadata (details TBD).
-   Changelog:
    -   Add a short note to `changelog/_current-preversion.md`.

This commit is blocked by missing details (to confirm):
-   Which exact server metadata keys correspond to the notification option(s)? (TBD)
-   What is the desired default behavior when metadata key is missing? (TBD)
-   Which exact UI component(s) currently build the control panel option list? (TBD)

Related existing code reference (for developer orientation):
-   `apps/agents-server/src/components/MetadataFlags/MetadataFlagsContext.tsx` exposes metadata-driven flags, but only includes `isExperimentalPwaAppEnabled` at the moment.
