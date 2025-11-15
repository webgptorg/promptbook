`@promptbook/google` integrates [Google's Gemini API](https://gemini.google.com/) with [Promptbook](https://github.com/webgptorg/promptbook). It allows to execute Promptbooks with Gemini models.

## 🧡 Usage

```typescript
import { createPipelineExecutor, createPipelineCollectionFromDirectory } from '@promptbook/core';
import {
    createPipelineCollectionFromDirectory,
    $provideExecutionToolsForNode,
    $provideFilesystemForNode,
    $provideScrapersForNode,
    $provideScriptingForNode,
} from '@promptbook/node';
import { JavascriptExecutionTools } from '@promptbook/javascript';
import { GoogleExecutionTools } from '@promptbook/google';

// 🛠 Prepare the tools that will be used to compile and run your books
// Note: Here you can allow or deny some LLM providers, such as not providing DeepSeek for privacy reasons
const fs = $provideFilesystemForNode();
const llm = new GoogleExecutionTools(
    //            <- TODO: [🧱] Implement in a functional (not new Class) way
    {
        isVerbose: true,
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    },
);
const executables = await $provideExecutablesForNode();
const tools = {
    llm,
    fs,
    scrapers: await $provideScrapersForNode({ fs, llm, executables }),
    script: await $provideScriptingForNode({}),
};

// ▶ Create whole pipeline collection
const collection = await createPipelineCollectionFromDirectory('./books', tools);

// ▶ Get single Pipeline
const pipeline = await collection.getPipelineByUrl(`https://promptbook.studio/my-collection/write-article.book`);

// ▶ Create executor - the function that will execute the Pipeline
const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

// ▶ Prepare input parameters
const inputParameters = { word: 'rabbit' };

// 🚀▶ Execute the Pipeline
const result = await pipelineExecutor(inputParameters).asPromise({ isCrashedOnError: true });

// ▶ Handle the result
const { isSuccessful, errors, outputParameters, executionReport } = result;
console.info(outputParameters);
```

<!--Import ./wizard.readme.md-->
<!--⚠️ WARNING: This section was imported, make changes in source; any manual changes here will be overwritten-->

## 🧙‍♂️ Wizard

Run books without any settings, boilerplate or struggle in Node.js:

```typescript
import { wizard } from '@promptbook/wizard';

const {
    outputParameters: { joke },
} = await wizard.execute(`https://github.com/webgptorg/book/blob/main/books/templates/generic.book`, {
    topic: 'Prague',
});

console.info(joke);
```

<!--/Import ./wizard.readme.md-->

<!--Import ./content/$provideExecutionToolsForNode.md-->
<!--⚠️ WARNING: This section was imported, make changes in source; any manual changes here will be overwritten-->

## 🧙‍♂️ Connect to LLM providers automatically

You can just use `$provideExecutionToolsForNode` function to create all required tools from environment variables like `ANTHROPIC_CLAUDE_API_KEY` and `OPENAI_API_KEY` automatically.

```typescript
import { createPipelineExecutor, createPipelineCollectionFromDirectory } from '@promptbook/core';
import { JavascriptExecutionTools } from '@promptbook/javascript';
import { $provideExecutionToolsForNode } from '@promptbook/node';
import { $provideFilesystemForNode } from '@promptbook/node';

// 🛠 Prepare the tools that will be used to compile and run your books
// Note: Here you can allow or deny some LLM providers, such as not providing DeepSeek for privacy reasons
const tools = await $provideExecutionToolsForNode();

// ▶ Create whole pipeline collection
const collection = await createPipelineCollectionFromDirectory('./books', tools);

// ▶ Get single Pipeline
const pipeline = await collection.getPipelineByUrl(`https://promptbook.studio/my-collection/write-article.book`);

// ▶ Create executor - the function that will execute the Pipeline
const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

// ▶ Prepare input parameters
const inputParameters = { word: 'dog' };

// 🚀▶ Execute the Pipeline
const result = await pipelineExecutor(inputParameters).asPromise({ isCrashedOnError: true });

// ▶ Handle the result
const { isSuccessful, errors, outputParameters, executionReport } = result;
console.info(outputParameters);
```

<!--/Import ./content/$provideExecutionToolsForNode.md-->

## 💕 Usage of multiple LLM providers

You can use multiple LLM providers in one Promptbook execution. The best model will be chosen automatically according to the prompt and the model's capabilities.

```typescript
import { createPipelineExecutor, createPipelineCollectionFromDirectory } from '@promptbook/core';
import { $provideExecutionToolsForNode } from '@promptbook/node';
import { $provideFilesystemForNode } from '@promptbook/node';
import { JavascriptExecutionTools } from '@promptbook/javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';
import { GoogleExecutionTools } from '@promptbook/google';

// ▶ Prepare multiple tools
const fs = $provideFilesystemForNode();
const llm = [
    // Note: 💕 You can use multiple LLM providers in one Promptbook execution.
    //       The best model will be chosen automatically according to the prompt and the model's capabilities.
    new GoogleExecutionTools(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        {
            apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        },
    ),
    new OpenAiExecutionTools(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        {
            apiKey: process.env.OPENAI_API_KEY,
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
    script: await $provideScriptingForNode({}),
};

// ▶ Create whole pipeline collection
const collection = await createPipelineCollectionFromDirectory('./books', tools);

// ▶ Get single Pipeline
const pipeline = await collection.getPipelineByUrl(`https://promptbook.studio/my-collection/write-article.book`);

// ▶ Create executor - the function that will execute the Pipeline
const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

// ▶ Prepare input parameters
const inputParameters = { word: 'bunny' };

// 🚀▶ Execute the Pipeline
const result = await pipelineExecutor(inputParameters).asPromise({ isCrashedOnError: true });

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
