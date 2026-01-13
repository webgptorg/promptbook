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
