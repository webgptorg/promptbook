[ ]

[✨🥥] Remove commitments `COMPONENT`, `WALLET`, `MEMORY`, `USE BROWSER`, `USE DEEPSEARCH`, `USE SEARCH ENGINE`, `USE SPAWN`, `USE TIMEOUT`, `USE TIME`, `USE EMAIL` and `META`

-   `COMPONENT` functionality is not the property of the agent, it is the property of the agent server or whatever UI is running the agent
-   `WALLET` functionality is functionality of the agent server for all the agents, no need to specify it in agent source
-   `MEMORY` functionality is functionality of the agent server for all the agents and users, no need to specify it in agent source
-   `USE BROWSER` every agent can use the browser, no need to specify it in agent source
-   `USE DEEPSEARCH` every agent can use the deepsearch, no need to specify it in agent source
-   `USE SEARCH ENGINE` every agent can use the search engine, no need to specify it in agent source
-   `USE SPAWN` not used
-   `USE TIMEOUT` every agent can set up its own timeouts, no need to specify it in agent source
-   `USE TIME` every agent should know the current time and date, no need to specify it in agent source
-   `USE EMAIL` every agent has its own email and can send emails, no need to specify it in agent source
-   `META` is not standalone commitment, there are commitments like `META AVATAR`, `META FONT`,... which should stay intact but the `META` commitment itself has no purpose
-   Remove the `COMMITMENTS` from entire system, documentation, codebase...
-   Do not keep backwards compatibility.
-   Do a proper analysis of the current functionality before you start removing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)
