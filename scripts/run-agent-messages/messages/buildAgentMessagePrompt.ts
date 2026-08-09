import { spaceTrim } from 'spacetrim';
import { AGENT_PROJECTS_DIRECTORY_PATH } from '../../../src/book-3.0/agentFolderPaths';
import {
    buildAgentProjectsPromptSection,
    type AgentProjectsPromptSectionOptions,
} from './buildAgentProjectsPromptSection';
import { buildAgentTeamPromptSection, type AgentTeamPromptWorkspace } from './buildAgentTeamPromptSection';

/**
 * Options adjusting the generated agent message prompt.
 */
export type BuildAgentMessagePromptOptions = AgentProjectsPromptSectionOptions & {
    /**
     * Optional local TEAM roster prepared by the Agents Server for this user turn.
     */
    teamWorkspace?: AgentTeamPromptWorkspace;
};

/**
 * Builds the prompt sent to the selected coding runner for one queued user-thread book.
 */
export function buildAgentMessagePrompt(
    messageRelativePath: string,
    agentSystemMessage: string,
    options: BuildAgentMessagePromptOptions = {},
): string {
    return spaceTrim(
        (block) =>
            `
                # Answer 1 user question

                -   Read \`${messageRelativePath}\` and answer the most recent \`MESSAGE @User\`
                -   Only change the queued message file by appending one new \`MESSAGE @Agent\` block
                ${block(buildAllowedFileChangesPromptLine(options.teamWorkspace))}

                ## Rules for the answering

                ## Formatting

                - You can use Markdown formatting in the messages like **bold** or *italic*

                ## Sources and citations

                Mark sources and citations like this "【https://example.com/document123.pdf 】"

                At the same time, you can write sources naturally in the text of the answers

                For example:

                > According to paragraph §745b, the fee can be waived for a person over 65 years old. 【https://praha13.cz/2026/paragraph-745.doc】

                - "paragraph §745b" fits naturally in the text.
                - "【https://praha13.cz/2026/paragraph-745.doc】" The exact format of the quote is important for further processing of the answer.
                - The "【" and "】" symbols are used to mark the source and will be parsed, inside should be valid URL used as a source for the answer.

                ## Quick buttons

                If there is a meaningful follow-up procedure, use quick buttons at the end of the answer:

                \`\`\`
                How big is the contract you are posting?

                [Up to 50,000 CZK](?message=We are posting an order up to 50,000 CZK)
                [Up to 100,000 CZK](?message=We are posting an order up to 100,000 CZK)
                [Over 100,000 CZK](?messageDraft=We are posting an order over 100,000 CZK)
                \`\`\`

                - You can use \`message\` for message that will be sent immediately after clicking the button, or \`messageDraft\` for message that will be prefilled in the input field for editing before sending.

                ${block(buildAgentProjectsPromptSection(options))}

                ${block(buildAgentTeamPromptSection(options.teamWorkspace))}

                ## This is how you should behave

                ${block(agentSystemMessage)}
            `,
    );
}

/**
 * Explains the exact files that one coding harness may change for a user turn.
 */
function buildAllowedFileChangesPromptLine(teamWorkspace: AgentTeamPromptWorkspace | undefined): string {
    if (!teamWorkspace) {
        return `-   Do not modify any other file in the repository, except files inside your own \`${AGENT_PROJECTS_DIRECTORY_PATH}/\` directory`;
    }

    return `-   Do not modify any other file in the repository, except files inside your own \`${AGENT_PROJECTS_DIRECTORY_PATH}/\` directory and new consultation transcripts inside \`${teamWorkspace.relativeWorkspacePath.replace(
        /\\/gu,
        '/',
    )}\``;
}
