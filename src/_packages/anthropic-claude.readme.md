`@promptbook/anthropic-claude` integrates [Anthropic's Claude API](https://console.anthropic.com/) with [Promptbook](https://github.com/webgptorg/promptbook). It provides execution tools for Anthropic's Claude models, enabling seamless integration with the Promptbook ecosystem.

## 🎯 Purpose and Motivation

This package bridges the gap between Promptbook's unified pipeline execution system and Anthropic's powerful Claude language models. It provides a standardized interface for accessing Claude's capabilities while maintaining compatibility with Promptbook's execution framework.

## 🔧 High-Level Functionality

The package offers direct integration with Anthropic's Claude API:

-   **Claude Models**: Support for Claude 2, Claude 3 (Haiku, Sonnet, Opus), and future Claude models
-   **Advanced Reasoning**: Leverage Claude's strong reasoning and analysis capabilities
-   **Long Context**: Take advantage of Claude's extended context window
-   **Safety Features**: Built-in safety and alignment features from Anthropic

## ✨ Key Features

-   🧠 **Advanced AI Models** - Access to Claude's state-of-the-art language models
-   🔄 **Seamless Integration** - Easy integration with other LLM providers in Promptbook
-   📏 **Long Context Support** - Handle large documents and complex conversations
-   🛡️ **Built-in Safety** - Anthropic's constitutional AI approach for safer outputs
-   📊 **Usage Tracking** - Monitor token usage and costs
-   🔧 **Flexible Configuration** - Support for custom endpoints and parameters
-   🚀 **Performance Optimization** - Efficient request handling and caching

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
import { AnthropicClaudeExecutionTools } from '@promptbook/anthropic-claude';

// 🛠 Prepare the tools that will be used to compile and run your books
// Note: Here you can allow or deny some LLM providers, such as not providing DeepSeek for privacy reasons
const fs = $provideFilesystemForNode();
const llm = new AnthropicClaudeExecutionTools(
    //            <- TODO: [🧱] Implement in a functional (not new Class) way
    {
        isVerbose: true,
        apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY,
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
import { AnthropicClaudeExecutionTools } from '@promptbook/anthropic-claude';

// ▶ Prepare multiple tools
const fs = $provideFilesystemForNode();
const llm = [
    // Note: 💕 You can use multiple LLM providers in one Promptbook execution.
    //       The best model will be chosen automatically according to the prompt and the model's capabilities.
    new AnthropicClaudeExecutionTools(
        //            <- TODO: [🧱] Implement in a functional (not new Class) way
        {
            apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY,
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

## 📦 Exported Entities

### Version Information

-   `BOOK_LANGUAGE_VERSION` - Current book language version
-   `PROMPTBOOK_ENGINE_VERSION` - Current engine version

### Model Information

-   `ANTHROPIC_CLAUDE_MODELS` - Available Anthropic Claude models configuration

### Execution Tools Creation Function

-   `createAnthropicClaudeExecutionTools` - Create Anthropic Claude execution tools

### Execution Tools Class

-   `AnthropicClaudeExecutionTools` - Anthropic Claude execution tools class

### Configuration Types

-   `AnthropicClaudeExecutionToolsOptions` - Configuration options for Anthropic Claude tools (type)
-   `AnthropicClaudeExecutionToolsNonProxiedOptions` - Non-proxied configuration options (type)
-   `AnthropicClaudeExecutionToolsProxiedOptions` - Proxied configuration options (type)

### Provider Registration

-   `_AnthropicClaudeRegistration` - Anthropic Claude provider registration

<!-- TODO: [👩‍🚒] Should be this package named `@promptbook/anthropic-claude` or just `@promptbook/anthropic` -->
