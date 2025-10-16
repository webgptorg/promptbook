<!-- ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten -->

# ✨ Promptbook: AI Agents

Turn your company's scattered knowledge into AI ready Books






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

For most business applications nowadays, the biggest challenge isn't about the raw capabilities of AI models. Large language models like GPT-5 or Claude-4.1 are extremely capable.

The main challenge is to narrow it down, constrain it, set the proper **context, rules, knowledge, and personality**. There are a lot of tools which can do exactly this. On one side, there are no-code platforms which can launch your agent in seconds. On the other side, there are heavy frameworks like Langchain or Semantic Kernel, which can give you deep control.

Promptbook takes the best from both worlds. You are defining your AI behavior by simple **books**, which are very explicit. They are automatically enforced, but they are very easy to understand, very easy to write, and very reliable and portable.



<img
    alt="Paul Smith & Associés Book"
    src="https://promptbook.studio/embed/book-preview.png?book=Paul%20Smith%20%26%20Associ%C3%A9s%0A%20%20%20%20%20%20%7C%20PERSONA%20You%20are%20a%20company%20lawyer.%0A%20%20%20%20%20%20%7C%20Your%20job%20is%20to%20provide%20legal%20advice%20and%20support%20to%20the%20company%20and%20its%20employees.%0A%20%20%20%20%20%20%7C%20You%20are%20knowledgeable%2C%20professional%2C%20and%20detail-oriented.&width=800&height=450&nonce=0"
/>

<div style="page-break-after: always;"></div>

### Aspects of great AI agent

We have created a language called **Book**, which allows you to write AI agents in their native language and create your own AI persona. Book provides a guide to define all the traits and commitments.

You can look at it as prompting (or writing a system message), but decorated by **commitments**.

#### `Persona` commitment

Personas define the character of your AI persona, its role, and how it should interact with users. It sets the tone and style of communication.



<img
    alt="Paul Smith & Associés Book"
    src="https://promptbook.studio/embed/book-preview.png?book=Paul%20Smith%20%26%20Associ%C3%A9s%0A%20%20%20%20%20%20%7C%20PERSONA%20You%20are%20a%20company%20lawyer.%0A%20%20%20%20%20%20%7C%20Your%20job%20is%20to%20provide%20legal%20advice%20and%20support%20to%20the%20company%20and%20its%20employees.%0A%20%20%20%20%20%20%7C%20You%20are%20knowledgeable%2C%20professional%2C%20and%20detail-oriented.&width=800&height=450&nonce=0"
/>

#### `Knowledge` commitment

Knowledge Commitment allows you to provide specific information, facts, or context that the AI should be aware of when responding.

This can include domain-specific knowledge, company policies, or any other relevant information.

Promptbook Engine will automatically enforce this knowledge during interactions. When the knowledge is short enough, it will be included in the prompt. When it is too long, it will be stored in vector databases and RAG retrieved when needed. But you don't need to care about it.



<img
    alt="Paul Smith & Associés Book"
    src="https://promptbook.studio/embed/book-preview.png?book=Paul%20Smith%20%26%20Associ%C3%A9s%0A%20%20%20%20%20%20%7C%20PERSONA%20You%20are%20a%20company%20lawyer.%0A%20%20%20%20%20%20%7C%20Your%20job%20is%20to%20provide%20legal%20advice%20and%20support%20to%20the%20company%20and%20its%20employees.%0A%20%20%20%20%20%20%7C%20You%20are%20knowledgeable%2C%20professional%2C%20and%20detail-oriented.%0A%20%20%20%20%20%20%7C%20KNOWLEDGE%20%20https%3A%2F%2Fcompany.com%2Fcompany-policies.pdf%0A%20%20%20%20%20%20%7C%20KNOWLEDGE%20https%3A%2F%2Fcompany.com%2Finternal-documents%2Femployee-handbook.docx&width=800&height=450&nonce=0"
/>

#### `Rule` commitment

Rules will enforce specific behaviors or constraints on the AI's responses. This can include ethical guidelines, communication styles, or any other rules you want the AI to follow.

Depending on rule strictness, Promptbook will either propagate it to the prompt or use other techniques, like adversary agent, to enforce it.



