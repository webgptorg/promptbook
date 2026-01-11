[x]

[✨🛁] When calling external tools, do not cache the messages.

-   Write the messages into the cache or `USER MESSAGE` + `AGENT MESSAGE` pair, but do not use it when the agent is doing the same call.
-   For example, It doesn't make sense to cache the message 'What time is it? 3:30 pm' because when the question is asked another time, it can be a different time.
-   But it does make sense to put it into the cache or into the `USER MESSAGE` + `AGENT MESSAGE` sampling pairs because the response can be a good example for the AI agent, but not a one-to-one answer to be reused.
-   1. Look at ./src/llm-providers/agent/playground/playground.ts
-   2. Look at `USER MESSAGE` + `AGENT MESSAGE` pairs
-   It should work for example with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🛁] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🛁] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🛁] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
