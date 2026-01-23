import { string_prompt } from '../../../src/types/typeAliases';
import { prompt } from '../../../src/pipeline/prompt-notation';


/**
 * @@@
 */
export function createCodingContext(): string_prompt {
    return prompt`

        **Common rules**

        - Always analyze the context and requirements before generating any code.
        - Keep in mind the DRY _(don't repeat yourself)_ principle.
        - Write clear, maintainable, and well-documented code.
        - Write JSDoc comments for all functions, classes, types,...
        - After code change, always run theese tests to verify the correctness:
            1) npm run test-name-discrepancies
            2) npm run test-spellcheck
            3) npm run test-lint
            4) npm run test-types
            5) npm run test-books
            6) npm run test-package-generation
            7) npm run test-unit
            8) npm run test-app-agents-server
        
        **Additional context:**

        - Attached images (if any) are relative to the root of the project.
        -   **Promptbook Engine vs. Agent Server** sre two distinct parts you should know the difference:
            -   **Promptbook Engine** is the core engine that powers AI agents, it is located in \`./src\` folder. It is framework-agnostic and can be used in different applications. It can run as standalone javascript/typescript library, CLI environment, or be integrated into different applications. It can be also runned in Agent Server:
            -   **Agent Server** is a specific application that uses the Promptbook Engine to provide a web and API interface for creating and interacting with AI agents. It is located in \`./apps/agents-server\` folder.
        -   **Commitments** are basic syntax elements that add specific functionalities to AI agents
            -   They are used in \`agentSource\`, there are commitments like \`PERSONA\`, \`RULE\`, \`KNOWLEDGE\`, \`USE BROWSER\`, \`USE SEARCH ENGINE\`, \`META IMAGE\`, etc.
            -   Commitments are in the folder \`./src/commitments\`
            -   Each commitment starts with a keyword, e.g., \`KNOWLEDGE\`, \`USE BROWSER\`, etc. on a begining of the line and end by new co
            -   Agent source with commitments is parsed by two functions:
                -   \`parseAgentSource\` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
                -   \`createAgentModelRequirements\` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

        
    `.toString();

    // <- TODO: Make "Additional context..." conditional: for example "Attached image ..." based on whether images are present
    // <- TODO: Do the adding of additional context to prompts for all runners, do it in a generic way and keep DRY
}
