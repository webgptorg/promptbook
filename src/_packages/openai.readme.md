Wrapper around [OpenAI's SDK](https://www.npmjs.com/package/openai) to make it easier to use inside Promptbooks.

<!-- TODO: [🈷] !!!!!!!!! -->

## Usage

```typescript
import { createPromptbookExecutor, createPromptbookLibraryFromDirectory } from '@promptbook/core';
import { JavascriptEvalExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';
import { assertsExecutionSuccessful } from '@promptbook/utils';

// TODO: !!!!! Test that this code works
// TODO: !!!!! Comment

const library = createPromptbookLibraryFromDirectory('./promptbook');
const promptbook = library.getPromptbookByUrl(`https://promptbook.studio/my-library/write-article.ptbk.md`);

const tools = {
    llm: new OpenAiExecutionTools({
        apiKey: process.env.OPENAI_API_KEY,
    }),
    script: [new JavascriptEvalExecutionTools()],
};

const promptbookExecutor = createPromptbookExecutor({ promptbook, tools });

const inputParameters = { word: 'cat' };
const { isSuccessful, errors, outputParameters, executionReport } = await promptbookExecutor(inputParameters);

console.info(outputParameters);

assertsExecutionSuccessful({ isSuccessful, errors });
```

<!--
## Usage with backup

TODO: !!!
-->

## Other models

See the other models available in the Promptbook package:

-   [Azure OpenAI](https://www.npmjs.com/package/@promptbook/azure-openai)
-   [Anthropic Claude](https://www.npmjs.com/package/@promptbook/anthropic-claude)
