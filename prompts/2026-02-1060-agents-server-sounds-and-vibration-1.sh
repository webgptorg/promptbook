codex \
  --ask-for-approval never \
  exec --model gpt-5.1-codex-mini \
  --sandbox danger-full-access \
  -C /c/Users/me/work/ai/promptbook \
  <<'CODEX_PROMPT'

By default, sounds should be turned off and the vibration turned on.

-   Allow to configure this through the metadata `DEFAULT_IS_SOUNDS_ON` (by default `false`) and `DEFAULT_IS_VIBRATION_ON` (by default `true`) which are boolean values _(similar to `IS_EXPERIMENTAL_VOICE_CALLING_ENABLED`)_.
-   Both of these can be separately toggled in the menu.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)

**Common rules**

- Always analyze the context and requirements before generating any code.
- Keep in mind the DRY _(don't repeat yourself)_ principle.
- Write clear, maintainable, and well-documented code.
- Write JSDoc comments for all functions, classes, types,...
- After code change, run the following tests to ensure everything works as expected: *(you don't need to run every test, run them only when you make changes that could affect them)*
    1) npm run test-name-discrepancies - tests that file names matches the exported names
    2) npm run test-spellcheck
    3) npm run test-lint
    4) npm run test-types - checks TypeScript types
    5) npm run test-package-generation - tests that build script is working correctly
    6) npm run test-unit
    7) npm run test-app-agents-server - tests that the Agents Server app is working correctly

**Additional context:**

- Attached images (if any) are relative to the root of the project.
-   **Promptbook Engine vs. Agent Server** sre two distinct parts you should know the difference:
    -   **Promptbook Engine** is the core engine that powers AI agents, it is located in `./src` folder. It is framework-agnostic and can be used in different applications. It can run as standalone javascript/typescript library, CLI environment, or be integrated into different applications. It can be also runned in Agent Server:
    -   **Agent Server** is a specific application that uses the Promptbook Engine to provide a web and API interface for creating and interacting with AI agents. It is located in `./apps/agents-server` folder.
-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
    -   Commitments are in the folder `./src/commitments`
    -   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

CODEX_PROMPT