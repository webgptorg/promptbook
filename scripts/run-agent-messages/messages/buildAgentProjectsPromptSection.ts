import { spaceTrim } from 'spacetrim';
import { AGENT_PROJECTS_DIRECTORY_PATH } from '../../../src/cli/cli-commands/agent-folder/agentProjectPaths';

/**
 * Options of the projects prompt section shared by every coding harness.
 */
export type AgentProjectsPromptSectionOptions = {
    /**
     * URL path of the agent projects file endpoint, for example `/agents/<agentId>/projects`.
     *
     * When known, the section teaches the agent how to link project files into the chat.
     */
    readonly projectsUrlPath?: string;
};

/**
 * Builds the `## Projects` prompt section explaining the agent-owned projects convention.
 *
 * The section is part of the prompt of every harness, so each coding agent knows it has its
 * own isolated project folders it fully controls and how to reference them in the chat.
 */
export function buildAgentProjectsPromptSection(options: AgentProjectsPromptSectionOptions = {}): string {
    const { projectsUrlPath } = options;

    return spaceTrim(
        (block) => `
            ## Projects

            You have your own projects folder \`${AGENT_PROJECTS_DIRECTORY_PATH}/\` in the current working directory. Each direct subfolder of it is one project — your own isolated environment for persistent work.

            - You have 100% control over every project folder: create, read, modify, and delete files there, run scripts and commands inside it, and keep any persistent data you need between conversations.
            - When the user asks you to build something (for example a website) or to do longer-term work, create a new project folder \`${AGENT_PROJECTS_DIRECTORY_PATH}/<project-name>/\` (use a short kebab-case name) and do the work inside it. Modify an existing project when the user refers to work you already did.
            - A project can be a git repository — you can run \`git init\` inside a project folder and commit your work there.
            - Do not touch anything outside the \`${AGENT_PROJECTS_DIRECTORY_PATH}/\` directory except the queued message file you are answering.

            ${block(buildProjectReferenceInstructions(projectsUrlPath))}
        `,
    );
}

/**
 * Builds the part of the section explaining how to reference projects in chat answers.
 */
function buildProjectReferenceInstructions(projectsUrlPath: string | undefined): string {
    if (!projectsUrlPath) {
        return spaceTrim(`
            When you mention a project or its files in your answer, reference them by the project name and the file path inside the project, for example \`${AGENT_PROJECTS_DIRECTORY_PATH}/my-website/index.html\`.
        `);
    }

    return spaceTrim(`
        You can link any project or any file of any project into the chat answer as a markdown link:

        - Link one file: \`[index.html](${projectsUrlPath}/<project-name>/files/<file-path>)\` — for example \`[Homepage](${projectsUrlPath}/my-website/files/index.html)\`
        - Link the projects dashboard listing all your projects: \`[My projects](${projectsUrlPath})\`

        Use these links whenever you want to show the user a file you created or changed in a project.
    `);
}
