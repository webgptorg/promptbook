[x] ~$1.50 by OpenAI Codex `gpt-5.2-codex`

[✨📋] Show the tool calls of the teammates

-   When the agent is discussing with another member of the `TEAM` And this member of the team uses some tool for example web search or knowledge, The original agent does not show this in the response.
-   Make tool calling transitive. Transfer the information onto the topmost agent and show there a chip with the information that this chip was invoked by the team colleague.
-   For example, if Agent uses a web serach `USE SEARCH ENGINE` by itself and also calls an "AI Accountant" team member which also uses `USE SEARCH ENGINE` and have some source documents, then the topmost agent (which replys to the user) should show 3 chips:
    -   One chip for its own `USE SEARCH ENGINE` call
    -   Second chip for the `USE SEARCH ENGINE` call with a suffix "by AI Accountant" _(this suffix indicates that this tool call was made by the team member)_
    -   Third chip for the source documents used by "AI Accountant" with a suffix "by AI Accountant"
    -   All of the chips can be clicked to see more details about the tool call and results (simmilar to normal tool calls)
-   This should be transitive for multiple levels of team calls.
    -   For example, if Agent A calls Agent B which calls Agent C which uses some tool, then the topmost Agent A should show the tool call with a suffix "by Agent C"
-   All of the tool calls should be shown also in a popup with details when clicking on the teammate chip which is showing the conversation with the team member in a `MockedChat`.
-   Keep in mind the DRY _(don't repeat yourself)_ principle and other best practices.
-   This is a very hard change. Do a detailed analysis before you start to implement.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![alt text](prompts/screenshots/2026-01-0720-agents-server-team-agent-tool-calling.png)
![alt text](prompts/screenshots/2026-01-0720-agents-server-team-agent-tool-calling-1.png)

---

[-]

[✨📋] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📋] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📋] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

