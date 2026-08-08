[ ] !!!!

[✨🚝] Make the `TEAM` commitment work.

-   You can specify and reference the teammates of the agent.
-   The primary agent should be able to consult the teammates.
-   Do not run the underlying coding harness multiple times, run it only once, but in the instructions there should be information about the team behavior and the teammates.
    - If the harness does the team chat, it will create more chat thread files, and these files should be then parsed by the agent server. The team chats should be parsed and taken from that. 
-   When the agent is consulting the teammates under the message, there should be shown a chip, and when you click on that chip, you should see the chat between the agent and his teammate.
    -   The chip should use the mocked chat component.
-   These teammate chats should be also available in the chats of that team mate when you click on the external chats.
    -   This chat is frozen in the same way as a chat with a different user or API chat. It is not editable and it is just a history of the chat between the agent and his teammate. Link the primary agent which invoked the chat.
-   Add some Example agent that uses teammates into `agents/default`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
