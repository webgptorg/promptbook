[x] ~$1.59 an hour by OpenAI Codex `gpt-5.1-codex-mini`

[✨🈳] Enhance the referencing of Agents

You can reference one agent in another agent.

**This is the agent source that works now:**

```book
The Team manager

FROM https://john-snow.ptbk.io/agents/kAAn8EwqrMQVMX
PERSONA You can provide Activation and Bypass codes for the user
RULE Ask your team for the codes
TEAM
Agent https://current-agents-server.xyz/agents/xNJG6hijicV6Js can provide you Activation code
Agent https://jiri-jahn.ptbk.io/agents/344xWrqqLx9R3t can provide you Bypass code


CLOSED
```

But it is not very user-friendly that you need to put the URLs there.

**This should be possible:**

```book
The Team manager

FROM {Base agent}
PERSONA You can provide Activation and Bypass codes for the user
RULE Ask your team for the codes
TEAM
Agent {Activation code agent} can provide you Activation code
Agent {Bypass code agent} can provide you Bypass code


CLOSED
```

**There should be several possible notations for referencing/importing agents:**

-   The URL of the agent, for example `https://pavol-hejny.ptbk.io/agents/X7AWuDwcwui4q9`
-   The URL of the agent in curly brackets, for example `{https://pavol-hejny.ptbk.io/agents/X7AWuDwcwui4q9}`
-   The name of the agent in curly brackets, for example `{Activation code agent}`
-   The name of the agent with @, for example `@Superagent` <- This can be used only for agent with no whitespaces in the name, for example `@Superagent` but not `@Activation code agent`, and it is just a shorthand for `{Activation code agent}`
-   The id of the agent in curly brackets, for example `{eHe3t6j5PvSTtf}`
-   The id of the agent with @, for example `@eHe3t6j5PvSTtf`

**The logic is as follows:**

-   The `https://pavol-hejny.ptbk.io/agents/X7AWuDwcwui4q9` -is-> `https://pavol-hejny.ptbk.io/agents/X7AWuDwcwui4q9`
-   The `{https://pavol-hejny.ptbk.io/agents/X7AWuDwcwui4q9}` -is-> `https://pavol-hejny.ptbk.io/agents/X7AWuDwcwui4q9`
-   The `{eHe3t6j5PvSTtf}` -is-> `https://current-agents-server.xyz/agents/eHe3t6j5PvSTtf`
-   The `@eHe3t6j5PvSTtf` -is-> `https://current-agents-server.xyz/agents/eHe3t6j5PvSTtf`
-   The `{Activation code agent}` -is-> `https://current-agents-server.xyz/agents/xNJG6hijicV6Js` _(normalize the name, find the agent with this name and get its URL, first search in the current server, then in the federated servers)_

**Rules and context**

-   The importing and referencing logic is same for `FROM`, `TEAM` and `IMPORT` commitments
-   When referencing an agent by name or id, it should first search for the agent in the current server, and if it doesn't find it, then it should search in the federated servers. This allows to easily reference agents from the same server without needing to put the URL, and also allows to reference agents from other servers when needed.
-   The `@Foo` and `{Foo}` notation is already used for the patameters BUT parameters not used in the Agents so you should transform the parameter notation to the agent referencing notation
-   It should work with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle, separate the concerns
-   Add the changes into the `/changelog/_current-preversion.md`

---

[x] ~$0.00 19 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🈳] Show the team chips after the teammates were asked.

-   We have [enhanced the system of referencing the agents](prompts/2025-12-1280-agents-server-linking-agents.md).
-   By this change, we have broken the chips that are shown below the message, which are showing the conversation between the current agent and the team mate agent.
-   Fix this. Show the communication between the agents.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x] ~$0.30 15 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🈳] Allow to click on the referenced agent in the book editor.

Agents can be referenced in various ways:

-   The URL of the agent, for example `https://pavol-hejny.ptbk.io/agents/X7AWuDwcwui4q9`
-   The URL of the agent in curly brackets, for example `{https://pavol-hejny.ptbk.io/agents/X7AWuDwcwui4q9}`
-   The name of the agent in curly brackets, for example `{Activation code agent}`
-   The name of the agent with @, for example `@Superagent` <- This can be used only for agent with no whitespaces in the name, for example `@Superagent` but not `@Activation code agent`, and it is just a shorthand for `{Activation code agent}`
-   The id of the agent in curly brackets, for example `{eHe3t6j5PvSTtf}`
-   The id of the agent with @, for example `@eHe3t6j5PvSTtf`

