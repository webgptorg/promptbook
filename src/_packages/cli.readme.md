CLI utils for Promptbook. After install you can use `promptbook` command in terminal:

## Make your Promptbook Library

You can prebuild your own Promptbook library with `promptbook make` command:

```bash
npx promptbook make ./promptbook-library --format typescript --verbose
```

This will emit `index.ts` with `getPipelineCollection` function file in `promptbook-library` directory.

Then just use it:

```typescript
import { createPromptbookExecutor, assertsExecutionSuccessful } from '@promptbook/core';
import { getPipelineCollection } from './promptbook-library'; // <- Importing from pre-built library
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';

// ▶ Get one Promptbook
const promptbook = await getPipelineCollection().getPipelineByUrl(
    `https://promptbook.studio/my-library/write-article.ptbk.md`,
);

// ▶ Prepare tools
const tools = {
    llm: new OpenAiExecutionTools({
        isVerbose: true,
        apiKey: process.env.OPENAI_API_KEY,
    }),
    script: [new JavascriptExecutionTools()],
};

// ▶ Create executor - the function that will execute the Promptbook
const promptbookExecutor = createPromptbookExecutor({ promptbook, tools });

// ▶ Prepare input parameters
const inputParameters = { word: 'cat' };

// 🚀▶ Execute the Promptbook
const result = await promptbookExecutor(inputParameters);

// ▶ Fail if the execution was not successful
assertsExecutionSuccessful(result);

// ▶ Handle the result
const { isSuccessful, errors, outputParameters, executionReport } = result;
console.info(outputParameters);
```

This is simmilar to compilation process, during the build time the `promptbook make` command will check promptbooks for errors, convert them to the more optimized format and build knowledge base (RAG) for the library.

There is also a javascript and json format available.

## Prettify

```bash
npx promptbook prettify promptbook/**/*.ptbk.md
```

This will prettify all promptbooks in `promptbook` directory and adds Mermaid graphs to them.
