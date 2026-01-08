[x]

[✨🗾] Make `USE SEARCH` commitment work

-   When using the `USE SEARCH` commitment in the agent source, the AI agent Should have full definition of the search function in his tools.
-   This should create tool into model requirements with the ability to perform web search using the defined search engine.
-   For the search engines use `SerpSearchEngine`
-   There is already a working [playground for the search](http://localhost:4440/admin/search-engine-test).
-   It should work with the `Agents Server` application `/apps/agents-server`
-   **For the reference, look how `USE TIME` commitment is implemented.**
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[ ]

[✨🗾] Allow AI to leverage all the options and possibilities of SERP search engine.

-   The common interface, the `SearchEngine`, just allows to pass raw text search query into the search engine.
-   But the SERP search engine itself can handle much more like locationLocalization, pagination, advanced filters, underlying search engine, advanced parameters, geographic locations, and much, much, much more.
-   All of these options should be available in the tool call for the AI agent.
-   Update the enter vertical from the `SearchEngine` object to the [testing page](http://localhost:4440/admin/search-engine-test) to the AI agent tool calling and `USE SEARCH` commitment.
-   You are working with [SerpSearchEngine](/src/search-engines/serp/SerpSearchEngine.ts)
-   It should work with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🗾] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🗾] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
