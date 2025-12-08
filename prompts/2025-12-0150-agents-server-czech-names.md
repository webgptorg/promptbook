[ ]

[✨🦍] Use Czech names for new agents

-   When creating new agent, Agent server randomly creates english name for new agent
-   Now are theese names in English
-   It should be possible to use Czech names instead
-   The name pool language should be configurable via server Metadata item
-   The name pools should work as extendable plugins, its should be easey to add new name pools for other languages in the future
-   For now implement only theese two name pools:
    -   English (default, current behavior, but make it better structured with more names and add their frequency weights)
    -   Czech
-   For list of the Czech names look at `/src/utils/random/data`
-   Concat first and last name dynamically
-   For some languages, be aware of same gender of first and last name
-   Work with the name frequencies to get natural distribution of names, e.g. more common names should appear more often
-   Default names of agents are done here `/src/utils/random/$generateBookBoilerplate.ts`
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🦍] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🦍] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🦍] foo

-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
