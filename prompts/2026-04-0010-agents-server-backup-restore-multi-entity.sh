cd "/c/Users/me/work/ai/promptbook"

copilot -p "$(cat <<'GITHUB_COPILOT_PROMPT'

Enhance Agents Server backup page to allow selecting entities and exporting a single full backup file

-   You are working with the [Agents Server](apps/agents-server)
-   Extend the existing “books backup” implementation used on the server backup page; do not remake it from scratch-enhance it to support backing up additional server entities.
-   UI: on the server backup page, provide a set of checkboxes (or equivalent multi-select controls) allowing the admin to choose which aspects of the server to include in the backup.
-   Default behavior: all available aspects should be pre-checked and the download should be the “full backup” including everything the UI offers.
-   Backup aspects to support via selection (at minimum):
    -   metadata
    -   conversations
    -   users
    -   agents
    -   et cetera (provide further categories supported by the current backup base implementation; if there are additional categories, expose them similarly)
-   Export format: download as one big file by default.
-   The chosen selections must be included in the downloaded file contents.
-   Reuse: the current implementation of backing up the books must be used as the base for the server backup export logic (data extraction + file creation + download endpoint/handler); extend it to include other entity exports and compose them into the same output file.
-   Data integrity: ensure the backup file contains all data required to reconstruct the backed-up portions (as far as the current books backup format enables), including relationships needed between entities (e.g., conversations ↔ users/agents) when those portions are selected.
-   Performance/UX: show progress or at least a loading state while generating the backup; block/disable the download action while generation is running.

## How to Contribute

-   **Add changes in [Changelog](/changelog/_current-preversion.md)**
-   **Test your changes** to ensure they work as expected, use `npm test`

## Code Style

-   Follow the existing code style and structure.
-   Use comments to explain complex logic.

## Emoji in `[brackets]`

-   `[any emoji]` Connects multiple places that are related to each other across the repository
-   `[number]` Connects multiple places that are related to each other across the file
-   `[🧠]` Marks a place where there is something to decide and think about.
-   `[🕕]` List of models _(that should be progresively updated)_
    -   Prompt: Update available models and their prices, search online
-   `[🔼]` Marks an entity (function, class, type,...) in other project (like Promptbook.studio) which should be moved to this repository
-   `[🚉]` Marks an types / interfaces / structures fully serializable as JSON, not marking `string_` and `number_` prefixed aliases
-   `[🧹]` Need to implement garbage collection
-   `[🐣]` Easter eggs
-   `[💩]` Shitty code that needs refactoring
-   `$` When entity (function, class) starts by `$`, it means it is not pure and can have side effects.
-   3x `!` Marks a place that needs to be fixed before releasing a pre-release version.
-   4x (and more) `!` Marks a place that needs to be fixed as soon as possible.
-   `@@@` Marks a place where text / documentation / ... must be written.
-   [⚫] Code in this file should never be published in any package
-   [🟢] Code in this file should never be published into packages that could be imported into browser environment
-   [🔵] Code in this file should never be published outside of `@promptbook/browser`
-   [🟡] Code in this file should never be published outside of `@promptbook/cli`
-   [💞] Ignore a discrepancy between file name and entity name

## Generated code

Across the repository, there are several places where code has been generated automatically.
Do not edit these places manually, as they will be overwritten by the code generation process. Edit the source files instead.

> ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten

## Dictionary

-   **Promptbook Engine vs. Agent Server** sre two distinct parts you should know the difference:
    -   **Promptbook Engine** is the core engine that powers AI agents, it is located in `/src` folder. It is framework-agnostic and can be used in different applications. It can run as standalone javascript/typescript library, CLI environment, or be integrated into different applications. It can be also runned in Agent Server:
    -   **Agent Server** is a specific application that uses the Promptbook Engine to provide a web and API interface for creating and interacting with AI agents. It is located in `/apps/agents-server` folder.
-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
    -   Commitments are in the folder `/src/commitments`
    -   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

## Common rules

-   Always analyze the context and requirements before generating any code.
-   Write clear, maintainable, and well-documented code.
-   Write JSDoc comments for all entities - functions, classes, types, top-level constants, etc.
    -   When this entity is exported from the file and it is under `src` folder *(not for example in the `apps` folder)*, it must be marked either as `@public` or `@private` at the end of the JSDoc comment.
    -   For example: "@private internal utility of <Chat/>" / "@public exported from `@promptbook/browser`"
    -   If you don't know, prefer to mark it as private, we can always change it to public later, but changing from public to private may cause breaking changes.
-   After code change, run the following tests to ensure everything works as expected:
    1) `npm run test-name-discrepancies` - Tests that file names match the exported names.
    2) `npm run test-spellcheck` - When using some new word, add it into the [dictionary](other/cspell-dictionaries).
    3) `npm run test-lint` - Linting.
    4) `npm run test-types` - Checks TypeScript types.
    5) `npm run test-package-generation` - Tests build/package generation and public/private JSDoc coverage.
    6) `npm run test-unit` - Unit tests.
    7) `npm run test-app-agents-server` - Tests that the Agents Server app is working correctly.
