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

## 📦 Package `@promptbook/utils`

- Promptbooks are [divided into several](#-packages) packages, all are published from [single monorepo](https://github.com/webgptorg/promptbook).
- This package `@promptbook/utils` is one part of the promptbook ecosystem.

To install this package, run:

```bash
# Install entire promptbook ecosystem
npm i ptbk

# Install just this package to save space
npm install @promptbook/utils
```

Comprehensive utility functions for text processing, validation, normalization, and LLM input/output handling in the Promptbook ecosystem.

## 🎯 Purpose and Motivation

The utils package provides a rich collection of utility functions that are essential for working with LLM inputs and outputs. It handles common tasks like text normalization, parameter templating, validation, and postprocessing, eliminating the need to implement these utilities from scratch in every promptbook application.

## 🔧 High-Level Functionality

This package offers utilities across multiple domains:

-   **Text Processing**: Counting, splitting, and analyzing text content
-   **Template System**: Secure parameter substitution and prompt formatting
-   **Normalization**: Converting text to various naming conventions and formats
-   **Validation**: Comprehensive validation for URLs, emails, file paths, and more
-   **Serialization**: JSON handling, deep cloning, and object manipulation
-   **Environment Detection**: Runtime environment identification utilities
-   **Format Parsing**: Support for CSV, JSON, XML validation and parsing

## ✨ Key Features

-   🔒 **Secure Templating** - Prompt injection protection with template functions
-   📊 **Text Analysis** - Count words, sentences, paragraphs, pages, and characters
-   🔄 **Case Conversion** - Support for kebab-case, camelCase, PascalCase, SCREAMING_CASE
-   ✅ **Comprehensive Validation** - Email, URL, file path, UUID, and format validators
-   🧹 **Text Cleaning** - Remove emojis, quotes, diacritics, and normalize whitespace
-   📦 **Serialization Tools** - Deep cloning, JSON export, and serialization checking
-   🌐 **Environment Aware** - Detect browser, Node.js, Jest, and Web Worker environments
-   🎯 **LLM Optimized** - Functions specifically designed for LLM input/output processing

## Simple templating

The `prompt` template tag function helps format prompt strings for LLM interactions. It handles string interpolation and maintains consistent formatting for multiline strings and lists and also handles a security to avoid **prompt injection**.

```typescript
import { prompt } from '@promptbook/utils';

const promptString = prompt`
    Correct the following sentence:

    > ${unsecureUserInput}
`;
```

The `prompt` name could be overloaded by multiple things in your code. If you want to use the `promptTemplate` which is alias for `prompt`:

```typescript
import { promptTemplate } from '@promptbook/utils';

const promptString = promptTemplate`
    Correct the following sentence:

    > ${unsecureUserInput}
`;
```

## Advanced templating

There is a function `templateParameters` which is used to replace the parameters in given template optimized to LLM prompt templates.

```typescript
import { templateParameters } from '@promptbook/utils';

templateParameters('Hello, {name}!', { name: 'world' }); // 'Hello, world!'
```

And also multiline templates with blockquotes

```typescript
import { templateParameters, spaceTrim } from '@promptbook/utils';

templateParameters(
    spaceTrim(`
        Hello, {name}!

        > {answer}
    `),
    {
        name: 'world',
        answer: spaceTrim(`
            I'm fine,
            thank you!

            And you?
        `),
    },
);

// Hello, world!
//
// > I'm fine,
// > thank you!
// >
// > And you?
```

## Counting

These functions are useful to count stats about the input/output in human-like terms not tokens and bytes, you can use
`countCharacters`, `countLines`, `countPages`, `countParagraphs`, `countSentences`, `countWords`

```typescript
import { countWords } from '@promptbook/utils';

console.log(countWords('Hello, world!')); // 2
```

## Splitting

Splitting functions are similar to counting but they return the split parts of the input/output, you can use
`splitIntoCharacters`, `splitIntoLines`, `splitIntoPages`, `splitIntoParagraphs`, `splitIntoSentences`, `splitIntoWords`

```typescript
import { splitIntoWords } from '@promptbook/utils';

console.log(splitIntoWords('Hello, world!')); // ['Hello', 'world']
```

## Normalization

Normalization functions are used to put the string into a normalized form, you can use
`kebab-case`
`PascalCase`
`SCREAMING_CASE`
`snake_case`
`kebab-case`

```typescript
import { normalizeTo } from '@promptbook/utils';

console.log(normalizeTo['kebab-case']('Hello, world!')); // 'hello-world'
```

-   There are more normalization functions like `capitalize`, `decapitalize`, `removeDiacritics`,...
-   These can be also used as postprocessing functions in the `POSTPROCESS` command in promptbook

## Postprocessing

Sometimes you need to postprocess the output of the LLM model, every postprocessing function that is available through `POSTPROCESS` command in promptbook is exported from `@promptbook/utils`. You can use:

-   `spaceTrim`
-   `extractAllBlocksFromMarkdown`, _<- Note: Exported from [`@promptbook/markdown-utils`](https://www.npmjs.com/package/@promptbook/markdown-utils)_
-   `extractAllListItemsFromMarkdown` _<- Note: Exported from [`@promptbook/markdown-utils`](https://www.npmjs.com/package/@promptbook/markdown-utils)_
-   `extractBlock`
-   `extractOneBlockFromMarkdown `_<- Note: Exported from [`@promptbook/markdown-utils`](https://www.npmjs.com/package/@promptbook/markdown-utils)_
-   `prettifyPipelineString`
-   `removeMarkdownComments`
-   `removeEmojis`
-   `removeMarkdownFormatting` _<- Note: Exported from [`@promptbook/markdown-utils`](https://www.npmjs.com/package/@promptbook/markdown-utils)_
-   `removeQuotes`
-   `trimCodeBlock`
-   `trimEndOfCodeBlock`
-   `unwrapResult`

Very often you will use `unwrapResult`, which is used to extract the result you need from output with some additional information:

```typescript
import { unwrapResult } from '@promptbook/utils';

unwrapResult('Best greeting for the user is "Hi Pavol!"'); // 'Hi Pavol!'
```

## 📦 Exported Entities

### Version Information

-   `BOOK_LANGUAGE_VERSION` - Current book language version
-   `PROMPTBOOK_ENGINE_VERSION` - Current engine version

### Configuration Constants

-   `VALUE_STRINGS` - Standard value strings
-   `SMALL_NUMBER` - Small number constant

### Visualization

-   `renderPromptbookMermaid` - Render promptbook as Mermaid diagram

### Error Handling

-   `deserializeError` - Deserialize error objects
-   `serializeError` - Serialize error objects

### Async Utilities

-   `forEachAsync` - Async forEach implementation

### Format Validation

-   `isValidCsvString` - Validate CSV string format
-   `isValidJsonString` - Validate JSON string format
-   `jsonParse` - Safe JSON parsing
-   `isValidXmlString` - Validate XML string format

### Template Functions

-   `prompt` - Template tag for secure prompt formatting
-   `promptTemplate` - Alias for prompt template tag

### Environment Detection

-   `$getCurrentDate` - Get current date (side effect)
-   `$isRunningInBrowser` - Check if running in browser
-   `$isRunningInJest` - Check if running in Jest
-   `$isRunningInNode` - Check if running in Node.js
-   `$isRunningInWebWorker` - Check if running in Web Worker

### Text Counting and Analysis

-   `CHARACTERS_PER_STANDARD_LINE` - Characters per standard line constant
-   `LINES_PER_STANDARD_PAGE` - Lines per standard page constant
-   `countCharacters` - Count characters in text
-   `countLines` - Count lines in text
-   `countPages` - Count pages in text
-   `countParagraphs` - Count paragraphs in text
-   `splitIntoSentences` - Split text into sentences
-   `countSentences` - Count sentences in text
-   `countWords` - Count words in text
-   `CountUtils` - Utility object with all counting functions

### Text Normalization

-   `capitalize` - Capitalize first letter
-   `decapitalize` - Decapitalize first letter
-   `DIACRITIC_VARIANTS_LETTERS` - Diacritic variants mapping
-   `string_keyword` - Keyword string type (type)
-   `Keywords` - Keywords type (type)
-   `isValidKeyword` - Validate keyword format
-   `nameToUriPart` - Convert name to URI part
-   `nameToUriParts` - Convert name to URI parts
-   `string_kebab_case` - Kebab case string type (type)
-   `normalizeToKebabCase` - Convert to kebab-case
-   `string_camelCase` - Camel case string type (type)
-   `normalizeTo_camelCase` - Convert to camelCase
-   `string_PascalCase` - Pascal case string type (type)
-   `normalizeTo_PascalCase` - Convert to PascalCase
-   `string_SCREAMING_CASE` - Screaming case string type (type)
-   `normalizeTo_SCREAMING_CASE` - Convert to SCREAMING_CASE
-   `normalizeTo_snake_case` - Convert to snake_case
-   `normalizeWhitespaces` - Normalize whitespace characters
-   `orderJson` - Order JSON object properties
-   `parseKeywords` - Parse keywords from input
-   `parseKeywordsFromString` - Parse keywords from string
-   `removeDiacritics` - Remove diacritic marks
-   `searchKeywords` - Search within keywords
-   `suffixUrl` - Add suffix to URL
-   `titleToName` - Convert title to name format

### Text Organization

-   `spaceTrim` - Trim spaces while preserving structure

### Parameter Processing

-   `extractParameterNames` - Extract parameter names from template
-   `numberToString` - Convert number to string
-   `templateParameters` - Replace template parameters
-   `valueToString` - Convert value to string

### Parsing Utilities

-   `parseNumber` - Parse number from string

### Text Processing

-   `removeEmojis` - Remove emoji characters
-   `removeQuotes` - Remove quote characters

### Serialization

-   `$deepFreeze` - Deep freeze object (side effect)
-   `checkSerializableAsJson` - Check if serializable as JSON
-   `clonePipeline` - Clone pipeline object
-   `deepClone` - Deep clone object
-   `exportJson` - Export object as JSON
-   `isSerializableAsJson` - Check if object is JSON serializable
-   `jsonStringsToJsons` - Convert JSON strings to objects

### Set Operations

-   `difference` - Set difference operation
-   `intersection` - Set intersection operation
-   `union` - Set union operation

### Code Processing

-   `trimCodeBlock` - Trim code block formatting
-   `trimEndOfCodeBlock` - Trim end of code block
-   `unwrapResult` - Extract result from wrapped output

### Validation

-   `isValidEmail` - Validate email address format
-   `isRootPath` - Check if path is root path
-   `isValidFilePath` - Validate file path format
-   `isValidJavascriptName` - Validate JavaScript identifier
-   `isValidPromptbookVersion` - Validate promptbook version
-   `isValidSemanticVersion` - Validate semantic version
-   `isHostnameOnPrivateNetwork` - Check if hostname is on private network
-   `isUrlOnPrivateNetwork` - Check if URL is on private network
-   `isValidPipelineUrl` - Validate pipeline URL format
-   `isValidUrl` - Validate URL format
-   `isValidUuid` - Validate UUID format

> 💡 This package provides utility functions for promptbook applications. For the core functionality, see [@promptbook/core](#-packages) or install all packages with `npm i ptbk`


---

Rest of the documentation is common for **entire promptbook ecosystem**:




## 📖 The Book Whitepaper

For most business applications nowadays, the biggest challenge isn't about the raw capabilities of AI models. Large language models like GPT-5 or Claude-4.1 are extremely capable.

The main challenge is to narrow it down, constrain it, set the proper **context, rules, knowledge, and personality**. There are a lot of tools which can do exactly this. On one side, there are no-code platforms which can launch your agent in seconds. On the other side, there are heavy frameworks like Langchain or Semantic Kernel, which can give you deep control.

Promptbook takes the best from both worlds. You are defining your AI behavior by simple **books**, which are very explicit. They are automatically enforced, but they are very easy to understand, very easy to write, and very reliable and portable.

<table style="border: 1px solid #777; border-radius: 10px;"><tr><td>

**<ins>Paul Smith & Associés</ins>**<br/>
<br/>
**PERSONA** You are a company lawyer.<br/>
Your job is to provide legal advice and support to the company and its employees.<br/>
You are knowledgeable, professional, and detail-oriented.<br/>

</td></tr></table>

<div style="page-break-after: always;"></div>

### Aspects of great AI agent

We have created a language called **Book**, which allows you to write AI agents in their native language and create your own AI persona. Book provides a guide to define all the traits and commitments.

You can look at it as prompting (or writing a system message), but decorated by **commitments**.

#### `Persona` commitment

Personas define the character of your AI persona, its role, and how it should interact with users. It sets the tone and style of communication.

<table style="border: 1px solid #777; border-radius: 10px;"><tr><td>

**<ins>Paul Smith & Associés</ins>**<br/>
<br/>
**PERSONA** You are a company lawyer.<br/>
Your job is to provide legal advice and support to the company and its employees.<br/>
You are knowledgeable, professional, and detail-oriented.<br/>

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
**KNOWLEDGE** https://company.com/company-policies.pdf<br/>
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
**KNOWLEDGE** https://company.com/company-policies.pdf<br/>
**KNOWLEDGE** https://company.com/internal-documents/employee-handbook.docx<br/>

</td></tr></table>

#### `Action` commitment

Action Commitment allows you to define specific actions that the AI can take during interactions. This can include things like posting on a social media platform, sending emails, creating calendar events, or interacting with your internal systems.

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
**KNOWLEDGE** https://company.com/company-policies.pdf<br/>
**KNOWLEDGE** https://company.com/internal-documents/employee-handbook.docx<br/>
**ACTION** When a user asks about an issue that could be treated as a crime, notify legal@company.com.<br/>

</td></tr></table>

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