<img
    alt="Paul Smith & Associés Book"
    src="https://promptbook.studio/embed/book-preview.png?book=Paul%20Smith%20%26%20Associ%C3%A9s%0A%20%20%20%20%20%20%7C%20PERSONA%20You%20are%20a%20company%20lawyer.%0A%20%20%20%20%20%20%7C%20Your%20job%20is%20to%20provide%20legal%20advice%20and%20support%20to%20the%20company%20and%20its%20employees.%0A%20%20%20%20%20%20%7C%20You%20are%20knowledgeable%2C%20professional%2C%20and%20detail-oriented.%0A%20%20%20%20%20%20%7C%20RULE%20Always%20ensure%20compliance%20with%20laws%20and%20regulations.%0A%20%20%20%20%20%20%7C%20RULE%20Never%20provide%20legal%20advice%20outside%20your%20area%20of%20expertise.%0A%20%20%20%20%20%20%7C%20RULE%20Never%20provide%20legal%20advice%20about%20criminal%20law.%0A%20%20%20%20%20%20%7C%20KNOWLEDGE%20%20https%3A%2F%2Fcompany.com%2Fcompany-policies.pdf%0A%20%20%20%20%20%20%7C%20KNOWLEDGE%20https%3A%2F%2Fcompany.com%2Finternal-documents%2Femployee-handbook.docx&width=800&height=450&nonce=0"
/>

#### `Action` commitment

Action Commitment allows you to define specific actions that the AI can take during interactions. This can include things like posting on a social media platform, sending emails, creating calendar events, or interacting with your internal systems.



<img
    alt="Paul Smith & Associés Book"
    src="https://promptbook.studio/embed/book-preview.png?book=Paul%20Smith%20%26%20Associ%C3%A9s%0A%20%20%20%20%20%20%7C%20PERSONA%20You%20are%20a%20company%20lawyer.%0A%20%20%20%20%20%20%7C%20Your%20job%20is%20to%20provide%20legal%20advice%20and%20support%20to%20the%20company%20and%20its%20employees.%0A%20%20%20%20%20%20%7C%20You%20are%20knowledgeable%2C%20professional%2C%20and%20detail-oriented.%0A%20%20%20%20%20%20%7C%20RULE%20Always%20ensure%20compliance%20with%20laws%20and%20regulations.%0A%20%20%20%20%20%20%7C%20RULE%20Never%20provide%20legal%20advice%20outside%20your%20area%20of%20expertise.%0A%20%20%20%20%20%20%7C%20RULE%20Never%20provide%20legal%20advice%20about%20criminal%20law.%0A%20%20%20%20%20%20%7C%20KNOWLEDGE%20%20https%3A%2F%2Fcompany.com%2Fcompany-policies.pdf%0A%20%20%20%20%20%20%7C%20KNOWLEDGE%20https%3A%2F%2Fcompany.com%2Finternal-documents%2Femployee-handbook.docx%0A%20%20%20%20%20%20%7C%20ACTION%20When%20a%20user%20asks%20about%20an%20issue%20that%20could%20be%20treated%20as%20a%20crime%2C%20notify%20legal%40company.com.&width=800&height=450&nonce=0"
/>

[Read more about the language](./BLUEPRINT.md)

<div style="page-break-after: always;"></div>

### Where to use your AI agent in book

Books can be useful in various applications and scenarios. Here are some examples:

#### Chat apps:

Create your own chat shopping assistant and place it in your eShop.
You will be able to answer customer questions, help them find products, and provide personalized recommendations. Everything is tightly controlled by the book you have written.

#### Reply Agent:

Create your own AI agent, which will look at your emails and reply to them. It can even create drafts for you to review before sending.

#### Coding Agent:

Do you love Vibecoding, but the AI code is not always aligned with your coding style and architecture, rules, security, etc.? Create your own coding agent to help enforce your specific coding standards and practices.

This can be integrated to almost any Vibecoding platform, like GitHub Copilot, Amazon CodeWhisperer, Cursor, Cline, Kilocode, Roocode,...

They will work the same as you are used to, but with your specific rules written in book.

#### Internal Expertise

Do you have an app written in TypeScript, Python, C#, Java, or any other language, and you are integrating the AI.

You can avoid struggle with choosing the best model, its settings like temperature, max tokens, etc., by writing a book agent and using it as your AI expertise.

