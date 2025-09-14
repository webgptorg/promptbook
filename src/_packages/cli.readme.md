CLI utilities for Promptbook that provide command-line tools for building, prettifying, and managing promptbook collections. After installation, you can use the `ptbk` command in your terminal.

## 🎯 Purpose and Motivation

The CLI package provides essential command-line tools for Promptbook development workflows. It enables developers to build optimized promptbook libraries, prettify promptbook files, and manage collections efficiently from the command line, making it easier to integrate Promptbook into development and deployment pipelines.

## 🔧 High-Level Functionality

The package provides command-line tools for:
- **Library Building**: Pre-compile promptbook collections into optimized formats
- **Code Generation**: Generate TypeScript, JavaScript, or JSON libraries
- **Prettification**: Format and enhance promptbook files with diagrams
- **Validation**: Check promptbooks for errors during build time
- **Knowledge Building**: Build RAG (Retrieval-Augmented Generation) knowledge bases
- **Provider Registration**: Include all LLM providers and scrapers for CLI operations

## ✨ Key Features

- 🏗️ **Pre-compilation** - Build optimized promptbook libraries at build time
- 📝 **Code Generation** - Generate TypeScript, JavaScript, or JSON outputs
- 🎨 **Auto-prettification** - Format promptbooks and add Mermaid diagrams
- ✅ **Build-time Validation** - Catch errors early in the development process
- 🧠 **Knowledge Building** - Automatically build RAG knowledge bases
- 🔧 **All Providers Included** - Complete set of LLM providers and scrapers
- 🚀 **Performance Optimization** - Pre-built libraries for faster runtime execution

## Make your Promptbook Library

You can prebuild your own Promptbook library with `ptbk make` command:

```bash
npx ptbk make ./books --format typescript --verbose
```

This will emit `index.ts` with `getPipelineCollection` function file in `books` directory.

Then just use it:

```typescript
import { createPipelineExecutor } from '@promptbook/core';
import { $provideExecutionToolsForNode } from '@promptbook/node';
import { $provideFilesystemForNode } from '@promptbook/node';
import { getPipelineCollection } from './books'; // <- Importing from pre-built library
import { JavascriptExecutionTools } from '@promptbook/javascript';
import { OpenAiExecutionTools } from '@promptbook/openai';

// ▶ Get single Pipeline
const promptbook = await getPipelineCollection().getPipelineByUrl(
    `https://promptbook.studio/my-collection/write-article.book`,
);

// ▶ Create executor - the function that will execute the Pipeline
const pipelineExecutor = createPipelineExecutor({ pipeline, tools: await $provideExecutionToolsForNode() });

// ▶ Prepare input parameters
const inputParameters = { word: 'cat' };

// 🚀▶ Execute the Pipeline
const result = await pipelineExecutor(inputParameters).asPromise({ isCrashedOnError: true });

// ▶ Handle the result
const { isSuccessful, errors, outputParameters, executionReport } = result;
console.info(outputParameters);
```

This is similar to compilation process, during the build time the `ptbk make` command will check promptbooks for errors, convert them to the more optimized format and build knowledge (RAG) for the pipeline collection.

There is also a javascript and json format available.

## Prettify

```bash
npx ptbk prettify 'promptbook/**/*.book'
```

This will prettify all promptbooks in `promptbook` directory and adds Mermaid graphs to them.

## 📦 Exported Entities

### Version Information
- `BOOK_LANGUAGE_VERSION` - Current book language version
- `PROMPTBOOK_ENGINE_VERSION` - Current engine version

### CLI Core
- `_CLI` - Main CLI application implementation

### LLM Provider Registrations
- `_AnthropicClaudeMetadataRegistration` - Anthropic Claude metadata registration
- `_AnthropicClaudeRegistration` - Anthropic Claude provider registration
- `_AzureOpenAiMetadataRegistration` - Azure OpenAI metadata registration
- `_AzureOpenAiRegistration` - Azure OpenAI provider registration
- `_DeepseekMetadataRegistration` - Deepseek metadata registration
- `_DeepseekRegistration` - Deepseek provider registration
- `_GoogleMetadataRegistration` - Google metadata registration
- `_GoogleRegistration` - Google provider registration
- `_OllamaMetadataRegistration` - Ollama metadata registration
- `_OllamaRegistration` - Ollama provider registration
- `_OpenAiMetadataRegistration` - OpenAI metadata registration
- `_OpenAiAssistantMetadataRegistration` - OpenAI Assistant metadata registration
- `_OpenAiCompatibleMetadataRegistration` - OpenAI Compatible metadata registration
- `_OpenAiRegistration` - OpenAI provider registration
- `_OpenAiAssistantRegistration` - OpenAI Assistant provider registration
- `_OpenAiCompatibleRegistration` - OpenAI Compatible provider registration

### Scraper Registrations
- `_BoilerplateScraperRegistration` - Boilerplate scraper registration
- `_BoilerplateScraperMetadataRegistration` - Boilerplate scraper metadata registration
- `_LegacyDocumentScraperRegistration` - Legacy document scraper registration
- `_LegacyDocumentScraperMetadataRegistration` - Legacy document scraper metadata registration
- `_DocumentScraperRegistration` - Document scraper registration
- `_DocumentScraperMetadataRegistration` - Document scraper metadata registration
- `_MarkdownScraperRegistration` - Markdown scraper registration
- `_MarkdownScraperMetadataRegistration` - Markdown scraper metadata registration
- `_MarkitdownScraperRegistration` - Markitdown scraper registration
- `_MarkitdownScraperMetadataRegistration` - Markitdown scraper metadata registration
- `_PdfScraperRegistration` - PDF scraper registration
- `_PdfScraperMetadataRegistration` - PDF scraper metadata registration
- `_WebsiteScraperRegistration` - Website scraper registration
- `_WebsiteScraperMetadataRegistration` - Website scraper metadata registration
