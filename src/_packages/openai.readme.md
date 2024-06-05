Wrapper around [OpenAI's SDK](https://www.npmjs.com/package/openai) to make it easier to use inside Promptbooks.

<!-- TODO: [🧠][🧙‍♂️] Maybe there can be some wizzard for thoose who want to use just OpenAI in simple CLI environment -->



<!-- TODO: [🈷] !!!! Write more text about -->

## Usage

```typescript
import {
    createPromptbookExecutor,
    createPromptbookLibraryFromDirectory,
    assertsExecutionSuccessful,
} from '@promptbook/core';
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';

// Create whole Promptbook library
const library = await createPromptbookLibraryFromDirectory('./promptbook-library');

// Get one Promptbook
const promptbook = await library.getPromptbookByUrl(`https://promptbook.studio/my-library/write-article.ptbk.md`);

// Prepare tools
const tools = {
    llm: new OpenAiExecutionTools({
        apiKey: process.env.OPENAI_API_KEY,
    }),
    script: [new JavascriptExecutionTools()],
};

// Create executor - the function that will execute the Promptbook
const promptbookExecutor = createPromptbookExecutor({ promptbook, tools });

// Prepare input parameters
const inputParameters = { word: 'cat' };

// 🚀 Execute the Promptbook
const result = await promptbookExecutor(inputParameters);

// Fail if the execution was not successful
assertsExecutionSuccessful(result);

// Handle the result
const { isSuccessful, errors, outputParameters, executionReport } = result;
console.info(outputParameters);
```

<!--
## Usage with backup

TODO: !!!! [77] Write sample with multiple LLMs
-->

## Other models

See the other models available in the Promptbook package:

-   [Azure OpenAI](https://www.npmjs.com/package/@promptbook/azure-openai)
-   [Anthropic Claude](https://www.npmjs.com/package/@promptbook/anthropic-claude)
