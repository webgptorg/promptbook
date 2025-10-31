[x]

[✨🌱] Make system for `BookTranspilers`

-   Transpiler takes a book `string_book` and transpiles it into another format, for example into Python Langchain, Raw prompt, Javascript OpenAI SDK code, etc.
-   Make type `BookTranspilerDefinition` which will be implemented by each transpiler definition
-   Each transpiler has its public profile _(similar to `LlmTools`, Scrapers, Convertors, etc.)_
-   Transpiling is async process
-   Transpiler can internally use other tools, it has passable `ExecutionTools` in constructor
-   Allow to pass additional options into transpiler like `isVerbose`, `shouldIncludeComments`, etc., look how theese options are passed in other places
-   Use system of registers - each transpiler is registered in a central place
    -   Look how registration logic work, use it: for example: `/src/llm-providers/_common/register/$llmToolsRegister.ts`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[x]

[✨🌱] Create `OpenAiSdkTranspiler`

-   This transpiler will transpile the book into Javascript code using OpenAI SDK
-   Transpilers are in `/src/transpilers`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🌱] Create `LangchainTranspiler`

-   This transpiler will transpile the book into langchain code in Python
-   Transpilers are in `/src/transpilers`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🌱] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
