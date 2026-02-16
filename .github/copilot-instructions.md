# Copilot Instructions for Promptbook

## Project Overview

**Promptbook** is an AI agents framework that turns scattered knowledge into AI-ready "Books". It consists of two distinct parts you must understand:

-   **Promptbook Engine** (`/src`): Core, framework-agnostic TypeScript/JavaScript library that parses and executes AI agents based on the Book language
-   **Agent Server** (`/apps/agents-server`): Next.js web application providing UI and API for creating, managing, and interacting with agents

The project is a monorepo with multiple packages in `/packages` published to NPM.

## Architecture & Key Concepts

### Book Language & Commitments

Books are agent definitions using commitments—special syntax elements defining AI agent contracts:

-   **Commitments**: Keywords like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE` that define behavior
-   **Parsing Flow**: `parseAgentSource()` (lightweight, synchronous) → `createAgentModelRequirements()` (async, applies commitments)
-   **Location**: `/src/commitments/` contains commitment implementations
-   Each commitment starts with a keyword at line beginning and defines specific agent capabilities

### Monorepo Structure

```
/src                          # Promptbook Engine core
  /commitments               # Commitment definitions (PERSONA, RULE, etc.)
  /book-2.0                 # Book language parsing & execution
  /llm-providers            # LLM integration (OpenAI, Claude, Deepseek, etc.)
  /execution                # Agent execution pipeline

