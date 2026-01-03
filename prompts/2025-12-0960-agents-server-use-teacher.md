[x]

[✨📞] Use Teacher Agent for self-learning of the agents.

-   Now there is hard-coded one prompt to do the self-learning. Instead, use the Teacher Agent to do the self-learning.
-   Pass the current agent source book and the current interaction into the teacher agent, and let the teacher agent decide what the agent should learn.
-   Self-learning is happening by appending new commitments at the end of the agent source. Do not modify the current agent source, just append new things.
-   Preserve the sampling: the sampling means that after every interaction, there is a pending user message and agent message at the end of the agent source.
-   After the sampling, the interaction should be sent to the teacher agent. The teacher agent can append extra commitments and extra things at the end.
-   Make this process two-step.
    1. Do the append of the samples
    2. Asynchronously call the teacher agent and invoke the silver link. When the teacher fails, keep just the samples
-   Use `RemoteAgent` [Teacher Agent](https://core-test.ptbk.io/agents/teacher/)
-   Add Teacher Agent into `CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES`
-   There are two special agents, the "Adam" agent and "Teacher" agent. These agents are used internally in the innerworking of the Promptbook.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

**Context:**

-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
    -   Commitments are in the folder `/src/commitments`
    -   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

---

[-]

[✨📞] baz

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨📞] baz

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨📞] baz

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
