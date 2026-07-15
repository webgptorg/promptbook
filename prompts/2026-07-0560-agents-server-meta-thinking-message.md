[ ]

[✨📟] Add commitment `META THINKING MESSAGE`

-   When this commitment is present, it should be used as this thinking message or multiple messages. 
- When defining multiple messages, multiple commitments are used. 
- Between these messages is randomly cycled during the agent's thinking. 
- When no `META THINKING MESSAGE` is present, the server thinking messages from metadata is used. 
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)


```book
My Agent

META THINKING MESSAGE Thinking...
META THINKING MESSAGE Processing...
META THINKING MESSAGE Halucinating...
META THINKING MESSAGE 

Doing
Exxxxxxtra **HARD** work

```