Doesn't matter if you do automations, data analysis, customer support, sentiment analysis, classification, or any other task. Your AI agent will be tailored to your specific needs and requirements.

Even works in no-code platforms!

<div style="page-break-after: always;"></div>

### How to create your AI agent in book

Now you want to use it. There are several ways how to write your first book:

#### From scratch with help from Paul

We have written ai asistant in book who can help you with writing your first book.

#### Your AI twin

Copy your own behavior, personality, and knowledge into book and create your AI twin. It can help you with your work, personal life, or any other task.

#### AI persona workpool

Or you can pick from our library of pre-written books for various roles and tasks. You can find books for customer support, coding, marketing, sales, HR, legal, and many other roles.






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

<blockquote style="color:#FFE600">
⚠ This file is a work in progress and may be incomplete or inaccurate.
</blockquote>

---

Book is a simple format do define AI apps and agents. It is the source code the soul of AI apps and agents.. It's purpose is to avoid ambiguous UIs with multiple fields and low-level ways like programming in langchain.

Book is defined in file with `.book` extension

### Examples



<img
    alt="Write an article about {topic} Book"
    src="https://promptbook.studio/embed/book-preview.png?book=Write%20an%20article%20about%20%7Btopic%7D%0A%20%20%20%20%20%20%7C%20PERSONA%20Jane%2C%20marketing%20specialist%20with%20prior%20experience%20in%20tech%20and%20AI%20writing%0A%20%20%20%20%20%20%7C%20KNOWLEDGE%20https%3A%2F%2Fwikipedia.org%2F%0A%20%20%20%20%20%20%7C%20KNOWLEDGE%20.%2Fjournalist-ethics.pdf%0A%20%20%20%20%20%20%7C%20EXPECT%201%20Sentence%20-%205%20Pages%0A%20%20%20%20%20%20%7C%20RESULT%20%7Barticle%7D&width=800&height=450&nonce=0"
/>

---



<img
    alt="Make post on LinkedIn based on @Input. Book"
    src="https://promptbook.studio/embed/book-preview.png?book=Make%20post%20on%20LinkedIn%20based%20on%20%40Input.%0A%20%20%20%20%20%20%7C%20PERSONA%20%40Jane%2C%20an%20experienced%20copywriter%20and%20HR%20expert%0A%20%20%20%20%20%20%7C%20KNOWLEDGE%20cetin.cz%0A%20%20%20%20%20%20%7C%20KNOWLEDGE%20linkedin.com%2Fcompany%2Fcetin%2F&width=800&height=450&nonce=0"
/>

---



<img
    alt="Odpověz na Email Book"
    src="https://promptbook.studio/embed/book-preview.png?book=Odpov%C4%9Bz%20na%20Email%0A%20%20%20%20%20%20%7C%20%7BEmail%20content%7D%0A%20%20%20%20%20%20%7C%20PERSONA%20%40Pavol%20-%20pavolhejny.com%0A%20%20%20%20%20%20%7C%20KNOWLEDGE%20.%2Finstructions.pdf%0A%20%20%20%20%20%20%7C%20STYLE%20Professional%20tone%20of%20voice&width=800&height=450&nonce=0"
/>

---



<img
    alt="Analyzuj {Případ}. Book"
    src="https://promptbook.studio/embed/book-preview.png?book=Analyzuj%20%7BP%C5%99%C3%ADpad%7D.%0A%20%20%20%20%20%20%7C%20%7BDetaily%7D%0A%20%20%20%20%20%20%7C%20PERSONA%20%40Ji%C5%99%C3%AD%2C%20pr%C3%A1vn%C3%ADk%2C%20kter%C3%BD%20nikdy%20neode%C5%A1le%20informace%20o%20klientech%20mimo%20EU%0A%20%20%20%20%20%20%7C%20KNOWLEDGE%20%7B89%2F2012%20Sb.%20Ob%C4%8Dansk%C3%BD%20z%C3%A1kon%C3%ADk%7D&width=800&height=450&nonce=0"
/>

iframe:

