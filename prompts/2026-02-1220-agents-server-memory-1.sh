codex \
  --ask-for-approval never \
  exec --model gpt-5.3-codex \
  --local-provider none \
  --sandbox danger-full-access \
  -C /c/Users/me/work/ai/promptbook \
  <<'CODEX_PROMPT'

Implement user memory

```book
My personal AI Agent

PERSONA Lawyer specialized in intellectual property.
MEMORY Remember projects user is working on
CLOSED
```

-   Add commitment `MEMORY` that will be used to store user memories. It should internally create a tool call to store and retrieve user memories, but the user should not see this, they should just use `MEMORY` commitment in the book to store and retrieve memories.
-   You can add additional instructions to the MEMORY commitment which will be added into the Agent model Requirements system message.
    -   `MEMORY Remember only things about the moral values of the user.`
    -   Look how this mechanism is implemented for example in the `USE SEARCH ENGINE` commitment.
-   User memories should be saved as user data. They are connected with locked-in user. The `admin` with `ADMIN_PASSWORD` is user "admin" and also has its own memory. When the user is deleted, the memory should be deleted as well.
-   User memories are per user and per agent.
-   When the agents are talking together in a `TEAM`, they don't have memories.
-   User memories should be stored in a table `UserMemory`
-   Create database migration for the change
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
-   Create a chip for the memory retrieval, and when the memory is used, show the chip.
    -   Look how other chips in the system work, for example `USE SEARCH ENGINE`, `KNOWLEDGE`, `TEAM`, and do the same for `MEMORY`. The chip should show the content of the memory that is retrieved or stored.
-   Create a simple menu under "System" -> "User Memory" where the user can see all the memories that are stored for the logged in user, and also do CRUD operations on them.
    -   User should see this memory per agent.
    -   But the user has the option to make one memory global.
-   When the user is not logged in, the memories are disabled
    -   But still, in other mechanisms (like self-learning), it is working as it is working now. Do not change them in any way.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   This is a big change. Do a proper analysis of the project before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

**Common rules**

- Always analyze the context and requirements before generating any code.
- Keep in mind the DRY _(don't repeat yourself)_ principle.
- Write clear, maintainable, and well-documented code.
- Write JSDoc comments for all entities - functions, classes, types, top-level constants, etc.
    - When this entity is exported from the file and it is under `src` folder *(not for example in the `apps` folder)*, it must be marked either as `@public` or `@private` at the end of the JSDoc comment.
    - For example: "@private internal utility of <Chat/>" / "@public exported from `@promptbook/browser`"
    - If you dont know, prefer to mark it as private, we can always change it to public later, but changing from public to private may cause breaking changes.
- After code change, run the following tests to ensure everything works as expected:
    1) npm run test-name-discrepancies - tests that file names matches the exported names, for example if you export a class named "OpenAiAgent" from a file, the file should be named `OpenAiAgent.ts` *(not `ClaudeAgent.ts`)*. This helps to prevent typos and mismanagement of the project.
    2) npm run test-spellcheck - When using some new word, add it into the [dictionary](other/cspell-dictionaries)
    3) npm run test-lint - Linting
    4) npm run test-types - checks TypeScript types
    5) npm run test-package-generation - tests that build script is working correctly, also tests that all exported entities are correctly marked as public or private
    6) npm run test-unit - Unit tests
    7) npm run test-app-agents-server - Tests that the Agents Server app is working correctly
- you don't need to run every test, run them only when you make changes which may cause them to fail


**Additional context:**

- Attached images (if any) are relative to the root of the project.
-   **Promptbook Engine vs. Agent Server** sre two distinct parts you should know the difference:
    -   **Promptbook Engine** is the core engine that powers AI agents, it is located in `src` folder. It is framework-agnostic and can be used in different applications. It can run as standalone javascript/typescript library, CLI environment, or be integrated into different applications. It can be also runned in Agent Server:
    -   **Agent Server** is a specific application that uses the Promptbook Engine to provide a web and API interface for creating and interacting with AI agents. It is located in `apps/agents-server` folder.
-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
    -   Commitments are in the folder `src/commitments`
    -   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

CODEX_PROMPT