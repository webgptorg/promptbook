<!-- ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten -->

# ✨ Promptbook: AI apps in plain Language

Write AI applications using plain human language across multiple models and platforms.




[![NPM Version of ![Promptbook logo - cube with letters P and B](./design/logo-h1.png) Promptbook](https://badge.fury.io/js/promptbook.svg)](https://www.npmjs.com/package/promptbook)
[![Quality of package ![Promptbook logo - cube with letters P and B](./design/logo-h1.png) Promptbook](https://packagequality.com/shield/promptbook.svg)](https://packagequality.com/#?package=promptbook)
[![Known Vulnerabilities](https://snyk.io/test/github/webgptorg/promptbook/badge.svg)](https://snyk.io/test/github/webgptorg/promptbook)
[![🧪 Test Books](https://github.com/webgptorg/promptbook/actions/workflows/test-books.yml/badge.svg)](https://github.com/webgptorg/promptbook/actions/workflows/test-books.yml)
[![🧪 Test build](https://github.com/webgptorg/promptbook/actions/workflows/test-build.yml/badge.svg)](https://github.com/webgptorg/promptbook/actions/workflows/test-build.yml)
[![🧪 Lint](https://github.com/webgptorg/promptbook/actions/workflows/test-lint.yml/badge.svg)](https://github.com/webgptorg/promptbook/actions/workflows/test-lint.yml)
[![🧪 Spell check](https://github.com/webgptorg/promptbook/actions/workflows/test-spell-check.yml/badge.svg)](https://github.com/webgptorg/promptbook/actions/workflows/test-spell-check.yml)
[![🧪 Test types](https://github.com/webgptorg/promptbook/actions/workflows/test-types.yml/badge.svg)](https://github.com/webgptorg/promptbook/actions/workflows/test-types.yml)
[![Issues](https://img.shields.io/github/issues/webgptorg/promptbook.svg?style=flat)](https://github.com/webgptorg/promptbook/issues)



## 🌟 New Features

-   🚀 **GPT-5 Support** - Now includes OpenAI's most advanced language model with unprecedented reasoning capabilities and 200K context window
-   💡 VS Code support for `.book` files with syntax highlighting and IntelliSense
-   🐳 Official Docker image (`hejny/promptbook`) for seamless containerized usage
-   🔥 Native support for OpenAI `o3-mini`, GPT-4 and other leading LLMs
-   🔍 DeepSeek integration for advanced knowledge search



## 📦 Package `@promptbook/core`

- Promptbooks are [divided into several](#-packages) packages, all are published from [single monorepo](https://github.com/webgptorg/promptbook).
- This package `@promptbook/core` is one part of the promptbook ecosystem.

To install this package, run:

```bash
# Install entire promptbook ecosystem
npm i ptbk

# Install just this package to save space
npm install @promptbook/core
```

The core package contains the fundamental logic and infrastructure for Promptbook. It provides the essential building blocks for creating, parsing, validating, and executing promptbooks, along with comprehensive error handling, LLM provider integrations, and execution utilities.

## 🎯 Purpose and Motivation

The core package serves as the foundation of the Promptbook ecosystem. It abstracts away the complexity of working with different LLM providers, provides a unified interface for prompt execution, and handles all the intricate details of pipeline management, parameter validation, and result processing.

## 🔧 High-Level Functionality

This package orchestrates the entire promptbook execution lifecycle:
- **Pipeline Management**: Parse, validate, and compile promptbook definitions
- **Execution Engine**: Create and manage pipeline executors with comprehensive error handling
- **LLM Integration**: Unified interface for multiple LLM providers (OpenAI, Anthropic, Google, etc.)
- **Parameter Processing**: Template parameter substitution and validation
- **Knowledge Management**: Handle knowledge sources and scraping
- **Storage Abstraction**: Flexible storage backends for caching and persistence
- **Format Support**: Parse and validate various data formats (JSON, CSV, XML)

## ✨ Key Features

- 🚀 **Universal Pipeline Executor** - Execute promptbooks with any supported LLM provider
- 🔄 **Multi-Provider Support** - Seamlessly switch between OpenAI, Anthropic, Google, and other providers
- 📊 **Comprehensive Validation** - Validate promptbooks, parameters, and execution results
- 🎯 **Expectation Checking** - Built-in validation for output format, length, and content expectations
- 🧠 **Knowledge Integration** - Scrape and process knowledge from various sources
- 💾 **Flexible Storage** - Memory, filesystem, and custom storage backends
- 🔧 **Error Handling** - Detailed error types for debugging and monitoring
- 📈 **Usage Tracking** - Monitor token usage, costs, and performance metrics
- 🎨 **Format Parsers** - Support for JSON, CSV, XML, and text formats
- 🔀 **Pipeline Migration** - Upgrade and migrate pipeline definitions

## 📦 Exported Entities

### Version Information
- `BOOK_LANGUAGE_VERSION` - Current book language version
- `PROMPTBOOK_ENGINE_VERSION` - Current engine version

### Agent and Book Management
- `createAgentModelRequirements` - Create model requirements for agents
- `parseAgentSource` - Parse agent source code
- `isValidBook` - Validate book format
- `validateBook` - Comprehensive book validation
- `DEFAULT_BOOK` - Default book template

### Commitment System
- `createEmptyAgentModelRequirements` - Create empty model requirements
- `createBasicAgentModelRequirements` - Create basic model requirements
- `NotYetImplementedCommitmentDefinition` - Placeholder for future commitments
- `getCommitmentDefinition` - Get specific commitment definition
- `getAllCommitmentDefinitions` - Get all available commitment definitions
- `getAllCommitmentTypes` - Get all commitment types
- `isCommitmentSupported` - Check if commitment is supported

### Collection Management
- `collectionToJson` - Convert collection to JSON
- `createCollectionFromJson` - Create collection from JSON data
- `createCollectionFromPromise` - Create collection from async source
- `createCollectionFromUrl` - Create collection from URL
- `createSubcollection` - Create filtered subcollection

### Configuration Constants
- `NAME` - Project name
- `ADMIN_EMAIL` - Administrator email
- `ADMIN_GITHUB_NAME` - GitHub username
- `CLAIM` - Project claim/tagline
- `DEFAULT_BOOK_TITLE` - Default book title
- `DEFAULT_TASK_TITLE` - Default task title
- `DEFAULT_PROMPT_TASK_TITLE` - Default prompt task title
- `DEFAULT_BOOK_OUTPUT_PARAMETER_NAME` - Default output parameter name
- `DEFAULT_MAX_FILE_SIZE` - Maximum file size limit
- `BIG_DATASET_TRESHOLD` - Threshold for large datasets
- `FAILED_VALUE_PLACEHOLDER` - Placeholder for failed values
- `PENDING_VALUE_PLACEHOLDER` - Placeholder for pending values
- `MAX_FILENAME_LENGTH` - Maximum filename length
- `DEFAULT_INTERMEDIATE_FILES_STRATEGY` - Strategy for intermediate files
- `DEFAULT_MAX_PARALLEL_COUNT` - Maximum parallel executions
- `DEFAULT_MAX_EXECUTION_ATTEMPTS` - Maximum execution attempts
- `DEFAULT_MAX_KNOWLEDGE_SOURCES_SCRAPING_DEPTH` - Knowledge scraping depth limit
- `DEFAULT_MAX_KNOWLEDGE_SOURCES_SCRAPING_TOTAL` - Knowledge scraping total limit
- `DEFAULT_BOOKS_DIRNAME` - Default books directory name
- `DEFAULT_DOWNLOAD_CACHE_DIRNAME` - Default download cache directory
- `DEFAULT_EXECUTION_CACHE_DIRNAME` - Default execution cache directory
- `DEFAULT_SCRAPE_CACHE_DIRNAME` - Default scrape cache directory
- `CLI_APP_ID` - CLI application identifier
- `PLAYGROUND_APP_ID` - Playground application identifier
- `DEFAULT_PIPELINE_COLLECTION_BASE_FILENAME` - Default collection filename
- `DEFAULT_REMOTE_SERVER_URL` - Default remote server URL
- `DEFAULT_CSV_SETTINGS` - Default CSV parsing settings
- `DEFAULT_IS_VERBOSE` - Default verbosity setting
- `SET_IS_VERBOSE` - Verbosity setter
- `DEFAULT_IS_AUTO_INSTALLED` - Default auto-install setting
- `DEFAULT_TASK_SIMULATED_DURATION_MS` - Default task simulation duration
- `DEFAULT_GET_PIPELINE_COLLECTION_FUNCTION_NAME` - Default collection function name
- `DEFAULT_MAX_REQUESTS_PER_MINUTE` - Rate limiting configuration
- `API_REQUEST_TIMEOUT` - API request timeout
- `PROMPTBOOK_LOGO_URL` - Official logo URL

### Model and Provider Constants
- `MODEL_TRUST_LEVELS` - Trust levels for different models
- `MODEL_ORDERS` - Ordering preferences for models
- `ORDER_OF_PIPELINE_JSON` - JSON property ordering
- `RESERVED_PARAMETER_NAMES` - Reserved parameter names

### Pipeline Processing
- `compilePipeline` - Compile pipeline from source
- `parsePipeline` - Parse pipeline definition
- `pipelineJsonToString` - Convert pipeline JSON to string
- `prettifyPipelineString` - Format pipeline string
- `extractParameterNamesFromTask` - Extract parameter names
- `validatePipeline` - Validate pipeline structure

### Dialog and Interface Tools
- `CallbackInterfaceTools` - Callback-based interface tools
- `CallbackInterfaceToolsOptions` - Options for callback tools (type)

### Error Handling
- `BoilerplateError` - Base error class
- `PROMPTBOOK_ERRORS` - All error types registry
- `AbstractFormatError` - Abstract format validation error
- `AuthenticationError` - Authentication failure error
- `CollectionError` - Collection-related error
- `EnvironmentMismatchError` - Environment compatibility error
- `ExpectError` - Expectation validation error
- `KnowledgeScrapeError` - Knowledge scraping error
- `LimitReachedError` - Resource limit error
- `MissingToolsError` - Missing tools error
- `NotFoundError` - Resource not found error
- `NotYetImplementedError` - Feature not implemented error
- `ParseError` - Parsing error
- `PipelineExecutionError` - Pipeline execution error
- `PipelineLogicError` - Pipeline logic error
- `PipelineUrlError` - Pipeline URL error
- `PromptbookFetchError` - Fetch operation error
- `UnexpectedError` - Unexpected error
- `WrappedError` - Wrapped error container

### Execution Engine
- `createPipelineExecutor` - Create pipeline executor
- `computeCosineSimilarity` - Compute cosine similarity for embeddings
- `embeddingVectorToString` - Convert embedding vector to string
- `executionReportJsonToString` - Convert execution report to string
- `ExecutionReportStringOptions` - Report formatting options (type)
- `ExecutionReportStringOptionsDefaults` - Default report options

### Usage and Metrics
- `addUsage` - Add usage metrics
- `isPassingExpectations` - Check if expectations are met
- `ZERO_VALUE` - Zero usage value constant
- `UNCERTAIN_ZERO_VALUE` - Uncertain zero value constant
- `ZERO_USAGE` - Zero usage object
- `UNCERTAIN_USAGE` - Uncertain usage object
- `usageToHuman` - Convert usage to human-readable format
- `usageToWorktime` - Convert usage to work time estimate

### Format Parsers
- `CsvFormatError` - CSV format error
- `CsvFormatParser` - CSV format parser
- `MANDATORY_CSV_SETTINGS` - Required CSV settings
- `TextFormatParser` - Text format parser

### Form Factor Definitions
- `BoilerplateFormfactorDefinition` - Boilerplate form factor
- `ChatbotFormfactorDefinition` - Chatbot form factor
- `CompletionFormfactorDefinition` - Completion form factor
- `GeneratorFormfactorDefinition` - Generator form factor
- `GenericFormfactorDefinition` - Generic form factor
- `ImageGeneratorFormfactorDefinition` - Image generator form factor
- `FORMFACTOR_DEFINITIONS` - All form factor definitions
- `MatcherFormfactorDefinition` - Matcher form factor
- `SheetsFormfactorDefinition` - Sheets form factor
- `TranslatorFormfactorDefinition` - Translator form factor

### LLM Provider Integration
- `filterModels` - Filter available models
- `$llmToolsMetadataRegister` - LLM tools metadata registry
- `$llmToolsRegister` - LLM tools registry
- `createLlmToolsFromConfiguration` - Create tools from config
- `cacheLlmTools` - Cache LLM tools
- `countUsage` - Count total usage
- `limitTotalUsage` - Limit total usage
- `joinLlmExecutionTools` - Join multiple LLM tools
- `MultipleLlmExecutionTools` - Multiple LLM tools container

### Provider Registrations
- `_AnthropicClaudeMetadataRegistration` - Anthropic Claude registration
- `_AzureOpenAiMetadataRegistration` - Azure OpenAI registration
- `_DeepseekMetadataRegistration` - Deepseek registration
- `_GoogleMetadataRegistration` - Google registration
- `_OllamaMetadataRegistration` - Ollama registration
- `_OpenAiMetadataRegistration` - OpenAI registration
- `_OpenAiAssistantMetadataRegistration` - OpenAI Assistant registration
- `_OpenAiCompatibleMetadataRegistration` - OpenAI Compatible registration

### Pipeline Management
- `migratePipeline` - Migrate pipeline to newer version
- `preparePersona` - Prepare persona for execution
- `book` - Book notation utilities
- `isValidPipelineString` - Validate pipeline string
- `GENERIC_PIPELINE_INTERFACE` - Generic pipeline interface
- `getPipelineInterface` - Get pipeline interface
- `isPipelineImplementingInterface` - Check interface implementation
- `isPipelineInterfacesEqual` - Compare pipeline interfaces
- `EXPECTATION_UNITS` - Units for expectations
- `validatePipelineString` - Validate pipeline string format

### Pipeline Preparation
- `isPipelinePrepared` - Check if pipeline is prepared
- `preparePipeline` - Prepare pipeline for execution
- `unpreparePipeline` - Unprepare pipeline

### Remote Server Integration
- `identificationToPromptbookToken` - Convert ID to token
- `promptbookTokenToIdentification` - Convert token to ID

### Knowledge Scraping
- `_BoilerplateScraperMetadataRegistration` - Boilerplate scraper registration
- `prepareKnowledgePieces` - Prepare knowledge pieces
- `$scrapersMetadataRegister` - Scrapers metadata registry
- `$scrapersRegister` - Scrapers registry
- `makeKnowledgeSourceHandler` - Create knowledge source handler
- `promptbookFetch` - Fetch with promptbook context
- `_LegacyDocumentScraperMetadataRegistration` - Legacy document scraper
- `_DocumentScraperMetadataRegistration` - Document scraper registration
- `_MarkdownScraperMetadataRegistration` - Markdown scraper registration
- `_MarkitdownScraperMetadataRegistration` - Markitdown scraper registration
- `_PdfScraperMetadataRegistration` - PDF scraper registration
- `_WebsiteScraperMetadataRegistration` - Website scraper registration

### Storage Backends
- `BlackholeStorage` - Blackhole storage (discards data)
- `MemoryStorage` - In-memory storage
- `PrefixStorage` - Prefixed storage wrapper

### Type Definitions
- `MODEL_VARIANTS` - Available model variants
- `NonTaskSectionTypes` - Non-task section types
- `SectionTypes` - All section types
- `TaskTypes` - Task types

### Server Configuration
- `REMOTE_SERVER_URLS` - Remote server URLs

> 💡 This package does not make sense on its own, look at [all promptbook packages](#-packages) or just install all by `npm i ptbk`


---

Rest of the documentation is common for **entire promptbook ecosystem**:




## 🤍 The Book Abstract

**It's time for a paradigm shift! The future of software is written in plain English, French, or Latin.**

During the computer revolution, we have seen [multiple generations of computer languages](https://github.com/webgptorg/promptbook/discussions/180), from the physical rewiring of the vacuum tubes through low-level machine code to the high-level languages like Python or JavaScript. And now, we're on the edge of the **next revolution**!

It's a revolution of writing software in **plain human language** that is understandable and executable by both humans and machines – and it's going to change everything!

The incredible growth in power of microprocessors and the Moore's Law have been the driving force behind the ever-more powerful languages, and it's been an amazing journey! Similarly, the large language models (like GPT or Claude) are the next big thing in language technology, and they're set to transform the way we interact with computers.

This shift will happen whether we're ready or not. Our mission is to make it excellent, not just good.

**Join us in this journey!**






## 🚀 Get started

Take a look at the simple starter kit with books integrated into the **Hello World** sample applications:

-   [Hello Book](https://github.com/webgptorg/hello-world)
-   [Hello Book in Node.js](https://github.com/webgptorg/hello-world-node-js)
-   [Hello Book in Next.js](https://github.com/webgptorg/hello-world-next-js)






## 💜 The Promptbook Project

Promptbook project is ecosystem of multiple projects and tools, following is a list of most important pieces of the project:

<table>
  <thead>
    <tr>
      <th>Project</th>
      <th>About</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="https://github.com/webgptorg/book">Book language</a></td>
      <td>
          Book is a human-understandable markup language for writing AI applications such as chatbots, knowledge bases, agents, avarars, translators, automations and more.
          <hr>
          There is also <a href="https://github.com/webgptorg/book-extension">a plugin for VSCode</a> to support <code>.book</code> file extension
      </td>
    </tr>
    <tr>
      <td><a href="https://github.com/webgptorg/promptbook">Promptbook Engine</a></td>
      <td>
          Promptbook engine can run applications written in Book language. It is released as <a href="https://www.npmjs.com/package/@promptbook/core#-packages-for-developers">multiple NPM packages</a> and <a href="https://hub.docker.com/r/hejny/promptbook">Docker HUB</a>
      </td>
    </tr>
    <tr>
      <td><a href="https://promptbook.studio">Promptbook Studio</a></td>
      <td>
          Promptbook.studio is a web-based editor and runner for book applications. It is still in the experimental MVP stage.
      </td>
    </tr>
  </tbody>
</table>

Hello world examples:

-   [Hello world](https://github.com/webgptorg/hello-world)
-   [Hello world in Node.js](https://github.com/webgptorg/hello-world-node-js)
-   [Hello world in Next.js](https://github.com/webgptorg/hello-world-next-js)

### 🌐 Community & Social Media

Join our growing community of developers and users:

<table>
  <thead>
    <tr>
      <th>Platform</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="https://discord.gg/x3QWNaa89N">💬 Discord</a></td>
      <td>Join our active developer community for discussions and support</td>
    </tr>
    <tr>
      <td><a href="https://github.com/webgptorg/promptbook/discussions">🗣️ GitHub Discussions</a></td>
      <td>Technical discussions, feature requests, and community Q&A</td>
    </tr>
    <tr>
      <td><a href="https://linkedin.com/company/promptbook">👔 LinkedIn</a></td>
      <td>Professional updates and industry insights</td>
    </tr>
    <tr>
      <td><a href="https://www.facebook.com/61560776453536">📱 Facebook</a></td>
      <td>General announcements and community engagement</td>
    </tr>
    <tr>
      <td><a href="https://ptbk.io">🔗 ptbk.io</a></td>
      <td>Official landing page with project information</td>
    </tr>
  </tbody>
</table>

### 🖼️ Product & Brand Channels

#### Promptbook.studio

<table>
  <tbody>
    <tr>
      <td><a href="https://www.instagram.com/promptbook.studio/">📸 Instagram @promptbook.studio</a></td>
      <td>Visual updates, UI showcases, and design inspiration</td>
    </tr>
    
  </tbody>
</table>






## 📘 Book Language Blueprint

_A concise, Markdown-based DSL for crafting AI workflows and automations._

### Introduction

Book is a Markdown-based language that simplifies the creation of AI applications, workflows, and automations. With human-readable commands, you can define inputs, outputs, personas, knowledge sources, and actions—without needing model-specific details.

### Example

```book
# 🌟 My First Book

-   BOOK VERSION 1.0.0
-   URL https://promptbook.studio/hello.book
-   INPUT PARAMETER {topic}
-   OUTPUT PARAMETER {article}

# Write an Article

-   PERSONA Jane, marketing specialist with prior experience in tech and AI writing
-   KNOWLEDGE https://wikipedia.org/
-   KNOWLEDGE ./journalist-ethics.pdf
-   EXPECT MIN 1 Sentence
-   EXPECT MAX 5 Pages

> Write an article about {topic}

→ {article}
```

Each part of the book defines one of three circles:

### **1. What:** Workflows, Tasks and Parameters

What work needs to be done. Each book defines a [workflow _(scenario or pipeline)_](https://github.com/webgptorg/promptbook/discussions/88), which is one or more tasks. Each workflow has a fixed input and output. For example, you have a book that generates an article from a topic. Once it generates an article about AI, once about marketing, once about cooking. The workflow (= your AI program) is the same, only the input and output change.

**Related commands:**

-   [PARAMETER](https://github.com/webgptorg/promptbook/blob/main/documents/commands/PARAMETER.md)

### **2. Who:** Personas

Who does the work. Each task is performed by a persona. A persona is a description of your virtual employee. It is a higher abstraction than the model, tokens, temperature, top-k, top-p and other model parameters.

You can describe what you want in human language like `Jane, creative writer with a sense of sharp humour` instead of `gpt-4-2024-13-31, temperature 1.2, top-k 40, STOP token ".\n",...`.

Personas can have access to different knowledge, tools and actions. They can also consult their work with other personas or user, if allowed.

**Related commands:**

-   [PERSONA](https://github.com/webgptorg/promptbook/blob/main/documents/commands/PERSONA.md)

### **3. How:** Knowledge, Instruments and Actions

The resources used by the personas are used to do the work.

**Related commands:**

-   [KNOWLEDGE](https://github.com/webgptorg/promptbook/blob/main/documents/commands/KNOWLEDGE.md) of documents, websites, and other resources
-   [INSTRUMENT](https://github.com/webgptorg/promptbook/blob/main/documents/commands/INSTRUMENT.md) for real-time data like time, location, weather, stock prices, searching the internet, calculations, etc.
-   [ACTION](https://github.com/webgptorg/promptbook/blob/main/documents/commands/ACTION.md) for actions like sending emails, creating files, ending a workflow, etc.

### General Principles

Book language is based on markdown. It is subset of markdown. It is designed to be easy to read and write. It is designed to be understandable by both humans and machines and without specific knowledge of the language.

The file has a `.book` extension and uses UTF-8 encoding without BOM.

Books have two variants: flat — just a prompt without structure, and full — with tasks, commands, and prompts.

As it is source code, it can leverage all the features of version control systems like git and does not suffer from the problems of binary formats, proprietary formats, or no-code solutions.

But unlike programming languages, it is designed to be understandable by non-programmers and non-technical people.



## 📚 Documentation

See detailed guides and API reference in the [docs](https://github.com/webgptorg/promptbook/discussions/categories/concepts) or [online](https://discord.gg/x3QWNaa89N).

## 🔒 Security

For information on reporting security vulnerabilities, see our [Security Policy](./SECURITY.md).

## 📦 Packages _(for developers)_

This library is divided into several packages, all are published from [single monorepo](https://github.com/webgptorg/promptbook).
You can install all of them at once:

```bash
npm i ptbk
```

Or you can install them separately:

> ⭐ Marked packages are worth to try first

-   ⭐ **[ptbk](https://www.npmjs.com/package/ptbk)** - Bundle of all packages, when you want to install everything and you don't care about the size
-   **[promptbook](https://www.npmjs.com/package/promptbook)** - Same as `ptbk`
-   ⭐🧙‍♂️ **[@promptbook/wizard](https://www.npmjs.com/package/@promptbook/wizard)** - Wizard to just run the books in node without any struggle
-   **[@promptbook/core](https://www.npmjs.com/package/@promptbook/core)** - Core of the library, it contains the main logic for promptbooks
-   **[@promptbook/node](https://www.npmjs.com/package/@promptbook/node)** - Core of the library for Node.js environment
-   **[@promptbook/browser](https://www.npmjs.com/package/@promptbook/browser)** - Core of the library for browser environment
-   ⭐ **[@promptbook/utils](https://www.npmjs.com/package/@promptbook/utils)** - Utility functions used in the library but also useful for individual use in preprocessing and postprocessing LLM inputs and outputs
-   **[@promptbook/markdown-utils](https://www.npmjs.com/package/@promptbook/markdown-utils)** - Utility functions used for processing markdown
-   _(Not finished)_ **[@promptbook/wizard](https://www.npmjs.com/package/@promptbook/wizard)** - Wizard for creating+running promptbooks in single line
-   **[@promptbook/javascript](https://www.npmjs.com/package/@promptbook/javascript)** - Execution tools for javascript inside promptbooks
-   **[@promptbook/openai](https://www.npmjs.com/package/@promptbook/openai)** - Execution tools for OpenAI API, wrapper around OpenAI SDK
-   **[@promptbook/anthropic-claude](https://www.npmjs.com/package/@promptbook/anthropic-claude)** - Execution tools for Anthropic Claude API, wrapper around Anthropic Claude SDK 
-   **[@promptbook/vercel](https://www.npmjs.com/package/@promptbook/vercel)** - Adapter for Vercel functionalities
-   **[@promptbook/google](https://www.npmjs.com/package/@promptbook/google)** - Integration with Google's Gemini API
-   **[@promptbook/deepseek](https://www.npmjs.com/package/@promptbook/deepseek)** - Integration with [DeepSeek API](https://www.deepseek.com/)
-   **[@promptbook/ollama](https://www.npmjs.com/package/@promptbook/ollama)** - Integration with [Ollama](https://ollama.com/) API
-   **[@promptbook/azure-openai](https://www.npmjs.com/package/@promptbook/azure-openai)** - Execution tools for Azure OpenAI API

-   **[@promptbook/fake-llm](https://www.npmjs.com/package/@promptbook/fake-llm)** - Mocked execution tools for testing the library and saving the tokens
-   **[@promptbook/remote-client](https://www.npmjs.com/package/@promptbook/remote-client)** - Remote client for remote execution of promptbooks
-   **[@promptbook/remote-server](https://www.npmjs.com/package/@promptbook/remote-server)** - Remote server for remote execution of promptbooks
-   **[@promptbook/pdf](https://www.npmjs.com/package/@promptbook/pdf)** - Read knowledge from `.pdf` documents
-   **[@promptbook/documents](https://www.npmjs.com/package/@promptbook/markitdown)** - Integration of [Markitdown by Microsoft](https://github.com/microsoft/markitdown)
-   **[@promptbook/documents](https://www.npmjs.com/package/@promptbook/documents)** - Read knowledge from documents like `.docx`, `.odt`,…
-   **[@promptbook/legacy-documents](https://www.npmjs.com/package/@promptbook/legacy-documents)** - Read knowledge from legacy documents like `.doc`, `.rtf`,…
-   **[@promptbook/website-crawler](https://www.npmjs.com/package/@promptbook/website-crawler)** - Crawl knowledge from the web
-   **[@promptbook/editable](https://www.npmjs.com/package/@promptbook/editable)** - Editable book as native javascript object with imperative object API
-   **[@promptbook/templates](https://www.npmjs.com/package/@promptbook/templates)** - Useful templates and examples of books which can be used as a starting point
-   **[@promptbook/types](https://www.npmjs.com/package/@promptbook/types)** - Just typescript types used in the library
-   **[@promptbook/color](https://www.npmjs.com/package/@promptbook/color)** - Color manipulation library
-   ⭐ **[@promptbook/cli](https://www.npmjs.com/package/@promptbook/cli)** - Command line interface utilities for promptbooks
-   🐋 **[Docker image](https://hub.docker.com/r/hejny/promptbook/)** - Promptbook server






## 📚 Dictionary

The following glossary is used to clarify certain concepts:

### General LLM / AI terms

-   **Prompt drift** is a phenomenon where the AI model starts to generate outputs that are not aligned with the original prompt. This can happen due to the model's training data, the prompt's wording, or the model's architecture.
-   [**Pipeline, workflow scenario or chain** is a sequence of tasks that are executed in a specific order. In the context of AI, a pipeline can refer to a sequence of AI models that are used to process data.](https://github.com/webgptorg/promptbook/discussions/88)
-   **Fine-tuning** is a process where a pre-trained AI model is further trained on a specific dataset to improve its performance on a specific task.
-   **Zero-shot learning** is a machine learning paradigm where a model is trained to perform a task without any labeled examples. Instead, the model is provided with a description of the task and is expected to generate the correct output.
-   **Few-shot learning** is a machine learning paradigm where a model is trained to perform a task with only a few labeled examples. This is in contrast to traditional machine learning, where models are trained on large datasets.
-   **Meta-learning** is a machine learning paradigm where a model is trained on a variety of tasks and is able to learn new tasks with minimal additional training. This is achieved by learning a set of meta-parameters that can be quickly adapted to new tasks.
-   **Retrieval-augmented generation** is a machine learning paradigm where a model generates text by retrieving relevant information from a large database of text. This approach combines the benefits of generative models and retrieval models.
-   **Longtail** refers to non-common or rare events, items, or entities that are not well-represented in the training data of machine learning models. Longtail items are often challenging for models to predict accurately.

_Note: This section is not a complete dictionary, more list of general AI / LLM terms that has connection with Promptbook_

### 💯 Core concepts

-   [📚 Collection of pipelines](https://github.com/webgptorg/promptbook/discussions/65)
-   [📯 Pipeline](https://github.com/webgptorg/promptbook/discussions/64)
-   [🙇‍♂️ Tasks and pipeline sections](https://github.com/webgptorg/promptbook/discussions/88)
-   [🤼 Personas](https://github.com/webgptorg/promptbook/discussions/22)
-   [⭕ Parameters](https://github.com/webgptorg/promptbook/discussions/83)
-   [🚀 Pipeline execution](https://github.com/webgptorg/promptbook/discussions/84)
-   [🧪 Expectations](https://github.com/webgptorg/promptbook/discussions/30) - Define what outputs should look like and how they're validated
-   [✂️ Postprocessing](https://github.com/webgptorg/promptbook/discussions/31) - How outputs are refined after generation
-   [🔣 Words not tokens](https://github.com/webgptorg/promptbook/discussions/29) - The human-friendly way to think about text generation
-   [☯ Separation of concerns](https://github.com/webgptorg/promptbook/discussions/32) - How Book language organizes different aspects of AI workflows

### Advanced concepts

<table>
  <tr>
    <th>Data & Knowledge Management</th>
    <th>Pipeline Control</th>
  </tr>
  <tr>
    <td>
      <ul>
        <li><a href="https://github.com/webgptorg/promptbook/discussions/41">📚 Knowledge (RAG)</a> - Retrieve and use external information</li>
        <li><a href="https://github.com/webgptorg/promptbook/discussions/54">📽 Media handling</a> - Working with images, audio, video, spreadsheets</li>
        <li><a href="https://github.com/webgptorg/promptbook/discussions/40">🔴 Anomaly detection</a> - Identifying unusual patterns or outputs</li>
      </ul>
    </td>
    <td>
      <ul>
        <li><a href="https://github.com/webgptorg/promptbook/discussions/89">🌏 Remote server</a> - Executing workflows on remote infrastructure</li>
        <li><a href="https://github.com/webgptorg/promptbook/discussions/66">🃏 Jokers (conditions)</a> - Adding conditional logic to workflows</li>
        <li><a href="https://github.com/webgptorg/promptbook/discussions/35">🔳 Metaprompting</a> - Creating prompts that generate other prompts</li>
      </ul>
    </td>
  </tr>
  <tr>
    <th>Language & Output Control</th>
    <th>Advanced Generation</th>
  </tr>
  <tr>
    <td>
      <ul>
        <li><a href="https://github.com/webgptorg/promptbook/discussions/53">🌏 Linguistically typed languages</a> - Type systems for natural language</li>
        <li><a href="https://github.com/webgptorg/promptbook/discussions/42">🌍 Auto-Translations</a> - Automatic multilingual support</li>
        <li><a href="https://github.com/webgptorg/promptbook/discussions/39">👮 Agent adversary expectations</a> - Safety and control mechanisms</li>
      </ul>
    </td>
    <td>
      <ul>
        <li><a href="https://github.com/webgptorg/promptbook/discussions/37">🔙 Expectation-aware generation</a> - Outputs that meet defined criteria</li>
        <li><a href="https://github.com/webgptorg/promptbook/discussions/33">⏳ Just-in-time fine-tuning</a> - Dynamic model adaptation</li>
      </ul>
    </td>
  </tr>
</table>

<p align="center"><a href="https://github.com/webgptorg/promptbook/discussions/categories/concepts">🔍 View more concepts</a></p>



## 🚂 Promptbook Engine

![Schema of Promptbook Engine](./documents/promptbook-engine.svg)

## ➕➖ When to use Promptbook?

### ➕ When to use

-   When you are writing app that generates complex things via LLM - like **websites, articles, presentations, code, stories, songs**,...
-   When you want to **separate code from text prompts**
-   When you want to describe **complex prompt pipelines** and don't want to do it in the code
-   When you want to **orchestrate multiple prompts** together
-   When you want to **reuse** parts of prompts in multiple places
-   When you want to **version** your prompts and **test multiple versions**
-   When you want to **log** the execution of prompts and backtrace the issues

[See more](https://github.com/webgptorg/promptbook/discussions/111)

### ➖ When not to use

-   When you have already implemented single simple prompt and it works fine for your job
-   When [OpenAI Assistant (GPTs)](https://help.openai.com/en/articles/8673914-gpts-vs-assistants) is enough for you
-   When you need streaming _(this may be implemented in the future, [see discussion](https://github.com/webgptorg/promptbook/discussions/102))_.
-   When you need to use something other than JavaScript or TypeScript _(other languages are on the way, [see the discussion](https://github.com/webgptorg/promptbook/discussions/101))_
-   When your main focus is on something other than text - like images, audio, video, spreadsheets _(other media types may be added in the future, [see discussion](https://github.com/webgptorg/promptbook/discussions/103))_
-   When you need to use recursion _([see the discussion](https://github.com/webgptorg/promptbook/discussions/38))_

[See more](https://github.com/webgptorg/promptbook/discussions/112)

## 🐜 Known issues

-   [🤸‍♂️ Iterations not working yet](https://github.com/webgptorg/promptbook/discussions/55)
-   [⤵️ Imports not working yet](https://github.com/webgptorg/promptbook/discussions/34)

## 🧼 Intentionally not implemented features

-   [➿ No recursion](https://github.com/webgptorg/promptbook/discussions/38)
-   [🏳 There are no types, just strings](https://github.com/webgptorg/promptbook/discussions/52)

## ❔ FAQ

If you have a question [start a discussion](https://github.com/webgptorg/promptbook/discussions/), [open an issue](https://github.com/webgptorg/promptbook/issues) or [write me an email](https://www.pavolhejny.com/contact).

-   [❔ Why not just use the OpenAI SDK / Anthropic Claude SDK / ...?](https://github.com/webgptorg/promptbook/discussions/114)
-   [❔ How is it different from the OpenAI`s GPTs?](https://github.com/webgptorg/promptbook/discussions/118)
-   [❔ How is it different from the Langchain?](https://github.com/webgptorg/promptbook/discussions/115)
-   [❔ How is it different from the DSPy?](https://github.com/webgptorg/promptbook/discussions/117)
-   [❔ How is it different from _anything_?](https://github.com/webgptorg/promptbook/discussions?discussions_q=is%3Aopen+label%3A%22Promptbook+vs%22)
-   [❔ Is Promptbook using RAG _(Retrieval-Augmented Generation)_?](https://github.com/webgptorg/promptbook/discussions/123)
-   [❔ Is Promptbook using function calling?](https://github.com/webgptorg/promptbook/discussions/124)

## 📅 Changelog

See [CHANGELOG.md](./CHANGELOG.md)

## 📜 License

This project is licensed under [BUSL 1.1](./LICENSE.md).

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

You can also ⭐ star the project, [follow us on GitHub](https://github.com/hejny) or [various other social networks](https://www.pavolhejny.com/contact/).We are open to [pull requests, feedback, and suggestions](./CONTRIBUTING.md).

## 🆘 Support & Community

Need help with Book language? We're here for you!

-   💬 [Join our Discord community](https://discord.gg/x3QWNaa89N) for real-time support
-   📝 [Browse our GitHub discussions](https://github.com/webgptorg/promptbook/discussions) for FAQs and community knowledge
-   🐛 [Report issues](https://github.com/webgptorg/book/issues) for bugs or feature requests
-   📚 Visit [ptbk.io](https://ptbk.io) for more resources and documentation
-   📧 Contact us directly through the channels listed in our [signpost](./SIGNPOST.md)

We welcome contributions and feedback to make Book language better for everyone!