[ ] !

[✨🥔] Create a manager which will show and manage all the timeouts and planned messages.

-   Allow deleting and modifying all the timeouts for all the agents.
-   Also, allow navigating directly to the particular agent which created this timeout.
-   Also add filters where you can filter by the Parameters of the timeouts, like frequency, last run, the agent, etc.
-   Show also:
    -   the future planned messages
    -   the messages which are planned but are starting in the future
    -   the ongoing messages
    -   planned messages which were canceled or have ended because of the ending time, or have had the maximum amount of time applied
-   Put this manager in the same tab group as a task manager.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![alt text](screenshots/2026-08-0440-agents-server-timeout-manager.png)
![alt text](screenshots/2026-08-0440-agents-server-timeout-manager-1.png)
