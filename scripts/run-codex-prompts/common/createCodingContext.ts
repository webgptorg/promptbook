import { prompt } from '../../../src/pipeline/prompt-notation';
import { string_prompt } from '../../../src/types/typeAliases';

/**
 * Builds the common coding context appended to runner prompts.
 */
export function createCodingContext(): string_prompt {
    return prompt`

        ## Common rules

        - Always analyze the context and requirements before generating any code.
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
        
        
        ## Additional context:

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

        ## Coding rules

        -   Keep in mind the DRY _(don't repeat yourself)_ principle.
        -   Keep in mind the SOLID principles
        -   Do a proper analysis of the current functionality before you start implementing.
        -  Keep small responsibilities of functions and classes, avoid creating big functions or classes that do many things.
        -  DO only the change described here above DO not add any additional features or make any additional changes that are not described in the prompt.
            - If you find some critical issue that is not described in the prompt, report it to the file \`./AGENT_REPORT.md\` on the root of the project


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

        -   Migrations are located in \`/apps/agents-server/src/database/migrations\`
        -   Be aware that table names in migrations have prefix \`prefix_\` _(look at existing migrations for reference)_

        ### Metadata of Agents server *(as additional context)*

        -   There is a table called \`Metadata\`
        -   It has \`key\` and \`value\` fields
        -   It is a similar concept to configuration, but this configuration can be changed by the administrators in the Agents server website.

        ### Book language *(as additional context)*

        Book language is a domain-specific language used for defining AI agents in the Promptbook Engine and Agents server.
        It has lightweight syntax and keywords (the commitments) that allow you to define the "soul" of the agent.
        The book language is designed to be human-readable and easy to write, while also being powerful enough to express complex agent behaviors.

        Every agent has its source defined in the book language, which is called "agent source". The agent source is parsed and processed by the Promptbook Engine to create the actual AI agent that can interact with users and perform tasks.
        This agent source is internaly converted to a structured format called "agent model requirements" which are the actual raw technical instructions for the AI model to run the agent.


        ### Commitments *(as additional context)*

        Commitments are basic syntax elements that add specific functionalities to AI agents written in \`book\` language.

        -   They are used in \`agentSource\`, there are commitments like \`PERSONA\`, \`RULE\`, \`KNOWLEDGE\`, \`USE BROWSER\`, \`USE SEARCH ENGINE\`, \`META IMAGE\`, \`CLOSED\`, etc.
        -   Commitments are in the folder \`/src/commitments\`
        -   Each commitment starts with a keyword, e.g., \`PERSONA\`, \`KNOWLEDGE\`, \`USE SEARCH ENGINE\`, etc. on a begining of the line and end by new commitment or end of the book.
        -   There is a general pattern that commitment keyword is followed by a space and then by the content of the commitment which adds specific human-readable free text information or instructions associated with that commitment, for example:
            -   \`PERSONA You are a helpful assistant that helps with cooking recipes.\` - \`PERSONA\` is the commitment keyword, and "You are a helpful assistant that helps with cooking recipes." is the content of the commitment which gives specific instructions
            -   \`USE SEARCH ENGINE Search only in French.\` - \`USE SEARCH ENGINE\` is the commitment keyword, and "Search only in French." are the specific instructions for the searching.
        -   In the commitment context, you can reference external agents, for example:
            -   \`TEAM You can talk to {Criminal lawyer} and {Financial advisor}\`
        -   Agent source with commitments is parsed by two functions:
            -   \`parseAgentSource\` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
            -   \`createAgentModelRequirements\` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.
         
        
    `.toString();

    // <- TODO: Make "Additional context..." conditional: for example "Attached image ..." based on whether images are present
    // <- TODO: Do the adding of additional context to prompts for all runners, do it in a generic way and keep DRY
}