<iframe frameborder="0" style="width:100%;height:455px;" src="https://viewer.diagrams.net/?tags=%7B%7D&lightbox=1&highlight=0000ff&edit=_blank&layers=1&nav=1&title=#R%3Cmxfile%20scale%3D%221%22%20border%3D%220%22%20disableSvgWarning%3D%22true%22%20linkTarget%3D%22_blank%22%3E%3Cdiagram%20name%3D%22Page-1%22%20id%3D%22zo4WBBcyATChdUDADUly%22%3E7ZxtU%2BM2EMc%2FjWfaF2b8kMTwEkKOu%2Fa468BM77ViK4mKLLmy8nSfvitbihPiNEAaIHTfYHm1luzVT7vG%2F5l4cT9f3ChSTG5lRrkXBdnCi6%2B9KAo7YQ8OxrK0liBKastYsczaGsM9%2B0mdo7VOWUbLDUctJdes2DSmUgia6g0bUUrON91Gkm%2FOWpCxnTFoDPcp4XTL7QfL9KS2nnfXvD9TNp64mcPA9uTEOVtDOSGZnK%2BZ4oEX95WUum7liz7lJnouLvV1n3b0rm5MUaGfcoFdiRnhU%2Ftsf1KlGTwqWPtSaMIEVfZe9dIFoJyznBMBZ1fzCdP0viCp6ZrDgoNtonMOZyE07fgwKF3svMdw9eTADJU51WoJLvYCP7qw0bK8JPZ03sQ%2B7lnbZC3ukQs7ses9Xo3dhAQaNirtEbrYipAX9TjMcFUWRDSOvb%2BnZtGuMpmWPhOaKkG4b0j1R2EcdbNO6iej0cgfhufQGiaJnw7PaXIRJT2adpsBoDW2x2qaYiP0zovDuvjuYS%2FDs%2FgcjDlRYyZ8LQtjiwrd2IZSa5k35vX5goypzcG12n0%2F9rG3b2kEuPhltVkvwWE1UVB1jEjO%2BLLugmtIbkCxV95JuD0JHbdSyMedXtQ3Owd6ypqyq2pnc6nqwdR4%2BEtQO7nDr7XTkKQPYyWnIvPX%2FLUionT0rW5vRhQjcBTTnCqW1q5Cqhx2wrYXJaX2SQntPY6EVyBok63%2B1bGQJdNM7huP5vIvtu0zs5sW5mNjO8aQlNRQUntU29SvImiCwUlR2nUqFC2pmtFHUNSLfkseqPGRpYaDNAv%2FlYkHmn0RdorM2R0fsKFqRN4%2FNhe1Uxh060YUJi9AZ%2B52IRgSYBCh2gOV1wm%2BiGKqT5AYTDRHYuJsDwxgLl5WGTtRGHW3imOntTgGH7A2ht34YGgxxT0T5z8Gd%2Fffv11iWURmnlMWfzP%2FU50eMFgVj4VEFdBqwemigMhQkVZv3KkslnMFY6qq35g%2B3zmvfS9WB9TSoLddSwMspZgWj7cHfv%2F2%2FcfXwfXN4DSLKebGI3GRUs3EWfoTkx0muw8D9TGSXYjJ7uS54NVHV5PvIN9En%2BAvrP7StEwWNGLG87NgxmbI1P%2BYKbfoQ9VCyw6IWpjZcn6kFWq6MPY1TdA%2ByDWnI9PjHvDSmnOWZXyXtFgtOTWSW7CabI%2B62GtXF62Y2HmimBg64yFiohOw37XeGjod20bIf2qI%2FhO9NQxRcH3%2FL4eYlFFwxS%2FLpwIVCq7IBAqur4Usfjh5A5xRcEVmUHDFqoiCK5ZSTIsH7QEUXJGLNi5QcMVk9%2BGgRsEVuWjjAgVXZAoFV%2B9FgmsYtOuLb6K4RieouK504tdRXGNUXN%2F%2F2yFmZVRc8dPyqUCFiisygYrrayGLX07eAGdUXJEZVFyxKqLiiqUU0%2BJBewAVV%2BSijQtUXDHZfTioUXFFLtq4QMUVmULF1XuZ4hq9meIKp83PFVd9N82vPseDfwA%3D%3C%2Fdiagram%3E%3C%2Fmxfile%3E"></iframe>

books.svg

![Books](./books/diagram/books.svg)

books.png

![Books](./books/diagram/books.png)

