`@promptbook/openai` integrates [OpenAI's API](https://openai.com/) with [Promptbook](https://github.com/webgptorg/promptbook). It allows to execute Promptbooks with OpenAI GPT models.

## 🧡 Usage

```typescript
import { createPipelineExecutor, assertsExecutionSuccessful } from '@promptbook/core';
import { createCollectionFromDirectory } from '@promptbook/node';
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';

// ▶ Create whole pipeline collection
const collection = await createCollectionFromDirectory('./promptbook-collection');

// ▶ Get single Pipeline
const pipeline = await collection.getPipelineByUrl(`https://promptbook.studio/my-collection/write-article.ptbk.md`);

// ▶ Prepare tools
const tools = {
    llm: new OpenAiExecutionTools(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        {
            isVerbose: true,
            apiKey: process.env.OPENAI_API_KEY,
        },
    ),
    script: [
        new JavascriptExecutionTools(),
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
    ],
};

// ▶ Create executor - the function that will execute the Pipeline
const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

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

## 🧙‍♂️ Connect to LLM providers automatically

You can just use `createLlmToolsFromEnv` function to create LLM tools from environment variables like `OPENAI_API_KEY` and `ANTHROPIC_CLAUDE_API_KEY` automatically.

```typescript
import { createPipelineExecutor, createCollectionFromDirectory, assertsExecutionSuccessful } from '@promptbook/core';
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { createLlmToolsFromEnv } from '@promptbook/node';

// ▶ Create whole pipeline collection
const collection = await createCollectionFromDirectory('./promptbook-collection');

// ▶ Get single Pipeline
const pipeline = await collection.getPipelineByUrl(`https://promptbook.studio/my-collection/write-article.ptbk.md`);

// ▶ Prepare multiple tools
const tools = {
    // Note: 🧙‍♂️ Just call `createLlmToolsFromEnv` to automatically connect to all configured providers
    llm: createLlmToolsFromEnv(),
    script: [
        new JavascriptExecutionTools(),
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
    ],
};

// ▶ Create executor - the function that will execute the Pipeline
const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

// ▶ Prepare input parameters
const inputParameters = { word: 'dog' };

// 🚀▶ Execute the Pipeline
const result = await pipelineExecutor(inputParameters);

// ▶ Fail if the execution was not successful
assertsExecutionSuccessful(result);

// ▶ Handle the result
const { isSuccessful, errors, outputParameters, executionReport } = result;
console.info(outputParameters);
```

## 💕 Usage of multiple LLM providers

You can use multiple LLM providers in one Promptbook execution. The best model will be chosen automatically according to the prompt and the model's capabilities.

```typescript
import { createPipelineExecutor, assertsExecutionSuccessful } from '@promptbook/core';
import { createCollectionFromDirectory } from '@promptbook/node';
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';
import { AnthropicClaudeExecutionTools } from '@promptbook/anthropic-claude';
import { AzureOpenAiExecutionTools } from '@promptbook/azure-openai';

// ▶ Create whole pipeline collection
const collection = await createCollectionFromDirectory('./promptbook-collection');

// ▶ Get single Pipeline
const pipeline = await collection.getPipelineByUrl(`https://promptbook.studio/my-collection/write-article.ptbk.md`);

// ▶ Prepare multiple tools
const tools = {
    llm: [
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
    ],
    script: [
        new JavascriptExecutionTools(),
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
    ],
};

// ▶ Create executor - the function that will execute the Pipeline
const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

// ▶ Prepare input parameters
const inputParameters = { word: 'dog' };

// 🚀▶ Execute the Pipeline
const result = await pipelineExecutor(inputParameters);

// ▶ Fail if the execution was not successful
assertsExecutionSuccessful(result);

// ▶ Handle the result
const { isSuccessful, errors, outputParameters, executionReport } = result;
console.info(outputParameters);
```

## 💙 Integration with other models

See the other models available in the Promptbook package:

-   [Azure OpenAI](https://www.npmjs.com/package/@promptbook/azure-openai)
-   [Anthropic Claude](https://www.npmjs.com/package/@promptbook/anthropic-claude)

<!-- TODO: [🧠][🧙‍♂️] Maybe there can be some wizzard for thoose who want to use just OpenAI in simple CLI environment -->
