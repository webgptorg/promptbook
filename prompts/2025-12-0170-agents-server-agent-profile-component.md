[x]

[✨🧁] Create components `AgentProfile` and `AgentProfileFromSource`

-   `AgentProfile` shows agent's profile
-   Agent profile look like profile on Agents Server `/agents/[agentName]` page
-   Use `/agents/[agentName]` in `Agents Server` application `/apps/agents-server` to keep DRY principle
-   `AgentProfileFromSource` is internally using `AgentProfile` and takes `agentSource: string_book` prop
-   Take inspiration from `AvatarChip` and `AvatarChipFromSource`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🧁] Fix Agent profile page

There is a Next error in `/agents/[agentName]` when rendering `AgentProfile` component:

```log
<anonymous>:1 Uncaught Error: Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server". Or maybe you meant to call this function rather than return it.
  <... agent={{...}} agentUrl=... agentEmail=... renderMenu={function renderMenu} actions=... children=...>
```

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🧁] baz

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🧁] baz

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
