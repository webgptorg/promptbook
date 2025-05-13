<!-- ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten -->

# ✨ Promptbook




[![NPM Version of ![Promptbook logo - cube with letters P and B](./design/logo-h1.png) Promptbook](https://badge.fury.io/js/promptbook.svg)](https://www.npmjs.com/package/promptbook)
[![Quality of package ![Promptbook logo - cube with letters P and B](./design/logo-h1.png) Promptbook](https://packagequality.com/shield/promptbook.svg)](https://packagequality.com/#?package=promptbook)
[![Known Vulnerabilities](https://snyk.io/test/github/webgptorg/promptbook/badge.svg)](https://snyk.io/test/github/webgptorg/promptbook)
[![Issues](https://img.shields.io/github/issues/webgptorg/promptbook.svg?style=flat)](https://github.com/webgptorg/promptbook/issues)





## 🌟 New Features

-   📂 We have plugin for [VSCode](https://github.com/webgptorg/book-extension) to support `.book` file extension
-   🐳 Available [Docker image](https://hub.docker.com/r/hejny/promptbook/)
-   💫 Support of [`o3-mini` model by OpenAI](https://openai.com/index/openai-o3-mini/)
-   🐋 **Support of [DeepSeek models](https://www.npmjs.com/package/@promptbook/deepseek)**



<blockquote style="color: #ff8811">
    <b>⚠ Warning:</b> This is a pre-release version of the library. It is not yet ready for production use. Please look at <a href="https://www.npmjs.com/package/@promptbook/core?activeTab=versions">latest stable release</a>.
</blockquote>

## 📦 Package `@promptbook/documents`

- Promptbooks are [divided into several](#-packages) packages, all are published from [single monorepo](https://github.com/webgptorg/promptbook).
- This package `@promptbook/documents` is one part of the promptbook ecosystem.

To install this package, run:

```bash
# Install entire promptbook ecosystem
npm i ptbk

# Install just this package to save space
npm install @promptbook/documents
```

Read knowledge from documents like `.docx`, `.odt`,…

-   _Note: `.pdf` documents are not supported by this package. Use the [`@promptbook/pdf`](https://www.npmjs.com/package/@promptbook/pdf) package instead._
-   _Note: For legacy documents use [`@promptbook/legacy-documents`](https://www.npmjs.com/package/@promptbook/legacy-documents)_


---

Rest of the documentation is common for **entire promptbook ecosystem**:




## 🤍 The Book Abstract

**It's time for a paradigm shift! The future of software is in plain English, French or Latin.**

During the computer revolution, we have seen [multiple generations of computer languages](https://github.com/webgptorg/promptbook/discussions/180), from the physical rewiring of the vacuum tubes through low-level machine code to the high-level languages like Python or JavaScript. And now, we're on the edge of the **next revolution**!

It's a revolution of writing software in **plain human language** that is understandable and executable by both humans and machines – and it's going to change everything!

The incredible growth in power of microprocessors and the Moore's Law have been the driving force behind the ever-more powerful languages, and it's been an amazing journey! Similarly, the large language models (like GPT or Claude) are the next big thing in language technology, and they're set to transform the way we interact with computers.

This shift is going to happen, whether we are ready for it or not. Our mission is to make it excellently, not just good.

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

We also have a community of developers and users of **Promptbook**:

-   [Discord community](https://discord.gg/x3QWNaa89N)
-   [Landing page `ptbk.io`](https://ptbk.io)
-   [Github discussions](https://github.com/webgptorg/promptbook/discussions)
-   [LinkedIn `Promptbook`](https://linkedin.com/company/promptbook)
-   [Facebook `Promptbook`](https://www.facebook.com/61560776453536)

And **Promptbook.studio** branded socials:

-   [Instagram `@promptbook.studio`](https://www.instagram.com/promptbook.studio/)

And **Promptujeme** sub-brand:

_/Subbrand for Czech clients/_

-   [Promptujeme.cz](https://www.promptujeme.cz/)
-   [Facebook `Promptujeme`](https://www.facebook.com/promptujeme/)

And **Promptbook.city** branded socials:

_/Sub-brand for images and graphics generated via Promptbook prompting/_

-   [Instagram `@promptbook.city`](https://www.instagram.com/promptbook.city/)
-   [Facebook `Promptbook City`](https://www.facebook.com/61565718625569)






## 💙 The Book language

Following is the documentation and blueprint of the [Book language](https://github.com/webgptorg/book).

Book is a language that can be used to write AI applications, agents, workflows, automations, knowledgebases, translators, sheet processors, email automations and more. It allows you to harness the power of AI models in human-like terms, without the need to know the specifics and technicalities of the models.

### Example

```markdown
# 🌟 My first Book

-   BOOK VERSION 1.0.0
-   URL https://promptbook.studio/hello.book
-   INPUT PARAMETER {topic}
-   OUTPUT PARAMETER {article}

# Write an article

-   PERSONA Jane, marketing specialist with prior experience in writing articles about technology and artificial intelligence
-   KNOWLEDGE https://wikipedia.org/
-   KNOWLEDGE ./journalist-ethics.pdf
-   EXPECT MIN 1 Sentence
-   EXPECT MAX 5 Pages

> Write an article about {topic}

-> {article}
```

Each part of the book defines one of 3 circles:

### **What:** Workflows, Tasks and Parameters

What work needs to be done. Each book defines a [workflow _(scenario or pipeline)_](https://github.com/webgptorg/promptbook/discussions/88), which is one or more tasks. Each workflow has a fixed input and output. For example, you have a book that generates an article from a topic. Once it generates an article about AI, once about marketing, once about cooking. The workflow (= your AI program) is the same, only the input and output change.

**Related commands:**

-   [PARAMETER](https://github.com/webgptorg/promptbook/blob/main/documents/commands/PARAMETER.md)

### **Who:** Personas

Who does the work. Each task is performed by a persona. A persona is a description of your virtual employee. It is a higher abstraction than the model, tokens, temperature, top-k, top-p and other model parameters.

You can describe what you want in human language like `Jane, creative writer with a sense of sharp humour` instead of `gpt-4-2024-13-31, temperature 1.2, top-k 40, STOP token ".\n",...`.

Personas can have access to different knowledge, tools and actions. They can also consult their work with other personas or user, if allowed.

**Related commands:**

-   [PERSONA](https://github.com/webgptorg/promptbook/blob/main/documents/commands/PERSONA.md)

### **How:** Knowledge, Instruments and Actions

The resources used by the personas are used to do the work.

**Related commands:**

-   [KNOWLEDGE](https://github.com/webgptorg/promptbook/blob/main/documents/commands/KNOWLEDGE.md) of documents, websites, and other resources
-   [INSTRUMENT](https://github.com/webgptorg/promptbook/blob/main/documents/commands/INSTRUMENT.md) for real-time data like time, location, weather, stock prices, searching the internet, calculations, etc.
-   [ACTION](https://github.com/webgptorg/promptbook/blob/main/documents/commands/ACTION.md) for actions like sending emails, creating files, ending a workflow, etc.

### General principles of book language

Book language is based on markdown. It is subset of markdown. It is designed to be easy to read and write. It is designed to be understandable by both humans and machines and without specific knowledge of the language.

The file has `.book` extension. It uses `UTF-8` non BOM encoding.

Book has two variants: flat - which is just a prompt with no structure, and full - which has a structure with tasks, commands and prompts.

As it is source code, it can leverage all the features of version control systems like git and does not suffer from the problems of binary formats, proprietary formats, or no-code solutions.

But unlike programming languages, it is designed to be understandable by non-programmers and non-technical people.



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
-   ⭐🧙‍♂️ **[@promptbook/wizzard](https://www.npmjs.com/package/@promptbook/wizzard)** - Wizzard to just run the books in node without any struggle
-   **[@promptbook/core](https://www.npmjs.com/package/@promptbook/core)** - Core of the library, it contains the main logic for promptbooks
-   **[@promptbook/node](https://www.npmjs.com/package/@promptbook/node)** - Core of the library for Node.js environment
-   **[@promptbook/browser](https://www.npmjs.com/package/@promptbook/browser)** - Core of the library for browser environment
-   ⭐ **[@promptbook/utils](https://www.npmjs.com/package/@promptbook/utils)** - Utility functions used in the library but also useful for individual use in preprocessing and postprocessing LLM inputs and outputs
-   **[@promptbook/markdown-utils](https://www.npmjs.com/package/@promptbook/markdown-utils)** - Utility functions used for processing markdown
-   _(Not finished)_ **[@promptbook/wizzard](https://www.npmjs.com/package/@promptbook/wizzard)** - Wizard for creating+running promptbooks in single line
-   **[@promptbook/javascript](https://www.npmjs.com/package/@promptbook/javascript)** - Execution tools for javascript inside promptbooks
-   **[@promptbook/openai](https://www.npmjs.com/package/@promptbook/openai)** - Execution tools for OpenAI API, wrapper around OpenAI SDK
-   **[@promptbook/anthropic-claude](https://www.npmjs.com/package/@promptbook/anthropic-claude)** - Execution tools for Anthropic Claude API, wrapper around Anthropic Claude SDK 
-   **[@promptbook/vercel](https://www.npmjs.com/package/@promptbook/vercel)** - Adapter for Vercel functionalities
-   **[@promptbook/google](https://www.npmjs.com/package/@promptbook/google)** - Integration with Google's Gemini API
-   **[@promptbook/deepseek](https://www.npmjs.com/package/@promptbook/deepseek)** - Integration with [DeepSeek API](https://www.deepseek.com/)
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

_Note: This section is not complete dictionary, more list of general AI / LLM terms that has connection with Promptbook_

### 💯 Core concepts

-   [📚 Collection of pipelines](https://github.com/webgptorg/promptbook/discussions/65)
-   [📯 Pipeline](https://github.com/webgptorg/promptbook/discussions/64)
-   [🙇‍♂️ Tasks and pipeline sections](https://github.com/webgptorg/promptbook/discussions/88)
-   [🤼 Personas](https://github.com/webgptorg/promptbook/discussions/22)
-   [⭕ Parameters](https://github.com/webgptorg/promptbook/discussions/83)
-   [🚀 Pipeline execution](https://github.com/webgptorg/promptbook/discussions/84)
-   [🧪 Expectations](https://github.com/webgptorg/promptbook/discussions/30)
-   [✂️ Postprocessing](https://github.com/webgptorg/promptbook/discussions/31)
-   [🔣 Words not tokens](https://github.com/webgptorg/promptbook/discussions/29)
-   [☯ Separation of concerns](https://github.com/webgptorg/promptbook/discussions/32)

#### Advanced concepts

-   [📚 Knowledge (Retrieval-augmented generation)](https://github.com/webgptorg/promptbook/discussions/41)
-   [🌏 Remote server](https://github.com/webgptorg/promptbook/discussions/89)
-   [🃏 Jokers (conditions)](https://github.com/webgptorg/promptbook/discussions/66)
-   [🔳 Metaprompting](https://github.com/webgptorg/promptbook/discussions/35)
-   [🌏 Linguistically typed languages](https://github.com/webgptorg/promptbook/discussions/53)
-   [🌍 Auto-Translations](https://github.com/webgptorg/promptbook/discussions/42)
-   [📽 Images, audio, video, spreadsheets](https://github.com/webgptorg/promptbook/discussions/54)
-   [🔙 Expectation-aware generation](https://github.com/webgptorg/promptbook/discussions/37)
-   [⏳ Just-in-time fine-tuning](https://github.com/webgptorg/promptbook/discussions/33)
-   [🔴 Anomaly detection](https://github.com/webgptorg/promptbook/discussions/40)
-   [👮 Agent adversary expectations](https://github.com/webgptorg/promptbook/discussions/39)
-   [view more](https://github.com/webgptorg/promptbook/discussions/categories/concepts)



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

## ⌚ Changelog

See [CHANGELOG.md](./CHANGELOG.md)

## 📜 License

Promptbook project is under [BUSL 1.1 is an SPDX license](https://spdx.org/licenses/BUSL-1.1.html)

## 🎯 Todos

See [TODO.md](./TODO.md)

## 🤝 Partners

<div style="display: flex; align-items: center; gap: 20px;">

  <a href="https://promptbook.studio/">
    <img src="./design/promptbook-studio-logo.png" alt="Partner 3" height="70">
  </a>

  <a href="https://technologickainkubace.org/en/about-technology-incubation/about-the-project/">
    <img src="./other/partners/CI-Technology-Incubation.png" alt="Technology Incubation" height="70">
  </a>

</div>

## 🖋️ Contributing

You can also ⭐ star the project, [follow us on GitHub](https://github.com/hejny) or [various other social networks](https://www.pavolhejny.com/contact/).We are open to [pull requests, feedback, and suggestions](./CONTRIBUTING.md).

## 📞 Support

If you need help or have questions, please check our [Support Resources](./SUPPORT.md).