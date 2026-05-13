import { spaceTrim } from 'spacetrim';
import {
    AGENT_BOOK_FILE_PATH,
    AGENT_BOOK_LANGUAGE_MANUAL_FILE_PATH,
    AGENT_KNOWLEDGE_DIRECTORY_PATH,
} from '../../../src/cli/cli-commands/agent/agentProjectPaths';

/**
 * Builds the prompt sent to the selected coding runner for one queued user-thread book.
 */
export function buildAgentMessagePrompt(messageRelativePath: string): string {
    return spaceTrim(
        `
            Answer 1 user question

            -   Read \`${messageRelativePath}\` and answer the most recent \`MESSAGE @User\`
            -   Use \`${AGENT_BOOK_FILE_PATH}\` as the source of truth for the local agent behavior
            -   If \`${AGENT_BOOK_LANGUAGE_MANUAL_FILE_PATH.replace(/\\/gu, '/')}\` exists, use it as the local Book Language reference instead of guessing syntax
            -   Use files in the \`${AGENT_KNOWLEDGE_DIRECTORY_PATH}\` folder when they are relevant
            -   Only change the queued message file by appending one new \`MESSAGE @Agent\` block
            -   Do not modify any other file
            -   If the repository does not contain enough information, say what is missing instead of inventing facts
        `,
    );
}
