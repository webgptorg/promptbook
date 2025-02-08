# 🧙‍♂️ Connect to LLM providers automatically

You can just use `$provideExecutionToolsForNode` function to create all required tools from environment variables like `ANTHROPIC_CLAUDE_API_KEY` and `OPENAI_API_KEY` automatically.

```typescript
import { createPipelineExecutor, createCollectionFromDirectory, assertsExecutionSuccessful } from '@promptbook/core';
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { $provideExecutionToolsForNode } from '@promptbook/node';
import { $provideFilesystemForNode } from '@promptbook/node';

// ▶ Prepare tools
const tools = await $provideExecutionToolsForNode();

// ▶ Create whole pipeline collection
const collection = await createCollectionFromDirectory('./books', tools);

// ▶ Get single Pipeline
const pipeline = await collection.getPipelineByUrl(`https://promptbook.studio/my-collection/write-article.book.md`);

// ▶ Create executor - the function that will execute the Pipeline
const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

// ▶ Prepare input parameters
const inputParameters = { word: 'dog' };

// 🚀▶ Execute the Pipeline
const result = await pipelineExecutor(inputParameters).asPromise({ isXxx: true });

// ▶ Handle the result
const { isSuccessful, errors, outputParameters, executionReport } = result;
console.info(outputParameters);
```
