import { spaceTrim } from 'spacetrim';
import { AGENT_KNOWLEDGE_DIRECTORY_PATH } from '../../../src/cli/cli-commands/agent/agentProjectPaths';

/**
 * Builds the prompt sent to the selected coding runner for one queued user-thread book.
 */
export function buildAgentMessagePrompt(messageRelativePath: string, agentSystemMessage: string): string {
    const taskPrompt = spaceTrim(
        `
            Answer 1 user question

            -   Read \`${messageRelativePath}\` and answer the most recent \`MESSAGE @User\`
            -   Use files in the \`${AGENT_KNOWLEDGE_DIRECTORY_PATH}\` folder when they are relevant
            -   Only change the queued message file by appending one new \`MESSAGE @Agent\` block
            -   Do not modify any other file
            -   If the repository does not contain enough information, say what is missing instead of inventing facts
        `,
    );

    return `${taskPrompt}\n\n**This is how you should behave:**\n\n${agentSystemMessage.trim()}`;
}
