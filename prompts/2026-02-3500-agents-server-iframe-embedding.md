[x] ~$0.1261 10 minutes by OpenAI Codex `gpt-5.1-codex-mini` - _mixed the preview page and the embedded chat page _

---

[x] ~$0.2567 19 minutes by OpenAI Codex `gpt-5.1-codex-mini`

[✨✂️] Ensure that embedding of agents in iframes is propperly allowed or disallowed based on a new `IS_EMBEDDING_ALLOWED` metadata item.

-   Add a new metadata item `IS_EMBEDDING_ALLOWED` for agents server, which can be set to `true` or `false`. By default, it should be `true`
-   When `IS_EMBEDDING_ALLOWED` is `true`, allow embedding the agent in iframes by setting appropriate headers. When `IS_EMBEDDING_ALLOWED` is `false`, disallow embedding the agent in iframes by setting appropriate headers.
-   When allowed, add embedding sample into the agent integrations page, showing how to embed an agent in an iframe - code and sample
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Be aware that there are two different pages:
    -   The page with the actual agent, which can be used directly in the iframe, for example: https://pavol-hejny.ptbk.io/agents/ePmB3dQ4WQc6up/iframe _(needs to be created and used for both iframe embedding and Website Integration)_
    -   The preview page, which shows a preview of the agent as js integration widget, for example: https://pavol-hejny.ptbk.io/embed?agentUrl=https%3A%2F%2Fpavol-hejny.ptbk.io%2Fagents%2FePmB3dQ4WQc6up&meta=%7B%0A%20%20%20%20%22fullname%22%3A%20%22Elijah%20Brown%22%0A%7D
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨✂️] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨✂️] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨✂️] baz

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

