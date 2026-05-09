[x] ~$1.73 2 hours by OpenAI Codex `gpt-5.5`

[✨🚡] Do the knowledge search with LlamaIndex Framework not with OpenAI native vector store

-   Keep all the existing behaviour of Agents server, `KNOWLEDGE` commitment should work the same as before, but instead of using OpenAI native vector store for knowledge search, use LlamaIndex framework for knowledge search.
    -   Keep the functionality visually and functionally, just the internal implementation of knowledge search should be changed
    -   When the answer is based on the knowledge search, the used sources should be part of the answer as the chips under a message _(simmilar to the current situation)_
-   Cache the indexation in the database, so it will not be necessary to re-index the documents every time, but only when the documents are changed.
-   The indexation should be done in the background on the Vercel server, so it will not block the main thread and the user can continue using the app while the indexation is being done.
-   Used sources should be part of [`ChatMessage` object](src/book-components/Chat/types/ChatMessage.ts)
-   Use of `KNOWLEDGE` commitment will add tool `knowledge_search` into `modelRequirements.tools` which will enable to do the knowledge search _(simmilar patter to searching in internet via `USE SEARCH ENGINE`)_
    -   Also add instructions into generated system message as section `## Knowledge Search` _(simmilar patter to searching in internet via `USE SEARCH ENGINE` and other commitments)_
-   Do a proper analysis of the current functionality before you start implementing.
    -   There is already some implementation of knowledge indexing and scraping, look at it and either use it as a base for the new implementation or deprecate the old one if it is not needed anymore, but do not just add the new implementation alongside the old one without analyzing the current functionality
-   The current solution of knowledge search in the Agents server is externalized to OpenAI vector store, completely remove this externalization and do the knowledge search with LlamaIndex framework internally, cache the indexation in the database and do the indexation in the background, but keep the existing functionality and behaviour of knowledge search, just change the internal implementation of knowledge search to use LlamaIndex framework instead of OpenAI native vector store.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$0.00 an hour by OpenAI Codex `gpt-5.5`

[✨🚡] The knowledge search fails on "Knowledge index is still being prepared. Try the search again after indexing finishes."

-   When using agent and index not prepared always automatically prepare the index in the background and show the chip under message
-   The first message should be answered even if it will wait some time for the indexation to be done
-   The second message should to the same agent should reuse the same index and answer should be quicker
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚡] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🚡] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)

