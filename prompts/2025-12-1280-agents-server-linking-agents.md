[ ]

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

[-]

[✨🈳] brr

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🈳] brr

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🈳] brr

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
