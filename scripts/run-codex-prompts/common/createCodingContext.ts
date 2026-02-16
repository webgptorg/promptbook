import { prompt } from '../../../src/pipeline/prompt-notation';
import { string_prompt } from '../../../src/types/typeAliases';

/**
 * Builds the common coding context appended to runner prompts.
 */
export function createCodingContext(): string_prompt {
    return prompt`

        **Common rules**

        - Always analyze the context and requirements before generating any code.
        - Keep in mind the DRY _(don't repeat yourself)_ principle.
        - Write clear, maintainable, and well-documented code.
        - Write JSDoc comments for all entities - functions, classes, types, top-level constants, etc.
            - When this entity is exported from the file and it is under \`src\` folder *(not for example in the \`apps\` folder)*, it must be marked either as \`@public\` or \`@private\` at the end of the JSDoc comment.
            - For example: "@private internal utility of <Chat/>" / "@public exported from \`@promptbook/browser\`"
            - If you dont know, prefer to mark it as private, we can always change it to public later, but changing from public to private may cause breaking changes.
        - After code change, run the following tests to ensure everything works as expected:
            1) npm run test-name-discrepancies - tests that file names matches the exported names, for example if you export a class named "OpenAiAgent" from a file, the file should be named \`OpenAiAgent.ts\` *(not \`ClaudeAgent.ts\`)*. This helps to prevent typos and mismanagement of the project.
            2) npm run test-spellcheck - When using some new word, add it into the [dictionary](other/cspell-dictionaries)
            3) npm run test-lint - Linting
            4) npm run test-types - checks TypeScript types
            5) npm run test-package-generation - tests that build script is working correctly, also tests that all exported entities are correctly marked as public or private
            6) npm run test-unit - Unit tests
            7) npm run test-app-agents-server - Tests that the Agents Server app is working correctly
        - You don't need to run every test, run them only when you make changes which may cause them to fail
        - You (The AI coding agent) are running inside a Node process, so you are forbidden to kill all the Node processes like \`taskkill /F /IM node.exe\`, if you want to kill some dev server you have spawned, kill only that process, for example by its PID or by using some package like "kill-port" to kill the process running on specific port.
        
        
        **Additional context:**

        - Attached images (if any) are relative to the root of the project.
        -   **Promptbook Engine vs. Agent Server** sre two distinct parts you should know the difference:
            -   **Promptbook Engine** is the core engine that powers AI agents, it is located in \`src\` folder. It is framework-agnostic and can be used in different applications. It can run as standalone javascript/typescript library, CLI environment, or be integrated into different applications. It can be also runned in Agent Server:
            -   **Agent Server** is a specific application that uses the Promptbook Engine to provide a web and API interface for creating and interacting with AI agents. It is located in \`apps/agents-server\` folder.
        -   **Commitments** are basic syntax elements that add specific functionalities to AI agents
            -   They are used in \`agentSource\`, there are commitments like \`PERSONA\`, \`RULE\`, \`KNOWLEDGE\`, \`USE BROWSER\`, \`USE SEARCH ENGINE\`, \`META IMAGE\`, etc.
            -   Commitments are in the folder \`src/commitments\`
            -   Each commitment starts with a keyword, e.g., \`KNOWLEDGE\`, \`USE BROWSER\`, etc. on a begining of the line and end by new commitment or end of the source
            -   Agent source with commitments is parsed by two functions:
                -   \`parseAgentSource\` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
                -   \`createAgentModelRequirements\` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

        
    `.toString();

    // <- TODO: Make "Additional context..." conditional: for example "Attached image ..." based on whether images are present
    // <- TODO: Do the adding of additional context to prompts for all runners, do it in a generic way and keep DRY
}
