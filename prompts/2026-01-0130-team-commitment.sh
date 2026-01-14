codex \
  --ask-for-approval never \
  exec --model gpt-5.2-codex \
  --sandbox danger-full-access \
  -C ~/work/ai/promptbook \
  <<'EOF'

To be able to specify the teammates of the agent.

**For example:**

```book
John Doe

PERSONA An expert software developer
TEAM https://agents.ptbk.ik/agents/joe-green
```

**For example:**

```book
John Doe

PERSONA An expert software developer
TEAM You can talk with http://localhost:4440/agents/GMw67JN8TXxN7y to discuss the legal aspects.
```

In this case, the agent can communicate with the agent `http://localhost:4440/agents/GMw67JN8TXxN7y` and "You can talk with http://localhost:4440/agents/GMw67JN8TXxN7y to discuss the legal aspects." are extra instructions for the current agent about when to use this teammate.

**For example:**

```book
John Doe

PERSONA An expert software developer
TEAM You can talk with http://localhost:4440/agents/GMw67JN8TXxN7y to discuss the legal aspects, the http://localhost:4440/agents/ABcD1234xyZ to discuss the technical aspects, and https://agents.ptbk.ik/agents/joe-green for project management.
```

-   Teammates are another agent that can help the current agent with fulfilling its tasks.
-   Technically it should be implemented similarly to tool calling. Look at `USE TIME` and `USE SEARCH ENGINE` how tool calling is implemented now.
-   For each teammate, there should be some short description of this teammate in the system message, and also edit one unique tool to be able to interact with.
-   When the interaction happens, show a similar chiplet to to `USE TIME` or `USE SEARCH ENGINE`
    -   The chiplet will show the agent which the intern discussion happens. When clicked on this chiplet, there should be a pop up with actual conversation between the current agent and the `TEAM` agent shown in a static <MockedChat/>
-   Add capability chip with the link to the agents which are teammates. Look for example how ships with inheritance (`FROM`) or `IMPORT` is done on the agent profile on the agents server.
    -   Also look at the [graph on the home page](http://localhost:4440/?view=graph) of the agents server, it should show the teammates as connected agents.
-   You are implementing commitment `TEAM` into Promptbook Engine but be aware that this commitment should work in Agent Server application.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

**Context:**

-   **Promptbook Engine vs. Agent Server** sre two distinct parts you should know the difference:
    -   **Promptbook Engine** is the core engine that powers AI agents, it is located in `./src` folder. It is framework-agnostic and can be used in different applications. It can run as standalone javascript/typescript library, CLI environment, or be integrated into different applications. It can be also runned in Agent Server:
    -   **Agent Server** is a specific application that uses the Promptbook Engine to provide a web and API interface for creating and interacting with AI agents. It is located in `./apps/agents-server` folder.
-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
    -   Commitments are in the folder `./src/commitments`
    -   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.


EOF
