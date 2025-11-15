OpenAI integration for Promptbook, providing execution tools for OpenAI GPT models, OpenAI Assistants, and OpenAI-compatible APIs within the Promptbook ecosystem.

## 🎯 Purpose and Motivation

This package bridges the gap between Promptbook's unified pipeline execution system and OpenAI's powerful language models. It provides a standardized interface for accessing OpenAI's various services while maintaining compatibility with Promptbook's execution framework, enabling seamless integration with different OpenAI offerings.

## 🔧 High-Level Functionality

The package offers three main integration paths:

-   **Standard OpenAI API**: Direct integration with OpenAI's chat completions and embeddings
-   **OpenAI Assistants**: Integration with OpenAI's Assistant API (GPTs)
-   **OpenAI-Compatible APIs**: Support for third-party APIs that follow OpenAI's interface
-   **Model Management**: Automatic model selection and configuration
-   **Usage Tracking**: Built-in monitoring for tokens and costs

## ✨ Key Features

-   🤖 **Multiple OpenAI Integrations** - Support for standard API, Assistants, and compatible services
-   🔄 **Seamless Provider Switching** - Easy integration with other LLM providers
-   🎯 **Model Selection** - Access to all available OpenAI models with automatic selection
-   🔧 **Configuration Flexibility** - Support for custom endpoints, API keys, and parameters
-   📊 **Usage Tracking** - Built-in token usage and cost monitoring
-   🛡️ **Error Handling** - Comprehensive error handling and retry logic
-   🚀 **Performance Optimization** - Caching and request optimization
-   🔌 **OpenAI-Compatible Server** - Use Promptbook books as OpenAI-compatible models

## 🧡 Usage

```typescript
import { createPipelineExecutor } from '@promptbook/core';
import {
    createPipelineCollectionFromDirectory,
    $provideExecutionToolsForNode,
    $provideFilesystemForNode,
    $provideScrapersForNode,
    $provideScriptingForNode,
} from '@promptbook/node';
import { JavascriptExecutionTools } from '@promptbook/javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';

// 🛠 Prepare the tools that will be used to compile and run your books
// Note: Here you can allow or deny some LLM providers, such as not providing DeepSeek for privacy reasons
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
    script: await $provideScriptingForNode({}),
};

// ▶ Create whole pipeline collection
const collection = await createPipelineCollectionFromDirectory('./books', tools);

// ▶ Get single Pipeline
const pipeline = await collection.getPipelineByUrl(`https://promptbook.studio/my-collection/write-article.book`);

// ▶ Create executor - the function that will execute the Pipeline
const pipelineExecutor = createPipelineExecutor({ pipeline, tools });

// ▶ Prepare input parameters
const inputParameters = { word: 'cat' };

// 🚀▶ Execute the Pipeline
const result = await pipelineExecutor(inputParameters).asPromise({ isCrashedOnError: true });

// ▶ Handle the result
const { isSuccessful, errors, outputParameters, executionReport } = result;
console.info(outputParameters);
```

## 🤺 Usage with OpenAI's Assistants (GPTs)

> TODO: Write a guide how to use OpenAI's Assistants with Promptbook

<!--
OpenAiExecutionTools.createAssistantSubtools
-->

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
import { createPipelineExecutor } from '@promptbook/core';
import {
    createPipelineCollectionFromDirectory,
    $provideExecutionToolsForNode,
    $provideFilesystemForNode,
} from '@promptbook/node';
import { JavascriptExecutionTools } from '@promptbook/javascript';
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
            deploymentName: process.env.AZUREOPENAI_DEPLOYMENT_NAME
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
const inputParameters = { word: 'dog' };

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

## 🤖 Using Promptbook as an OpenAI-compatible model

You can use Promptbook books as if they were OpenAI models by using the OpenAI-compatible endpoint. This allows you to use the standard OpenAI SDK with Promptbook books.

First, start the Promptbook server:

```typescript
import { startRemoteServer } from '@promptbook/remote-server';

// Start the server
await startRemoteServer({
    port: 3000,
    collection: await createPipelineCollectionFromDirectory('./books'),
    isAnonymousModeAllowed: true,
    isApplicationModeAllowed: true,
});
```

Then use the standard OpenAI SDK with the server URL:

```typescript
import OpenAI from 'openai';

// Create OpenAI client pointing to your Promptbook server
const openai = new OpenAI({
    baseURL: 'http://localhost:3000', // Your Promptbook server URL
    apiKey: 'not-needed', // API key is not needed for Promptbook
});

// Use any Promptbook book as a model
const response = await openai.chat.completions.create({
    model: 'https://promptbook.studio/my-collection/write-article.book', // Book URL as model name
    messages: [
        {
            role: 'user',
            content: 'Write a short story about a cat',
        },
    ],
});

console.log(response.choices[0].message.content);
```

This allows you to:

-   Use Promptbook books with any OpenAI-compatible client
-   Integrate Promptbook into existing OpenAI-based applications
-   Use Promptbook books as models in other AI frameworks

## 📦 Exported Entities

### Version Information

-   `BOOK_LANGUAGE_VERSION` - Current book language version
-   `PROMPTBOOK_ENGINE_VERSION` - Current engine version

### Execution Tools Creation Functions

-   `createOpenAiAssistantExecutionTools` - Create OpenAI Assistant execution tools
-   `createOpenAiCompatibleExecutionTools` - Create OpenAI-compatible execution tools
-   `createOpenAiExecutionTools` - Create standard OpenAI execution tools

### Model Information

-   `OPENAI_MODELS` - Available OpenAI models configuration

### Execution Tools Classes

-   `OpenAiAssistantExecutionTools` - OpenAI Assistant execution tools class
-   `OpenAiCompatibleExecutionTools` - OpenAI-compatible execution tools class
-   `OpenAiExecutionTools` - Standard OpenAI execution tools class

### Configuration Types

-   `OpenAiAssistantExecutionToolsOptions` - Configuration options for OpenAI Assistant tools (type)
-   `OpenAiCompatibleExecutionToolsOptions` - Configuration options for OpenAI-compatible tools (type)
-   `OpenAiCompatibleExecutionToolsNonProxiedOptions` - Non-proxied configuration options (type)
-   `OpenAiCompatibleExecutionToolsProxiedOptions` - Proxied configuration options (type)
-   `OpenAiExecutionToolsOptions` - Configuration options for standard OpenAI tools (type)

### Provider Registrations

-   `_OpenAiRegistration` - Standard OpenAI provider registration
-   `_OpenAiAssistantRegistration` - OpenAI Assistant provider registration
-   `_OpenAiCompatibleRegistration` - OpenAI-compatible provider registration

> 💡 This package provides OpenAI integration for promptbook applications. For the core functionality, see [@promptbook/core](#-packages) or install all packages with `npm i ptbk`
