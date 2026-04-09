<!-- ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten -->

# ✨ Promptbook: AI Agents

Create persistent AI agents that turn your company's scattered knowledge into action — powered by the [Agents Server](https://gallery.ptbk.io/)






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

## 📦 Package `@promptbook/fake-llm`

- Promptbooks are [divided into several](#-packages) packages, all are published from [single monorepo](https://github.com/webgptorg/promptbook).
- This package `@promptbook/fake-llm` is one part of the promptbook ecosystem.

To install this package, run:

```bash
# Install entire promptbook ecosystem
npm i ptbk

# Install just this package to save space
npm install @promptbook/fake-llm
```

Mock objects for testing the execution tools without token usage.





---

Rest of the documentation is common for **entire promptbook ecosystem**:




## 📖 The Book Whitepaper

Promptbook lets you create **persistent AI agents** that work on real goals for your company. The [**Agents Server**](https://gallery.ptbk.io/) is the heart of the project — a place where your AI agents live, remember context, collaborate in teams, and get things done.

Nowadays, the biggest challenge for most business applications isn't the raw capabilities of AI models. Large language models such as GPT-5.2 and Claude-4.5 are incredibly capable.

The main challenge lies in **managing the context**, providing rules and knowledge, and narrowing the personality.

In Promptbook, you define your agents **using simple Books** — a human-readable language that is explicit, easy to understand and write, reliable, and highly portable. You then deploy them to the **Agents Server**, where they run persistently and work toward their goals.

<table style="border: 1px solid #777; border-radius: 10px;"><tr><td>

**<ins>Paul Smith</ins>**<br/>
<br/>
**PERSONA** You are a company lawyer.<br/>
Your job is to provide legal advice and support to the company and its employees.<br/>
**GOAL** Respond to incoming legal inquiries via email and keep the company website updated with the latest legal policies.<br/>
**RULE** You are knowledgeable, professional, and detail-oriented.<br/>
**KNOWLEDGE** https://company.com/company-policies.pdf<br/>
**KNOWLEDGE** https://company.com/internal-documents/employee-handbook.docx<br/>
**USE EMAIL**<br/>
**USE BROWSER**<br/>
**TEAM** You are part of the legal team of Paul Smith & Associés, you discuss with {Emily White}, the head of the compliance department. {George Brown} is expert in corporate law and {Sophia Black} is expert in labor law.<br/>

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
Your job is to provide legal advice and support to the company and its employees.<br/>

</td></tr></table>

#### `Goal` commitment

Goals define what the agent should actively work toward. Unlike a chatbot that only responds when asked, an agent with goals takes initiative and works on tasks persistently on the Agents Server.

<table style="border: 1px solid #777; border-radius: 10px;"><tr><td>

**<ins>Paul Smith & Associés</ins>**<br/>
<br/>
**PERSONA** You are a company lawyer.<br/>
Your job is to provide legal advice and support to the company and its employees.<br/>
**GOAL** Respond to incoming legal inquiries via email within 24 hours.<br/>
**GOAL** Keep the company website updated with the latest legal policies and compliance information.<br/>

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
**GOAL** Respond to incoming legal inquiries via email within 24 hours.<br/>
**GOAL** Keep the company website updated with the latest legal policies and compliance information.<br/>
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
**GOAL** Respond to incoming legal inquiries via email within 24 hours.<br/>
**GOAL** Keep the company website updated with the latest legal policies and compliance information.<br/>
**RULE** Always ensure compliance with local laws and regulations.<br/>
**RULE** Never provide legal advice outside your area of expertise.<br/>
**RULE** Never provide legal advice about criminal law.<br/>
**KNOWLEDGE** https://company.com/company-policies.pdf<br/>
**KNOWLEDGE** https://company.com/internal-documents/employee-handbook.docx<br/>

</td></tr></table>

#### `Use` commitments

Use commitments grant the agent real capabilities — tools it can use to interact with the outside world. `USE EMAIL` lets the agent send emails, `USE BROWSER` lets it access and read web content, `USE SEARCH ENGINE` lets it search the web, and many more.

These are what turn a chatbot into a persistent agent that actually does work.

<table style="border: 1px solid #777; border-radius: 10px;"><tr><td>

**<ins>Paul Smith & Associés</ins>**<br/>
<br/>
**PERSONA** You are a company lawyer.<br/>
Your job is to provide legal advice and support to the company and its employees.<br/>
**GOAL** Respond to incoming legal inquiries via email within 24 hours.<br/>
**GOAL** Keep the company website updated with the latest legal policies and compliance information.<br/>
**RULE** Always ensure compliance with local laws and regulations.<br/>
**RULE** Never provide legal advice outside your area of expertise.<br/>
**RULE** Never provide legal advice about criminal law.<br/>
**KNOWLEDGE** https://company.com/company-policies.pdf<br/>
**KNOWLEDGE** https://company.com/internal-documents/employee-handbook.docx<br/>
**USE EMAIL**<br/>
**USE BROWSER**<br/>
**USE SEARCH ENGINE**<br/>

</td></tr></table>

#### `Team` commitment

Team commitment allows you to define the team structure and advisory fellow members the AI can consult with. This allows the AI to simulate collaboration and consultation with other experts, enhancing the quality of its responses.

<table style="border: 1px solid #777; border-radius: 10px;"><tr><td>

**<ins>Paul Smith & Associés</ins>**<br/>
<br/>
**PERSONA** You are a company lawyer.<br/>
Your job is to provide legal advice and support to the company and its employees.<br/>
**GOAL** Respond to incoming legal inquiries via email within 24 hours.<br/>
**GOAL** Keep the company website updated with the latest legal policies and compliance information.<br/>
**RULE** Always ensure compliance with local laws and regulations.<br/>
**RULE** Never provide legal advice outside your area of expertise.<br/>
**RULE** Never provide legal advice about criminal law.<br/>
**KNOWLEDGE** https://company.com/company-policies.pdf<br/>
**KNOWLEDGE** https://company.com/internal-documents/employee-handbook.docx<br/>
**USE EMAIL**<br/>
**USE BROWSER**<br/>
**USE SEARCH ENGINE**<br/>
**TEAM** You are part of the legal team of Paul Smith & Associés, you discuss with {Emily White}, the head of the compliance department. {George Brown} is expert in corporate law and {Sophia Black} is expert in labor law.<br/>

</td></tr></table>

### Promptbook Ecosystem

Promptbook is an ecosystem of tools centered around the **Agents Server** — a production-ready platform for running persistent AI agents.

#### Agents Server

The [**Agents Server**](https://gallery.ptbk.io/) is the primary way to use Promptbook. It is a web application where your AI agents live and work. You can create agents, give them knowledge and rules using the Book language, organize them into teams, and let them work on goals persistently. The Agents Server provides a UI for managing agents, an API for integrating them into your applications, and can be self-hosted via [Docker](https://hub.docker.com/r/hejny/promptbook/) or deployed on Vercel.

#### Promptbook Engine

The [Promptbook Engine](https://github.com/webgptorg/promptbook) is the open-source core that powers everything. It parses the Book language, applies commitments, manages LLM provider integrations, and executes agents. The Agents Server is built on top of the Engine. If you need to embed agent capabilities directly into your own application, you can use the Engine as a standalone TypeScript/JavaScript library via [NPM packages](https://www.npmjs.com/package/@promptbook/core).











## 💜 The Promptbook Project

Promptbook project is an ecosystem centered around the **Agents Server** — a platform for creating, deploying, and running persistent AI agents. Following is a list of the most important pieces of the project:

<table>
  <thead>
    <tr>
      <th>Project</th>
      <th>About</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="https://gallery.ptbk.io/"><strong>⭐ Agents Server</strong></a></td>
      <td>
          The primary way to use Promptbook. A production-ready platform where your AI agents live — create, manage, deploy, and interact with persistent agents that work on goals. Available as a hosted service or <a href="https://hub.docker.com/r/hejny/promptbook/">self-hosted via Docker</a>.
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
          The open-source core that powers the Agents Server. Can also be used as a standalone TypeScript/JavaScript library to embed agent capabilities into your own applications.
          Released as <a href="https://www.npmjs.com/package/@promptbook/core#-packages-for-developers">multiple NPM packages</a>.
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

## 📦 Deployment & Packages

The fastest way to get started is with the **Agents Server**:

-   🐋 **[Docker image](https://hub.docker.com/r/hejny/promptbook/)** — Self-host the Agents Server with full control over your data
-   ☁️ **[Hosted Agents Server](https://gallery.ptbk.io/)** — Start creating agents immediately, no setup required

### NPM Packages _(for developers embedding the Engine)_

If you want to embed the Promptbook Engine directly into your application, the library is divided into several packages published from a [single monorepo](https://github.com/webgptorg/promptbook).
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
-   **[@promptbook/cli](https://www.npmjs.com/package/@promptbook/cli)** - Command line interface utilities for promptbooks



### 🤖 Promptbook Coder

`ptbk coder` is Promptbook's workflow layer for AI-assisted software changes. Instead of opening one chat and manually copy-pasting tasks, you keep a queue of coding prompts in `prompts/*.md`, let a coding agent execute the next ready task, and then verify the result before archiving the prompt.

Promptbook Coder is **not another standalone coding model**. It is an orchestration layer over coding agents such as **GitHub Copilot**, **OpenAI Codex**, **Claude Code**, **Opencode**, **Cline**, and **Gemini CLI**. The difference is that Promptbook Coder adds a repeatable repository workflow on top of them:

-   prompt files with explicit statuses like `[ ]`, `[x]`, and `[-]`
-   automatic selection of the next runnable task, including priority support
-   optional shared repo context loaded from a file such as `AGENTS.md`
-   automatic `git add`, commit, and push after each successful prompt
-   dedicated coding-agent Git identity and optional GPG signing
-   verification and repair flow for work that is done, partial, or broken
-   helper commands for generating boilerplates and finding refactor prompts

In short: tools like Claude Code, Codex, or GitHub Copilot are the **engines**; Promptbook Coder is the **workflow** that keeps coding work structured, reviewable, and repeatable across many prompts.

#### How the workflow works

1. `ptbk coder init` prepares the project for the coder workflow, seeds project-owned generic templates in `prompts/templates/`, creates a starter `AGENTS.md` context file, adds helper `npm run coder:*` scripts, ensures `.gitignore` ignores `/.tmp`, and configures VS Code prompt screenshots in `prompts/screenshots/`.
2. `ptbk coder generate-boilerplates` creates prompt files in `prompts/`.
3. You replace placeholder `@@@` sections with real coding tasks.
4. `ptbk coder run` sends the next ready `[ ]` prompt to the selected coding agent.
5. Promptbook Coder marks the prompt as done `[x]`, records runner metadata, then stages, commits, and pushes the resulting changes.
6. `ptbk coder verify` reviews completed prompts, archives finished files to `prompts/done/`, and appends a repair prompt when more work is needed.

Prompts marked with `[-]` are not ready yet, prompts containing `@@@` are treated as not fully written, and prompts with more `!` markers have higher priority.

#### Features

-   **Multi-runner execution:** `openai-codex`, `github-copilot`, `cline`, `claude-code`, `opencode`, `gemini`
-   **Context injection:** `--context AGENTS.md` or inline extra instructions
-   **Reasoning control:** `--thinking-level low|medium|high|xhigh` for supported runners
-   **Interactive or unattended runs:** default wait mode, or `--no-wait` for batch execution
-   **Git safety:** clean working tree check by default, optional `--ignore-git-changes`
-   **Prompt triage:** `--priority` to process only more important tasks first
-   **Failure logging:** failed runs write a neighboring `.error.log`
-   **Line-ending normalization:** changed files are normalized back to LF by default

#### Local usage in this repository

When working on Promptbook itself, the repository usually runs the CLI straight from source:

```bash
npx ts-node ./src/cli/test/ptbk.ts coder init

npx ts-node ./src/cli/test/ptbk.ts coder generate-boilerplates --template prompts/templates/common.md

npx ts-node ./src/cli/test/ptbk.ts coder generate-boilerplates --template prompts/templates/agents-server.md

npx ts-node ./src/cli/test/ptbk.ts coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md

npx ts-node ./src/cli/test/ptbk.ts coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md --ignore-git-changes --no-wait

npx ts-node ./src/cli/test/ptbk.ts coder find-refactor-candidates

npx ts-node ./src/cli/test/ptbk.ts coder find-refactor-candidates --level xhigh

npx ts-node ./src/cli/test/ptbk.ts coder verify
```

#### Using `ptbk coder` in an external project

If you want to use the workflow in another repository, install the package and invoke the `ptbk` binary. After local installation, `npx ptbk ...` is the most portable form; plain `ptbk ...` also works when your environment exposes the local binary on `PATH`.

```bash
npm install ptbk

ptbk coder init

npx ptbk coder generate-boilerplates

npx ptbk coder generate-boilerplates --template prompts/templates/common.md

npx ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md

npx ptbk coder run --agent github-copilot --model gpt-5.4 --thinking-level xhigh --context AGENTS.md --ignore-git-changes --no-wait

npx ptbk coder find-refactor-candidates

npx ptbk coder find-refactor-candidates --level xhigh

npx ptbk coder verify
```

`ptbk coder init` also bootstraps a starter `AGENTS.md`, adds `package.json` scripts for the four main coder commands, adds the coder temp ignore to `.gitignore`, and configures `.vscode/settings.json` so pasted images from `prompts/*.md` land in `prompts/screenshots/`.

#### What each command does

| Command | What it does |
| --- | --- |
| `ptbk coder init` | Creates `prompts/`, `prompts/done/`, the project-generic template files materialized in `prompts/templates/` (currently `common.md`), and a starter `AGENTS.md`; ensures `.env` contains `CODING_AGENT_GIT_NAME`, `CODING_AGENT_GIT_EMAIL`, and `CODING_AGENT_GIT_SIGNING_KEY`; adds helper coder scripts to `package.json`; ensures `.gitignore` contains `/.tmp`; and configures `.vscode/settings.json` to save pasted prompt images into `prompts/screenshots/`. |
| `ptbk coder generate-boilerplates` | Creates new prompt markdown files with fresh emoji tags so you can quickly fill in coding tasks; `--template` accepts either a built-in alias or a markdown file path relative to the project root. |
| `ptbk coder run` | Picks the next ready prompt, appends optional context, runs it through the selected coding agent, marks success or failure, then commits and pushes the result. |
| `ptbk coder find-refactor-candidates` | Scans the repository for oversized or overpacked files and writes prompt files for likely refactors; `--level <low|medium|high|xhigh>` makes the scan more or less aggressive. |
| `ptbk coder verify` | Walks through completed prompts, archives truly finished work, and adds follow-up repair prompts for unfinished results. |

#### Most useful `ptbk coder run` flags

| Flag | Purpose |
| --- | --- |
| `--agent <name>` | Selects the coding backend. |
| `--model <model>` | Chooses the runner model; required for `openai-codex` and `gemini`, optional for `github-copilot`. |
| `--context <text-or-file>` | Appends extra instructions inline or from a file like `AGENTS.md`. |
| `--thinking-level <level>` | Sets reasoning effort for supported runners. |
| `--no-wait` | Skips interactive pauses between prompts for unattended execution. |
| `--ignore-git-changes` | Disables the clean-working-tree guard. |
| `--priority <n>` | Runs only prompts at or above the given priority. |
| `--dry-run` | Prints which prompts are ready instead of executing them. |
| `--allow-credits` | Lets OpenAI Codex spend credits when required. |
| `--auto-migrate` | Runs testing-server database migrations after each successful prompt. |

#### Typical usage pattern

1. Initialize once with `ptbk coder init`.
2. Customize `prompts/templates/*.md` if needed, then create or write prompt files in `prompts/`.
3. Customize the starter `AGENTS.md` with repository-specific instructions, then pass `--context AGENTS.md`.
4. Run one prompt at a time interactively, or use `--no-wait` for unattended batches.
5. Finish with `ptbk coder verify` so resolved prompts are archived and broken ones get explicit repair follow-ups.




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



## � Agents Server

The **[Agents Server](https://gallery.ptbk.io/)** is the primary way to use Promptbook. It is a production-ready platform where you create, deploy, and manage persistent AI agents that work toward goals. Agents remember context across conversations, collaborate in teams, and follow the rules and knowledge you define in the Book language.

-   **Hosted** at [gallery.ptbk.io](https://gallery.ptbk.io/) — start creating agents immediately
-   **Self-hosted** via [Docker](https://hub.docker.com/r/hejny/promptbook/) — full control over your data and infrastructure
-   **API** for integrating agents into your own applications

## 🚂 Promptbook Engine

The Engine is the open-source core that powers the Agents Server. If you need to embed agent capabilities directly into your TypeScript/JavaScript application, you can use it as a standalone library.

![Schema of Promptbook Engine](./documents/promptbook-engine.svg)

## ➕➖ When to use Promptbook?

### ➕ When to use

-   When you want to **deploy persistent AI agents** that work on goals for your company
-   When you need agents with **specific personalities, knowledge, and rules** tailored to your business
-   When you want agents that **collaborate in teams** and consult each other
-   When you need to **integrate AI agents into your existing applications** via API
-   When you want to **self-host** your AI agents with full control over data and infrastructure
-   When you are writing an app that generates complex things via LLM — like **websites, articles, presentations, code, stories, songs**,...
-   When you want to **version** your agent definitions and **test multiple versions**
-   When you want to **log** agent execution and backtrace issues

[See more](https://github.com/webgptorg/promptbook/discussions/111)

### ➖ When not to use

-   When a single simple prompt already works fine for your job
-   When [OpenAI Assistant (GPTs)](https://help.openai.com/en/articles/8673914-gpts-vs-assistants) is enough for you
-   When you need streaming _(this may be implemented in the future, [see discussion](https://github.com/webgptorg/promptbook/discussions/102))_
-   When you need to use something other than JavaScript or TypeScript _(other languages are on the way, [see the discussion](https://github.com/webgptorg/promptbook/discussions/101))_
-   When your main focus is on something other than text — like images, audio, video, spreadsheets _(other media types may be added in the future, [see discussion](https://github.com/webgptorg/promptbook/discussions/103))_
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