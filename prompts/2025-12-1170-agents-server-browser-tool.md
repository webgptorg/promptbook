[x] $1.70

[✨🆖] Allow to agents to access the URL content on demand

For example, the agent should be able to answer flowing question correctly: "Tell me the difference of the first paragraphs of https://en.wikipedia.org/wiki/Artificial_intelligence and https://en.wikipedia.org/wiki/Machine_learning", or "Summarize the document at https://arxiv.org/pdf/2305.10403.pdf".

-   There is commitment `USE BROWSER`, update it in such a way that this commitment defines two separate tools and functions.
-   There should be two levels of browser access:
    1. One-shot: This should be a simple function with a parameter of URL which should return the page.
    2. Running browser: Scaffolding is already there, but it should be done later properly.
-   Agent can decide which of these functions to use.
-   Leverage the systems of scrapers. There is already a system which can scraoe a URL into its (markdown) content.
-   For example, the agent can decide that he needs a URL like "https://en.wikipedia.org/..." or "https://foo.com/something.pdf" and use the one-shot function to get the content of the page or document.
-   The second tool should be prepared there, but it's not active yet. This tool will in future allow the agent to run the browser and do the complex tasks. Like scrolling in the page, clicking, etc. But this is for the future.
-   When the agent asks the One-shot tool for providing the contents of URL, it should show the correxponding chiplet (How the chiplet works for `USE TIME` and `USE SEARCH ENGINE`), the chiplet will open pop-up with the document. Leverage the iframe for this in the pop-up.
-   It should work with the Agents Server
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🆖] qux

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🆖] qux

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🆖] qux

-   ...
-   You are working with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

