[x]

[✨🤸] Implement `USE BROWSER` commitment

```book
Paul Smith & Associés

PERSONA You are a company lawyer.
Your job is to provide legal advice and support to the company and its employees.
You are knowledgeable, professional, and detail-oriented.
USE BROWSER
```

-   `USE BROWSER` indicates that the agent should utilize a web browser tool to access and retrieve up-to-date information from the internet when necessary.
-   The contents of this commitment _(what follows after "USE BROWSER", like "USE BROWSER contents foo bar ...")_ has no effect and is ignored _(simmilar to `NOTE`)_
-   This is the first commitment in family of commitments `USE`, there will be more in future, e.g., `USE SEARCH ENGINE`, `USE FILE SYSTEM`, `USE MCP`, etc. _(Its simmilar principle to `META IMAGE`, `META LINK`, `META COLOR`,... commitment family, look how they are handled)_
-   For the commitment `USE BROWSER` create its folder in `/src/commitments` and register it in the `/src/commitments/index.ts`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   To implement the actual browser use You are working with the `Agents Server` application `/apps/agents-server`
-   Add the changes into the `/changelog/_current-preversion.md`

---

[ ] _<- TODO: Not working, prompt need to be improved_

[✨🤸] Implement the browser usage for agents on agents server

-   There is already commitment `USE BROWSER` in the agent server

```book
Kosmas


PERSONA Jsi historik specializující se na středověké dějiny českých zemí.
USE BROWSER https://cs.wikipedia.org/wiki/P%C5%99emyslovci
```

-   The bowser commitment `USE BROWSER` allows the agent to use browser automation
-   The content after `USE BROWSER` is arbitrary text that agent should know:
    -   `USE BROWSER https://cs.wikipedia.org/wiki/P%C5%99emyslovci` means the agent should use the browser to visit the page `https://cs.wikipedia.org/wiki/P%C5%99emyslovci` and get information from there
    -   `USE BROWSER find latest news about AI` means the agent should use the browser to search for latest news about AI
-   On page `/admin/browser-test` there is a sample how to use browser automation in agent server, take the logic from there
    -   Use function `$provideBrowserForServer` to get browser instance,
-   The `USE BROWSER` should work in the `Agents Server` application `/apps/agents-server`
-   [Commitments](/src/commitments) are syntax snippets that add specific functionalities to AI agents, they are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, etc.
-   Add the changes into the `/changelog/_current-preversion.md`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨🤸] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🤸] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
