claude --allowedTools "Bash,Read,Edit,Write" --output-format json --print <<'CLAUDE_PROMPT'

Enhance the chip UI and UX when an agent is consulting another agent.

-   When the interaction between agents is ongoing, there is shown something like this: "🤝 Consulting teammate..." When the interaction is finished, there is shown "[🤝 TEoiVpZzBgTPUi]"
-   This is not very user friendly - Show instead "🧔 AI Developer", instead of 🧔 The actual picture of the agent and "AI Developer" is agent name
-   Do not show the agent ID, show the agent name. This should work both with the agents on the same server and also with the agents on the federated server.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle, There should be just one component of the agent chip which should be reused, take Inspiration from [AgentProfile](apps/agents-server/src/components/AgentProfile/AgentProfile.tsx) component.
-   Add the changes into the `/changelog/_current-preversion.md`

![alt text](prompts/screenshots/2026-01-0130-team-commitment-3.png)
![alt text](prompts/screenshots/2026-01-0130-team-commitment.png)


**Additional context:**

- Attached images (if any) are relative to the root of the project.
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



CLAUDE_PROMPT