/apps/agents-server         # Web UI + API (Next.js)
/packages/*/                # Published NPM packages (@promptbook/core, @promptbook/browser, etc.)
/book/                      # Book language documentation & examples
/changelog/                 # Version history (current in _current-preversion.md)
```

## Contributing Workflow

### Before Committing

1. **Register changes** in [changelog/\_current-preversion.md](/changelog/_current-preversion.md) FIRST
2. **Run tests**: `npm run test` (runs all test suites)
    - `npm run test-unit` — unit tests
    - `npm run test-types` — TypeScript type checking
    - `npm run test-lint` — code style
    - `npm run test-spellcheck` — spelling
    - `npm run test-books` — Book language validation

### Code Style & Emoji Conventions

-   Follow existing patterns in the codebase
-   Use comments for complex logic
-   **Emoji annotations** mark semantic intent:
    -   `[emoji]` — connects related places across repo
    -   `[🧠]` — decision point, needs careful thought
    -   `[💩]` — technical debt, refactor needed
    -   `[🐣]` — easter eggs
    -   `[$function]` — function has side effects (not pure)
    -   `[!!!]` (3x) — fix before pre-release
    -   `[!!!!]` (4x+) — fix urgently
    -   `[@@@]` — documentation needed
    -   `[⚫]` — never publish in any package
    -   `[🟢]` — never publish to browser packages
    -   `[🔵]` — only for @promptbook/browser
    -   `[🟡]` — only for @promptbook/cli

### Generated Code

Files marked "⚠️ WARNING: This code has been generated" must NOT be edited manually. Edit source files instead; generation will overwrite changes.

## Testing & Development

### Test Patterns

-   Jest config in [jest.config.js](jest.config.js)
-   Tests use async/await pattern
-   Snapshot tests for parsing/transformation
-   Test blocks named with clear intent: `should parse PERSONA commitment`, `should execute agent with RAG`

### Key Commands

```bash
npm run test              # Full test suite
npm run test-unit        # Jest unit tests only
npm run test-types       # TypeScript validation
npm start                # Start agents-server dev server
npm run build            # Build all packages
npm run prettify         # Format all files
```

### Type Safety

-   Monorepo uses aggressive TypeScript strict mode
-   Use `/src/_packages/types.index` for public type exports
-   All public APIs must be typed
-   Avoid `any`; use `unknown` with proper narrowing

## LLM Provider Integration

Located in `/src/llm-providers/`:

-   OpenAI (GPT-4, O3)
-   Anthropic Claude
-   Google Gemini
-   Deepseek
-   Azure OpenAI
-   Ollama

When adding model support: implement provider interface, add pricing metadata (marked `[🕕]`), test with mock LLM (`@promptbook/fake-llm`).

## Common Patterns

### Agent Execution

1. Parse agent source → AST
2. Apply commitments transformations
3. Build execution context (model, temperature, RAG, rules)
4. Execute pipeline with error handling
5. Postprocess output

### Error Handling

Use project's error types in `/src/errors/`. Provide context about which commitment or execution phase failed.

### State & Side Effects

-   Functions/classes starting with `$` have side effects (e.g., `$loadFromDatabase`)
-   Most core logic should be pure; side effects isolated to specific modules

## Deployment & Build

-   **Agent Server** deploys to Vercel (`/apps/agents-server`)
-   Vercel config: [apps/agents-server/vercel.json](apps/agents-server/vercel.json)
-   CI/CD runs full test suite on PRs
-   Pre-release versions in `v0.XXX-prerelease` format

## Quick Reference Files

-   **Architecture decisions**: [AGENTS.md](AGENTS.md), [SIGNPOST.md](SIGNPOST.md)
-   **Project status**: [TODO.md](TODO.md), [CONTRIBUTING.md](CONTRIBUTING.md)
-   **Book language guide**: [/book/GET_STARTED.md](/book/GET_STARTED.md)
-   **Type definitions**: [src/\_packages/types.index.ts](src/_packages/types.index.ts)
-   **Commitment base**: [src/commitments/\_base/](src/commitments/_base/)

##Common rules

-   Always analyze the context and requirements before generating any code.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Write clear, maintainable, and well-documented code.
-   Write JSDoc comments for all entities - functions, classes, types, top-level constants, etc.
    -   When this entity is exported from the file and it is under \`src\` folder _(not for example in the \`apps\` folder)_, it must be marked either as \`@public\` or \`@private\` at the end of the JSDoc comment.
    -   For example: "@private internal utility of <Chat/>" / "@public exported from \`@promptbook/browser\`"
    -   If you dont know, prefer to mark it as private, we can always change it to public later, but changing from public to private may cause breaking changes.
-   After code change, run the following tests to ensure everything works as expected:
    1. npm run test-name-discrepancies - tests that file names matches the exported names, for example if you export a class named "OpenAiAgent" from a file, the file should be named \`OpenAiAgent.ts\` _(not \`ClaudeAgent.ts\`)_. This helps to prevent typos and mismanagement of the project.
    2. npm run test-spellcheck - When using some new word, add it into the [dictionary](other/cspell-dictionaries)
    3. npm run test-lint - Linting
    4. npm run test-types - checks TypeScript types
    5. npm run test-package-generation - tests that build script is working correctly, also tests that all exported entities are correctly marked as public or private
    6. npm run test-unit - Unit tests
    7. npm run test-app-agents-server - Tests that the Agents Server app is working correctly
-   You don't need to run every test, run them only when you make changes which may cause them to fail
-   You (The AI coding agent) are running inside a Node process, so you are forbidden to kill all the Node processes like \`taskkill /F /IM node.exe\`, if you want to kill some dev server you have spawned, kill only that process, for example by its PID or by using some package like "kill-port" to kill the process running on specific port.

## Additional context:

-   Attached images (if any) are relative to the root of the project.
-   **Promptbook Engine vs. Agent Server** sre two distinct parts you should know the difference:
    -   **Promptbook Engine** is the core engine that powers AI agents, it is located in \`src\` folder. It is framework-agnostic and can be used in different applications. It can run as standalone javascript/typescript library, CLI environment, or be integrated into different applications. It can be also runned in Agent Server:
    -   **Agent Server** is a specific application that uses the Promptbook Engine to provide a web and API interface for creating and interacting with AI agents. It is located in \`apps/agents-server\` folder.
-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in \`agentSource\`, there are commitments like \`PERSONA\`, \`RULE\`, \`KNOWLEDGE\`, \`USE BROWSER\`, \`USE SEARCH ENGINE\`, \`META IMAGE\`, etc.
    -   Commitments are in the folder \`src/commitments\`
    -   Each commitment starts with a keyword, e.g., \`KNOWLEDGE\`, \`USE BROWSER\`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   \`parseAgentSource\` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   \`createAgentModelRequirements\` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.
