[x]

[✨🎞] Whan the agent call a tool, show it in the interface of <Chat/>

-   For example, when the agent calls a search tool, show the spinner or loading indicator with a tool name "Searching..." or similar.
-   This is part of the UI and UX of `isComplete=false` messages in the `<Chat/>` component
-   It should work universally for all tools called by the agent. There is nothing specific with search engine here, it's just an example.
-   You are working with the `Agents Server` application `/apps/agents-server` but it should work generally for all applications using llm execution with tools.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[ ]

[✨🎞] Do human-readable titles for showing tool calls.

-   When the tool is called, it correctly shows in the UI the name of the current function, for example "get_current_time" or "web_search".
-   The definition of the commitment should contain some translation between the technical name of the function and user-readable thing.
-   Show the thing in a some good looking chiplet.
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🎞] qux

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🎞] qux

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
