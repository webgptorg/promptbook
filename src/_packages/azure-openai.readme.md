`@promptbook/azure-openai` integrates [Azure OpenAI API](https://oai.azure.com/portal/) with [Promptbook](https://github.com/webgptorg/promptbook). It allows to execute Promptbooks with Azure OpenAI GPT models.

> Note: This is similar to [@promptbook/openai](https://www.npmjs.com/package/@promptbook/openai) but more useful for Enterprise customers who use Azure OpenAI to ensure strict data privacy and compliance.

## 🧡 Usage

```typescript
import { createPipelineExecutor, assertsExecutionSuccessful } from '@promptbook/core';
import { createCollectionFromDirectory } from '@promptbook/node';
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { AzureOpenAiExecutionTools } from '@promptbook/azure-openai';

// ▶ Create whole pipeline collection
const collection = await createCollectionFromDirectory('./promptbook-collection');

// ▶ Get single Pipeline
const pipeline = await collection.getPipelineByUrl(`https://promptbook.studio/my-collection/write-article.ptbk.md`);

// ▶ Prepare tools
const tools = {
    llm: new AzureOpenAiExecutionTools(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        {
            isVerbose: true,
            resourceName: process.env.AZUREOPENAI_RESOURCE_NAME,
            deploymentName: process.env.AZUREOPENAI_DEPLOYMENT_NAME,
            apiKey: process.env.AZUREOPENAI_API_KEY,
        },
    ),
    script: [new JavascriptExecutionTools()],
};

// ▶ Create executor - the function that will execute the Pipeline
const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

// ▶ Prepare input parameters
const inputParameters = { word: 'crocodile' };

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
import { AzureOpenAiExecutionTools } from '@promptbook/azure-openai';
import { OpenAiExecutionTools } from '@promptbook/openai';
import { AnthropicClaudeExecutionTools } from '@promptbook/anthropic-claude';

// ▶ Create whole pipeline collection
const collection = await createCollectionFromDirectory('./promptbook-collection');

// ▶ Get single Pipeline
const pipeline = await collection.getPipelineByUrl(`https://promptbook.studio/my-collection/write-article.ptbk.md`);

// ▶ Prepare multiple tools
const tools = {
    llm: [
        // Note: You can use multiple LLM providers in one Promptbook execution.
        //       The best model will be chosen automatically according to the prompt and the model's capabilities.
        new AzureOpenAiExecutionTools(
            //            <- TODO: [🧱] Implement in a functional (not new Class) way
            {
                resourceName: process.env.AZUREOPENAI_RESOURCE_NAME,
                deploymentName: process.env.AZUREOPENAI_DEPLOYMENT_NAME,
                apiKey: process.env.AZUREOPENAI_API_KEY,
            },
        ),
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
    ],
    script: [new JavascriptExecutionTools()],
};

// ▶ Create executor - the function that will execute the Pipeline
const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

// ▶ Prepare input parameters
const inputParameters = { word: 'snake' };

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

-   [OpenAI](https://www.npmjs.com/package/@promptbook/openai)
-   [Anthropic Claude](https://www.npmjs.com/package/@promptbook/anthropic-claude)