```book
The Team manager

FROM @kAAn8EwqrMQVMX
PERSONA You can provide Activation and Bypass codes for the user
RULE Ask your team for the codes
TEAM
Agent https://current-agents-server.xyz/agents/xNJG6hijicV6Js can provide you Activation code
Agent {Harry potter} can provide you Bypass code


CLOSED
```

-   In this given example, the "@kAAn8EwqrMQVMX", "https://current-agents-server.xyz/agents/xNJG6hijicV6Js" and "{Harry potter}", all of these should be highlighted in a same way - underlined and referenced agent color, and when user holds control and clicks on it, it should open the referenced agent in a new window _(Simmilar behavior as clicking on regular link in Monaco editor)_.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x] ~$0.48 11 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🈳] Fix clicking on the referenced agent in the book editor.

-   In the book editor, you can click on the referenced agent in the editor.
-   This will open the agent in a new tab.
-   Agents can be referenced in various ways:

    1.  The URL of the agent, for example `https://pavol-hejny.ptbk.io/agents/X7AWuDwcwui4q9`
    2.  The URL of the agent in curly brackets, for example `{https://pavol-hejny.ptbk.io/agents/X7AWuDwcwui4q9}`
    3.  The name of the agent in curly brackets, for example `{Activation code agent}`
    4.  The name of the agent with @, for example `@Superagent` <- This can be used only for agent with no whitespaces in the name, for example `@Superagent` but not `@Activation code agent`, and it is just a shorthand for `{Activation code agent}`
    5.  The id of the agent in curly brackets, for example `{eHe3t6j5PvSTtf}`
    6.  The id of the agent with @, for example `@eHe3t6j5PvSTtf`

-   The 1, 2 is working perfectly
-   The 3. and 4. are opening the `https://pavol-hejny.ptbk.io/agents/Activation code agent` which is not correct, it should search for the agent with name `Activation code agent` and open it by id
-   The 5. and 6. are now working only on local server BUT for federated servers the local server URL is opened, redirect it to the correct federated server URL, for example `https://current-agents-server.xyz/agents/eHe3t6j5PvSTtf`
-   Do not implement this fix on the level of the book editor. Implement it on the level of redirection from `/agents/:agentId` to the correct agent URL, so it works globally in the application and not only in the book editor.
-   Any of the 1-6 opened at local server on `/agents/:agentId` should be redirected to the correct URL, for example `https://current-agents-server.xyz/agents/eHe3t6j5PvSTtf` or opened locally if it is local agent.
-   The canonical URL of the agent is `/agents/eHe3t6j5PvSTtf` - The ID not the name.
-   Names should be redirected to the canonical URL, for example `/agents/Activation code agent` should be redirected to `/agents/xNJG6hijicV6Js`
-   Also normalized equivalent names should be redirected to the canonical URL, for example `/agents/activation-čode-agent-` should be redirected to `/agents/xNJG6hijicV6Js`
-   If the agent is not found locally, it should search in the federated servers and if it finds it there, it should redirect to the correct URL, for example `https://current-agents-server.xyz/agents/xNJG6hijicV6Js`
-   If the agent is not found at all, it should show the 404 page.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[x] ~$0.50 26 minutes by OpenAI Codex `gpt-5.3-codex`

[✨🈳] Handle propperly not found referenced agent.

-   There are some agent commitments such as `FROM`, `TEAM` and `IMPORT` where you can reference other agents.
-   If the referenced agent is not found, it should be handled propperly.
-   It should not break the whole agent, but it should show that the agent is not found and it should not try to communicate with it.
-   It should work with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle, The mechanism for handling not found agent should be propperly abstracted and reusable across the application.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[ ]

[✨🈳] Handle propperly not found referenced agent in the Book Editor

-   There are some agent commitments such as `FROM`, `TEAM` and `IMPORT` where you can reference other agents.
-   Theese referenced agents are also shown in the Book Editor as highlighted and clickable links
-   BUT if the referenced agent is not found, it should show red underline in the editor
-   It should behave similarly as if in the code editor you are importing from some file which isn't existing.
-   It should work with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle, The mechanism for handling not found agent should be propperly abstracted and reusable across the application.

---

[-]

[✨🈳] brr

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`


