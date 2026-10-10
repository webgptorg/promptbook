[x] ~$0.00 23 minutes by GitHub Copilot `gpt-5.4`

[🧩🎛️] Hide disabled server options from control panel

-   When an option is disabled by server metadata (e.g., notifications are disabled in metadata), the option must not be displayed in the Agents Server control panel for that server.
-   The control panel must show only options relevant to the currently selected server (i.e., options whose availability is true for that server).
-   Use a single source of truth for option availability derived from server metadata, and apply it consistently across all control-panel option groups.
-   UX requirements:
    -   If an entire option group has no available options for the server, hide the group container.
    -   Do not show disabled toggles as “greyed out”. They should be removed from the UI entirely.
-   You are working with the [Agents Server](apps/agents-server)