-   You don't need to run every test, run them only when you make changes which may cause them to fail.
-   You (the AI coding agent) are running inside a Node process, so do not kill all Node processes such as `taskkill /F /IM node.exe`. If you need to stop something you spawned, kill only that specific process, for example by PID or by port.

## Additional context

-   Attached images (if any) are relative to the root of the project.

### The Agents Server menu *(as additional context)*

The menu of the agent server looks like this:

1. The navigation hierarchy
    - Icon and Server name _(for example Promptbook Agents Server)_
    - arrow ">" and Agents or picked agent name (organized in folders)
    - arrow ">" and the view Profile / Chat / Book of the agent or nothing if no agent is picked
2. The menu items
    - Documentation
    - System
3. Control panel and user menu
    - Control panel
    - User menu with the avatar and the name of the user

### Database migrations for Agents server *(as additional context)*

-   Migrations are located in `apps/agents-server/src/database/migrations`
-   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
-   Migrations should be backwards compatible:
    -   Meaning that earlier versions of the server should be able to run with the database after migration without any issues.
    -   This is important because we want to have the same database for production and preview environments.
    -   This database will be migrated to the latest version of the preview environment, but the production environment should be able to run with it without any issues.
    -   The only thing that can happen is that older versions of the server will not be able to use new features.
    -   Adding new columns, tables, etc. is fine, but do not remove or rename existing ones, and do not change the meaning of existing columns or tables.
    -   When in doubt, prefer to add new things instead of changing existing ones.

### Metadata of Agents server *(as additional context)*

-   There is a table called `Metadata`.
-   It has `key` and `value` fields.
-   It is a similar concept to configuration, but this configuration can be changed by administrators in the Agents Server website.

### Book Language blueprint *(as additional context)*

Book language is a domain-specific language used for defining AI agents in the Promptbook Engine and Agents server.
It has lightweight syntax and keywords (the commitments) that allow you to define the "soul" of the agent.
The book language is designed to be human-readable and easy to write, while also being powerful enough to express complex agent behaviors.

Every agent has its source defined in the book language, which is called "agent source". The agent source is parsed and processed by the Promptbook Engine to create the actual AI agent that can interact with users and perform tasks.
This agent source is internally converted to a structured format called "agent model requirements" which are the actual raw technical instructions for the AI model to run the agent.

There is a standalone book language documentation on each agent server on `/api/docs/book.md` route, for example `https://pavol-hejny.ptbk.io/api/docs/book.md`.
Use it as a reference for the syntax and semantics of the book language, and modify `apps/agents-server/src/utils/bookLanguageDocumentation/createStandaloneBookLanguageMarkdown.ts` if it is relevant to the change you are doing.

#### Commitments *(as additional context and part of Book Language)*

Commitments are basic syntax elements that add specific functionalities to AI agents written in `book` language.

-   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, `CLOSED`, etc.
-   They are in the folder `src/commitments`.
-   Each commitment starts with a keyword, e.g. `PERSONA`, `KNOWLEDGE`, `USE SEARCH ENGINE`, etc. on a beginning of the line and ends by a new commitment or the end of the book.
-   There is a general pattern that the commitment keyword is followed by a space and then by the content of the commitment, for example:
    -   `PERSONA You are a helpful assistant that helps with cooking recipes.`
    -   `USE SEARCH ENGINE Search only in French.`
-   In the commitment context, you can reference external agents, for example:
    -   `TEAM You can talk to {Criminal lawyer} and {Financial advisor}`

## Coding rules

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Keep in mind the SOLID principles.
-   Do a proper analysis of the current functionality before you start implementing.
-   Keep small responsibilities of functions and classes, avoid creating big functions or classes that do many things.
-   When throwing errors, throw [branded errors](src/errors) and use `spaceTrim` utility to write clear and well-formatted multiline detailed error messages.
    -   Format errors as markdown, for example `variables` should be in backticks and important notes can be in bold.
-   Constants should always be `UPPER_SNAKE_CASE`.
-   Boolean variables should always be prefixed with `is`, for example `isUserChatJobLeaseExpired` or `IS_DEBUG_MODE`.
-   Do not use abbreviations, for example use `isExpired` instead of `isExp`, `translateMessage` instead of `t`, etc.
    -   It is fine to use well-known abbreviations, for example `id`, `url`, `html`, etc.
-   When writing multiline strings, use `spaceTrim` utility.
-   Do only the change described in the prompt. Do not add any additional features or make any additional changes that are not described there.
    -   If you find some critical issue that is not described in the prompt, report it to `./AGENT_REPORT.md` in the root of the project.

GITHUB_COPILOT_PROMPT
)" \
    --yolo \
    --no-ask-user \
    --no-color \
    --output-format json \
    --stream off --model gpt-5.4 --reasoning-effort xhigh