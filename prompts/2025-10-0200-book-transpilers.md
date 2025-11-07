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

[x][ ]

[✨🌱] Create `LangchainTranspiler`

-   This transpiler will transpile the book into langchain code in Python
-   Transpilers are in `/src/transpilers`
-   Look how other transpilers are implemented, for example `/src/transpilers/openai-sdk`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[ ]

[✨🌱] `OpenAiSdkTranspiler` should work with knowledge commitment

**For example:**

```book
Marigold

PERSONA You are writing stories about Witcher
RULE Do not talk about our world, only about the Witcher universe

KNOWLEDGE {Geralt of Rivia}
Geralt of Rivia is a witcher, a monster hunter for hire, known for his white hair and cat-like eyes.
He possesses superhuman abilities due to mutations he underwent during the Trial of the Grasses.
Geralt is skilled in swordsmanship, alchemy, and magic signs.
He is often accompanied by his horse, Roach, and has a complex relationship with {Yennefer of Vengerberg},
    a powerful sorceress, and {Ciri}, his adopted daughter with a destiny intertwined with his own.

KNOWLEDGE {Yennefer of Vengerberg}
Yennefer of Vengerberg is a formidable sorceress known for her beauty, intelligence, and temper.
She has a complicated past, having been born with a hunchback and later transformed through magic.
Yennefer is deeply connected to Geralt of Rivia, with whom she shares a tumultuous romantic relationship.
She is also a mother figure to {Ciri}, whom she trains in the ways of magic.

KNOWLEDGE {Ciri}
Ciri, also known as {Cirilla Fiona Elen Riannon}, is a young woman with a mysterious past and a powerful destiny.
She is the daughter of {Poviss}, the ruler of the kingdom of Cintra, and possesses the Elder Blood, which grants her extraordinary abilities.
Ciri is a skilled fighter and has been trained in the ways of the sword by Geralt of Rivia.
Her destiny is intertwined with that of Geralt and Yennefer, as they both seek to protect her from those who would exploit her powers.
```

Defines AI agent called "Marigold" who writes stories about Witcher universe using knowledge about characters Geralt, Yennefer and Ciri.
PERSONA and RULE commitments defines agent behavior and are used in prompt/system message directly. (see the current commitment implementation). In the other hand KNOWLEDGE commitments are large pieces of text that can be used as context for the agent when needed. So when transpiling the book into code using OpenAI SDK, the transpiler should check the knowledge commitments and decide whether to include them in the prompt directly or use RAG (retrieval augmented generation) approach to fetch relevant knowledge when needed.

-   When the knowledge is above some threshold, the RAG should be used in the transpiled code
-   You work with file src/transpilers/openai-sdk/OpenAiSdkTranspiler.ts
-   You are working with commitment file /src/book-2.0/commitments/KNOWLEDGE/KNOWLEDGE.ts
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🌱] `OpenAiSdkTranspiler` should work with knowledge that references external source

-
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[]

[✨🌱] Fix BookEditor highlite when other monaco editor mounted in same page

-   You are working with /src/book-components/BookEditor/BookEditor.tsx
-   The problem with highlite is happening for example in /apps/playground/src/app/book-to-openai/page.tsx
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[ ]

[✨🌱]

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
