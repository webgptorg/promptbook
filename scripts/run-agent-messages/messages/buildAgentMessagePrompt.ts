import { spaceTrim } from 'spacetrim';

/**
 * Builds the prompt sent to the selected coding runner for one queued user-thread book.
 */
export function buildAgentMessagePrompt(messageRelativePath: string, agentSystemMessage: string): string {
    const taskPrompt = spaceTrim(
        `
            Answer 1 user question

            -   Read \`${messageRelativePath}\` and answer the most recent \`MESSAGE @User\`
            -   Only change the queued message file by appending one new \`MESSAGE @Agent\` block
            -   Do not modify any other file in the repository
        `,
    );

    return `${taskPrompt}\n\n**This is how you should behave:**\n\n${agentSystemMessage.trim()}`;
}
