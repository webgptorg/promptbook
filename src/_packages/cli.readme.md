CLI utils for Promptbook. After install you can use `promptbook` command in terminal:

## Make your Promptbook Library

You can prebuild your own Promptbook library with `ptbk make` command:

```bash
npx ptbk make ./promptbook-collection --format typescript --verbose
```

This will emit `index.ts` with `getPipelineCollection` function file in `promptbook-collection` directory.

Then just use it:

```typescript
import { createPipelineExecutor, assertsExecutionSuccessful } from '@promptbook/core';
import { $provideExecutionToolsForNode } from '@promptbook/node';
import { $provideFilesystemForNode } from '@promptbook/node';
import { getPipelineCollection } from './promptbook-collection'; // <- Importing from pre-built library
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';

// ▶ Get single Pipeline
const promptbook = await getPipelineCollection().getPipelineByUrl(
    `https://promptbook.studio/my-collection/write-article.book.md`,
);

// ▶ Create executor - the function that will execute the Pipeline
const pipelineExecutor = createPipelineExecutor({ pipeline, tools: await $provideExecutionToolsForNode() });

// ▶ Prepare input parameters
const inputParameters = { word: 'cat' };

// 🚀▶ Execute the Pipeline
const result = await pipelineExecutor(inputParameters);

// ▶ Fail if the execution was not successful
assertsExecutionSuccessful(result);

// ▶ Handle the result
const { isSuccessful, errors, outputParameters, executionReport } = result;
console.info(outputParameters);
```

This is simmilar to compilation process, during the build time the `ptbk make` command will check promptbooks for errors, convert them to the more optimized format and build knowledge (RAG) for the pipeline collection.

There is also a javascript and json format available.

## Prettify

```bash
npx ptbk prettify promptbook/**/*.book.md
```

This will prettify all promptbooks in `promptbook` directory and adds Mermaid graphs to them.