### Basic Commitments:

Book is composed of commitments, which are the building blocks of the book. Each commitment defines a specific task or action to be performed by the AI agent. The commitments are defined in a structured format, allowing for easy parsing and execution.

#### `PERSONA`

defines basic contour of

> PERSONA @Joe Average man with

also the PERSONA is

Describes

#### `RULE` or `RULES`

defines

#### `STYLE`

xxx

#### `SAMPLE`

xxx

#### `KNOWLEDGE`

xxx

#### `EXPECT`

xxx

#### `FORMAT`

xxx

#### `JOKER`

xxx

#### `MODEL`

xxx

#### `ACTION`

xxx

#### `META`

### Names

each commitment is

`PERSONA`

Variable names

### Types

### Miscellaneous aspects of Book language

#### Named vs Anonymous commitments

#### Single line vs multiline

#### Bookish vs Non-bookish definitions

---

## **\_\_\_\_**

Great context and prompt can make or break you AI app. In last few years we have came from simple one-shot prompts. When you want to add conplexity you have finetunned the model or add better orchestration. But with really large large language models the context seems to be a king.

The Book is the language to describe and define your AI app. Its like a shem for a Golem, book is the shem and model is the golem.



<img
    alt="Franz Kafka Book"
    src="https://promptbook.studio/embed/book-preview.png?book=Franz%20Kafka%0A%20%20%20%20%20%20%7C%20PERSONA%20Franz%20Kafka%2C%20a%20writer%20who%20is%20interested%20in%20the%20human%20condition%20and%20the%20absurdity%20of%20life%2C%20speaks%20German%20and%20Czech%20and%20English%0A%20%20%20%20%20%20%7C%20STYLE%20%7Bkafka.com%2Fthe-castle%7D%0A%20%20%20%20%20%20%7C%20STYLE%20%7Bkafka.com%2Fthe-trial.pdf%7D%0A%20%20%20%20%20%20%7C%20STYLE%20%7Bkafka.com%2Fmetamorphosis.docx%7D%0A%20%20%20%20%20%20%7C%20KNOWLEDGE%20Franz%20Kafka%20has%20a%20deep%20understanding%20of%20existentialism%2C%20surrealism%2C%20and%20the%20human%20psyche%0A%20%20%20%20%20%20%7C%20GOAL%20Write%20a%20short%20story%20that%20explores%20the%20themes%20of%20alienation%2C%20bureaucracy%2C%20and%20the%20absurd%0A%20%20%20%20%20%20%7C%20ACTION%20%7Bmcp&width=800&height=450&nonce=0"
/>

## Who, what and how?

To write a good prompt and the book you will be answering 3 main questions

-   **Who** is working on the task, is it a team or an individual? What is the role of the person in the team? What is the background of the person? What is the motivation of the person to work on this task?
    You rather want `Paul, an typescript developer who prefers SOLID code` not `gemini-2`
-   **What**
-   **How**

each commitment (described bellow) is connected with one of theese 3 questions.

### Commitments

Commitment is one piece of book, you can imagine it as one paragraph of book.

Each commitment starts in a new line with commitment name, its usually in UPPERCASE and follows a contents of that commitment. Contents of the commithemt is defined in natural language.

Commitments are chained one after another, in general commitments which are written later are more important and redefines things defined earlier.

Each commitment falls into one or more of cathegory who, what or how

Here are some basic commintemts:

-   `PERSONA` tells **who** is working on the task
-   `KNOWLEDGE` describes **what** knowledge the person has
-   `GOAL` describes **what** is the goal of the task
-   `ACTION` describes **what** actions can be done
-   `RULE` describes **what** rules should be followed
-   `STYLE` describes **how** the output should be presented

### Variables and references

When the prompt should be to be useful it should have some fixed static part and some variable dynamic part



<img
    alt="Untitled Book"
    src="https://promptbook.studio/embed/book-preview.png?book=&width=800&height=450&nonce=0"
/>

### Imports

### Layering

### Book defined in book

###

Book vs:

-   Why just dont pick the right model
-   Orchestration frameworks - Langchain, Google Agent ..., Semantic Kernel,...
-   Finetunning
-   Temperature, top_t, top_k,... etc.
-   System message
-   MCP server
-   function calling



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