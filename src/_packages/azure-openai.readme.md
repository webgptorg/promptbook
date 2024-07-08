`@promptbook/azure-openai` integrates [Azure OpenAI API](https://oai.azure.com/portal/) with [Promptbook](https://github.com/webgptorg/promptbook). It allows to execute Promptbooks with Azure OpenAI GPT models.

> Note: This is similar to [@promptbook/openai](https://www.npmjs.com/package/@promptbook/openai) but more useful for Enterprise customers who use Azure OpenAI to ensure strict data privacy and compliance.

## 🧡 Usage

```typescript
import { createPromptbookExecutor, assertsExecutionSuccessful } from '@promptbook/core';
import { createCollectionFromDirectory } from '@promptbook/node';
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';

// ▶ Create whole Promptbook library
const library = await createCollectionFromDirectory('./promptbook-collection');

// ▶ Get one Promptbook
const promptbook = await library.getPipelineByUrl(`https://promptbook.studio/my-library/write-article.ptbk.md`);

// ▶ Prepare tools
const tools = {
    llm: new AzureOpenAiExecutionTools({
        isVerbose: true,
        resourceName: process.env.AZUREOPENAI_RESOURCE_NAME,
        deploymentName: process.env.AZUREOPENAI_DEPLOYMENT_NAME,
        apiKey: process.env.AZUREOPENAI_API_KEY,
    }),
    script: [new JavascriptExecutionTools()],
};

// ▶ Create executor - the function that will execute the Promptbook
const promptbookExecutor = createPromptbookExecutor({ promptbook, tools });

// ▶ Prepare input parameters
const inputParameters = { word: 'crocodile' };

// 🚀▶ Execute the Promptbook
const result = await promptbookExecutor(inputParameters);

// ▶ Fail if the execution was not successful
assertsExecutionSuccessful(result);

// ▶ Handle the result
const { isSuccessful, errors, outputParameters, executionReport } = result;
console.info(outputParameters);
```

## 💕 Usage of multiple LLM providers

You can use multiple LLM providers in one Promptbook execution. The best model will be chosen automatically according to the prompt and the model's capabilities.

```typescript
import { createPromptbookExecutor, assertsExecutionSuccessful } from '@promptbook/core';
import { createCollectionFromDirectory } from '@promptbook/node';
import { JavascriptExecutionTools } from '@promptbook/execute-javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';

// ▶ Create whole Promptbook library
const library = await createCollectionFromDirectory('./promptbook-collection');

// ▶ Get one Promptbook
const promptbook = await library.getPipelineByUrl(`https://promptbook.studio/my-library/write-article.ptbk.md`);

// ▶ Prepare tools
const tools = new MultipleLlmExecutionTools(
    // Note: You can use multiple LLM providers in one Promptbook execution. The best model will be chosen automatically according to the prompt and the model's capabilities.
    new AzureOpenAiExecutionTools({
        resourceName: process.env.AZUREOPENAI_RESOURCE_NAME,
        deploymentName: process.env.AZUREOPENAI_DEPLOYMENT_NAME,
        apiKey: process.env.AZUREOPENAI_API_KEY,
    }),
    new OpenAiExecutionTools({
        apiKey: process.env.OPENAI_API_KEY,
    }),
    new AnthropicClaudeExecutionTools({
        apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY,
    }),
);

// ▶ Create executor - the function that will execute the Promptbook
const promptbookExecutor = createPromptbookExecutor({ promptbook, tools });

// ▶ Prepare input parameters
const inputParameters = { word: 'snake' };

// 🚀▶ Execute the Promptbook
const result = await promptbookExecutor(inputParameters);

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
