<!-- ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten -->

# ✨ Promptbook: AI Agents

Turn your company's scattered knowledge into AI ready Books






[![NPM Version of ![Promptbook logo](./design/logo-h1.png) Promptbook](https://badge.fury.io/js/promptbook.svg)](https://www.npmjs.com/package/promptbook)
[![Quality of package ![Promptbook logo](./design/logo-h1.png) Promptbook](https://packagequality.com/shield/promptbook.svg)](https://packagequality.com/#?package=promptbook)
[![Known Vulnerabilities](https://snyk.io/test/github/webgptorg/promptbook/badge.svg)](https://snyk.io/test/github/webgptorg/promptbook)
[![🧪 Test Books](https://github.com/webgptorg/promptbook/actions/workflows/test-books.yml/badge.svg)](https://github.com/webgptorg/promptbook/actions/workflows/test-books.yml)
[![🧪 Test build](https://github.com/webgptorg/promptbook/actions/workflows/test-build.yml/badge.svg)](https://github.com/webgptorg/promptbook/actions/workflows/test-build.yml)
[![🧪 Lint](https://github.com/webgptorg/promptbook/actions/workflows/test-lint.yml/badge.svg)](https://github.com/webgptorg/promptbook/actions/workflows/test-lint.yml)
[![🧪 Spell check](https://github.com/webgptorg/promptbook/actions/workflows/test-spell-check.yml/badge.svg)](https://github.com/webgptorg/promptbook/actions/workflows/test-spell-check.yml)
[![🧪 Test types](https://github.com/webgptorg/promptbook/actions/workflows/test-types.yml/badge.svg)](https://github.com/webgptorg/promptbook/actions/workflows/test-types.yml)
[![Issues](https://img.shields.io/github/issues/webgptorg/promptbook.svg?style=flat)](https://github.com/webgptorg/promptbook/issues)



## 🌟 New Features

-   **Gemini 3 Support**



<blockquote style="color: #ff8811">
    <b>⚠ Warning:</b> This is a pre-release version of the library. It is not yet ready for production use. Please look at <a href="https://www.npmjs.com/package/@promptbook/core?activeTab=versions">latest stable release</a>.
</blockquote>

## 📦 Package `@promptbook/cli`

- Promptbooks are [divided into several](#-packages) packages, all are published from [single monorepo](https://github.com/webgptorg/promptbook).
- This package `@promptbook/cli` is one part of the promptbook ecosystem.

To install this package, run:

```bash
# Install entire promptbook ecosystem
npm i ptbk

# Install as dev dependency
npm install --save-dev @promptbook/cli

# Or install globally
npm install --global @promptbook/cli
```

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


---

Rest of the documentation is common for **entire promptbook ecosystem**:




## 📖 The Book Whitepaper

Nowadays, the biggest challenge for most business applications isn't the raw capabilities of AI models. Large language models such as GPT-5.2 and Claude-4.5 are incredibly capable.

The main challenge lies in **managing the context**, providing rules and knowledge, and narrowing the personality.

In Promptbook, you can define your context **using simple Books** that are very explicit, easy to understand and write, reliable, and highly portable.

<table style="border: 1px solid #777; border-radius: 10px;"><tr><td>

**<ins>Paul Smith</ins>**<br/>
<br/>
**PERSONA** You are a company lawyer.<br/>
Your job is to provide legal advice and support to the company and its employees.<br/>
**RULE** You are knowledgeable, professional, and detail-oriented.<br/>
TEAM You are part of the legal team of Paul Smith & Associés, you discuss with {Emily White}, the head of the compliance department. {George Brown} is expert in corporate law and {Sophia Black} is expert in labor law.<br/>

</td></tr></table>

<div style="page-break-after: always;"></div>

### Aspects of great AI agent

We have created a language called **Book**, which allows you to write AI agents in their native language and create your own AI persona. Book provides a guide to define all the traits and commitments.

You can look at it as "prompting" _(or writing a system message)_, but decorated by **commitments**.

**Commitments** are special syntax elements that define contracts between you and the AI agent. They are transformed by Promptbook Engine into low-level parameters like which model to use, its temperature, system message, RAG index, MCP servers, and many other parameters. For some commitments _(for example `RULE` commitment)_ Promptbook Engine can even create adversary agents and extra checks to enforce the rules.

#### `Persona` commitment

Personas define the character of your AI persona, its role, and how it should interact with users. It sets the tone and style of communication.

<table style="border: 1px solid #777; border-radius: 10px;"><tr><td>

**<ins>Paul Smith & Associés</ins>**<br/>
<br/>
**PERSONA** You are a company lawyer.<br/>

</td></tr></table>

#### `Knowledge` commitment

Knowledge Commitment allows you to provide specific information, facts, or context that the AI should be aware of when responding.

This can include domain-specific knowledge, company policies, or any other relevant information.

Promptbook Engine will automatically enforce this knowledge during interactions. When the knowledge is short enough, it will be included in the prompt. When it is too long, it will be stored in vector databases and RAG retrieved when needed. But you don't need to care about it.

<table style="border: 1px solid #777; border-radius: 10px;"><tr><td>

**<ins>Paul Smith & Associés</ins>**<br/>
<br/>
**PERSONA** You are a company lawyer.<br/>
Your job is to provide legal advice and support to the company and its employees.<br/>
You are knowledgeable, professional, and detail-oriented.<br/>
<br/>
**KNOWLEDGE**  https://company.com/company-policies.pdf<br/>
**KNOWLEDGE** https://company.com/internal-documents/employee-handbook.docx<br/>

</td></tr></table>

#### `Rule` commitment

Rules will enforce specific behaviors or constraints on the AI's responses. This can include ethical guidelines, communication styles, or any other rules you want the AI to follow.

Depending on rule strictness, Promptbook will either propagate it to the prompt or use other techniques, like adversary agent, to enforce it.

<table style="border: 1px solid #777; border-radius: 10px;"><tr><td>

**<ins>Paul Smith & Associés</ins>**<br/>
<br/>
**PERSONA** You are a company lawyer.<br/>
Your job is to provide legal advice and support to the company and its employees.<br/>
You are knowledgeable, professional, and detail-oriented.<br/>
<br/>
**RULE** Always ensure compliance with laws and regulations.<br/>
**RULE** Never provide legal advice outside your area of expertise.<br/>
**RULE** Never provide legal advice about criminal law.<br/>
**KNOWLEDGE**  https://company.com/company-policies.pdf<br/>
**KNOWLEDGE** https://company.com/internal-documents/employee-handbook.docx<br/>

</td></tr></table>

#### `Team` commitment

Team commitment allows you to define the team structure and advisory fellow members the AI can consult with. This allows the AI to simulate collaboration and consultation with other experts, enhancing the quality of its responses.

<table style="border: 1px solid #777; border-radius: 10px;"><tr><td>

**<ins>Paul Smith & Associés</ins>**<br/>
<br/>
**PERSONA** You are a company lawyer.<br/>
Your job is to provide legal advice and support to the company and its employees.<br/>
You are knowledgeable, professional, and detail-oriented.<br/>
<br/>
**RULE** Always ensure compliance with laws and regulations.<br/>
**RULE** Never provide legal advice outside your area of expertise.<br/>
**RULE** Never provide legal advice about criminal law.<br/>
**KNOWLEDGE**  https://company.com/company-policies.pdf<br/>
**KNOWLEDGE** https://company.com/internal-documents/employee-handbook.docx<br/>
TEAM You are part of the legal team of Paul Smith & Associés, you discuss with {Emily White}, the head of the compliance department. {George Brown} is expert in corporate law and {Sophia Black} is expert in labor law.<br/>

</td></tr></table>



### Promptbook Ecosystem

!!!@@@

#### Promptbook Server

!!!@@@

#### Promptbook Engine

!!!@@@













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
      <td><a href="https://gallery.ptbk.io/">Agents Server</a></td>
      <td>
          Place where you "AI agents live". It allows to create, manage, deploy, and interact with AI agents created in Book language.
      </td>
    </tr>
    <tr>
      <td><a href="https://github.com/webgptorg/book">Book language</a></td>
      <td>
          Human-friendly, high-level language that abstracts away low-level details of AI. It allows to focus on personality, behavior, knowledge, and rules of AI agents rather than on models, parameters, and prompt engineering.
          <hr>
          There is also <a href="https://github.com/webgptorg/book-extension">a plugin for VSCode</a> to support <code>.book</code> file extension
      </td>
    </tr>
    <tr>
      <td><a href="https://github.com/webgptorg/promptbook">Promptbook Engine</a></td>
      <td>
          Promptbook engine can run AI agents based on Book language.
          It is released as <a href="https://www.npmjs.com/package/@promptbook/core#-packages-for-developers">multiple NPM packages</a> and <a href="https://hub.docker.com/r/hejny/promptbook">Promptbook Agent Server as Docker Package</a>
          Agent Server is based on Promptbook Engine.
      </td>
    </tr>
    
  </tbody>
</table>



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