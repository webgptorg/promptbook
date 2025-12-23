[x]

[✨🥡] Implement `USE SEARCH ENGINE` commitment

```book
Paul Smith & Associés

PERSONA You are a company lawyer.
Your job is to provide legal advice and support to the company and its employees.
You are knowledgeable, professional, and detail-oriented.
USE SEARCH ENGINE
```

-   `USE SEARCH ENGINE` indicates that the agent should utilize a search engine tool to access and retrieve up-to-date information from the internet when necessary.
-   The contents of this commitment _(what follows after "USE SEARCH ENGINE", like "USE SEARCH ENGINE contents foo bar ...")_ has no effect and is ignored _(simmilar to `NOTE`)_
-   This is the first commitment in family of commitments `USE`, there will be more in future, e.g., `USE SEARCH ENGINE`, `USE FILE SYSTEM`, `USE MCP`, etc. _(Its simmilar principle to `META IMAGE`, `META LINK`, `META COLOR`,... commitment family, look how they are handled)_
-   For the commitment `USE SEARCH ENGINE` create its folder in `/src/commitments` and register it in the `/src/commitments/index.ts`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   To implement the actual search engine use You are working with the `Agents Server` application `/apps/agents-server`
-   Add the changes into the `/changelog/_current-preversion.md`

---

[x]

[✨🥡] Create a testing page for (dummy) search engine

-   Do some generic interface `SearchEngine` of search engine under `/src/search-engines` that can be used to plug different search engine providers (e.g., Google, Bing, DuckDuckGo, etc.)
-   Implement a simple search engine provider that uses a public search engine API (e.g., Bing Search API) to perform searches.
    -   Implement the first DummySearchEngine that returns fixed results for any query, so we can test the commitment functionality without relying on an actual search engine API.
-   Look how other providers are implemented, e.g., [LLM Providers](/src/llm-providers) or [Scrapers](/src/scrapers), for search engines similar robust system with strongly separated interfaces, providers, and registrations
-   Create page `/admin/search-engine-test` in the `Agents Server` application `/apps/agents-server`
    -   The page should have an input field to enter a search query and a button to perform the search.
    -   Also allow selecting which search engine provider to use (e.g., DummySearchEngine, BingSearchEngine, etc.)
    -   When the button is clicked, it should use the search engine provider to perform the search and display the results on the page.
    -   Add link to the [menu](apps/agents-server/src/components/Header/Header.tsx) under "Systems" > "Search Engine Test"
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[ ]

[✨🥡] Implement the search engine usage for agents on agents server

-   There is already commitment `USE SEARCH ENGINE` in the agent server

```book
Kosmas


PERSONA Jsi historik specializující se na středověké dějiny českých zemí.
USE SEARCH ENGINE Hledej informace o Přemyslovcích
```

-   The bowser commitment `USE SEARCH ENGINE` allows the agent to use search engine
-   The content after `USE SEARCH ENGINE` is arbitrary text that agent should know:
    -   `USE SEARCH ENGINE` means just to use search engine
    -   `USE SEARCH ENGINE Hledej informace o Přemyslovcích` means the to use search engine to search for information about specific topic or scope
-   On page `/admin/search-engine-test` there is a sample how to use search engine in agent server, take the logic from there
-   The `USE SEARCH ENGINE` should work in the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

**Context:**

-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
    -   Commitments are in the folder `/src/commitments`
    -   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

---

[x]

[✨🥡] Implement the `BingSearchEngine`

-   Search engines are implemented under `/src/search-engines`
-   Implement `BingSearchEngine` that uses Bing search engine to perform
-   Use Bing's [Search API](https://www.microsoft.com/en-us/bing/apis/bing-search-api-v7) to fetch search results.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[ ]

[✨🥡] Implement the `GoogleSearchEngine`

-   Search engines are implemented under `/src/search-engines`
-   Implement `GoogleSearchEngine` that uses Google search engine to perform
-   Use Google's [Search API](https://developers.google.com/custom-search/v1/overview) to fetch search results.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🥡] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🥡] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🥡] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨🥡] brr

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
