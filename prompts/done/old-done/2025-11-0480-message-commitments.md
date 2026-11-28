[x]

[✨🐝] Create commitments `USER MESSAGE` and `AGENT MESSAGE`

-   Look how `INITIAL MESSAGE` commitment is implemented
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[x]

[✨🐝] When Agent is replying, look at its `USER MESSAGE` and `AGENT MESSAGE` message samples and use them if the user asks the same thing

-   Create `AgentModelRequirements.samples` with type `Array<{question: string, answer: string}>`
-   Normalize the message text to compare, create function `normalizeMessageText` which for now internally uses only the `spaceTrim`
    -   Write a unit test for it, look how other normalization functions are tested and implemented
-   Agent is implemented in `/src/llm-providers/agent/Agent.ts` file
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🐝] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🐝] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
