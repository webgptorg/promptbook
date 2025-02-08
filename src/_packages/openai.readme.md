`@promptbook/openai` integrates [OpenAI's API](https://openai.com/) with [Promptbook](https://github.com/webgptorg/promptbook). It allows to execute Promptbooks with OpenAI GPT models.

## 🧡 Usage

```typescript
import { createPipelineExecutor, assertsExecutionSuccessful } from '@promptbook/core';
import {
    createCollectionFromDirectory,
    $provideExecutionToolsForNode,
    $provideFilesystemForNode,
} from '@promptbook/node';
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';

// ▶ Prepare tools
const fs = $provideFilesystemForNode();
const llm = new OpenAiExecutionTools(
    //            <- TODO: [🧱] Implement in a functional (not new Class) way
    {
        isVerbose: true,
        apiKey: process.env.OPENAI_API_KEY,
    },
);
const executables = await $provideExecutablesForNode();
const tools = {
    llm,
    fs,
    scrapers: await $provideScrapersForNode({ fs, llm, executables }),
    script: [new JavascriptExecutionTools()],
};

// ▶ Create whole pipeline collection
const collection = await createCollectionFromDirectory('./books', tools);

// ▶ Get single Pipeline
const pipeline = await collection.getPipelineByUrl(`https://promptbook.studio/my-collection/write-article.book.md`);

// ▶ Create executor - the function that will execute the Pipeline
const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

// ▶ Prepare input parameters
const inputParameters = { word: 'cat' };

// 🚀▶ Execute the Pipeline
const result = await pipelineExecutor(inputParameters).asPromise({ isXxx: true });

// ▶ Handle the result
const { isSuccessful, errors, outputParameters, executionReport } = result;
console.info(outputParameters);
```

## 🤺 Usage with OpenAI`s Assistants (GPTs)

> TODO: Write a guide how to use OpenAI's Assistants with Promptbook

<!--
OpenAiExecutionTools.createAssistantSubtools
-->

<!--Import ./wizzard.readme.md-->
<!--⚠️ WARNING: This section was imported, make changes in source; any manual changes here will be overwritten-->

## 🧙‍♂️ Wizard

Run books without any settings, boilerplate or struggle in Node.js:

```typescript
import { wizzard } from '@promptbook/wizzard';

const {
    outputParameters: { joke },
} = await wizzard.execute(`https://github.com/webgptorg/book/blob/main/books/templates/generic.book.md`, {
    topic: 'Prague',
});

console.info(joke);
```

<!--/Import ./wizzard.readme.md-->

<!--Import ./content/$provideExecutionToolsForNode.md-->
<!--⚠️ WARNING: This section was imported, make changes in source; any manual changes here will be overwritten-->

## 🧙‍♂️ Connect to LLM providers automatically

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

<!--/Import ./content/$provideExecutionToolsForNode.md-->

## 💕 Usage of multiple LLM providers

You can use multiple LLM providers in one Promptbook execution. The best model will be chosen automatically according to the prompt and the model's capabilities.

```typescript
import { createPipelineExecutor, assertsExecutionSuccessful } from '@promptbook/core';
import {
    createCollectionFromDirectory,
    $provideExecutionToolsForNode,
    $provideFilesystemForNode,
} from '@promptbook/node';
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';
import { AnthropicClaudeExecutionTools } from '@promptbook/anthropic-claude';
import { AzureOpenAiExecutionTools } from '@promptbook/azure-openai';

// ▶ Prepare multiple tools
const fs = $provideFilesystemForNode();
const llm = [
    // Note: You can use multiple LLM providers in one Promptbook execution.
    //       The best model will be chosen automatically according to the prompt and the model's capabilities.
    new OpenAiExecutionTools(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        {
            apiKey: process.env.OPENAI_API_KEY,
        },
    ),
    new AnthropicClaudeExecutionTools(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        {
            apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY,
        },
    ),
    new AzureOpenAiExecutionTools(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        {
            resourceName: process.env.AZUREOPENAI_RESOURCE_NAME,
            deploymentName: process.env.AZUREOPENAI_DEPLOYMENT_NAME,
            apiKey: process.env.AZUREOPENAI_API_KEY,
        },
    ),
];
const executables = await $provideExecutablesForNode();
const tools = {
    llm,
    fs,
    scrapers: await $provideScrapersForNode({ fs, llm, executables }),
    script: [new JavascriptExecutionTools()],
};

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

<!--Import ./content/providers.md-->
<!--⚠️ WARNING: This section was imported, make changes in source; any manual changes here will be overwritten-->

### 💙 Integration with other models

See the other model integrations:

-   [OpenAI](https://www.npmjs.com/package/@promptbook/openai)
-   [Anthropic Claude](https://www.npmjs.com/package/@promptbook/anthropic-claude)
-   [Google Gemini](https://www.npmjs.com/package/@promptbook/google)
-   [Vercel](https://www.npmjs.com/package/@promptbook/vercel)
-   [Azure OpenAI](https://www.npmjs.com/package/@promptbook/azure-openai)

<!--/Import ./content/providers.md-->
