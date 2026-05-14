import { readFile } from 'fs/promises';
import { join } from 'path';
import { Book } from '../../../src/book-3.0/Book';
import { parseAgentSourceWithCommitments } from '../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../../src/book-2.0/agent-source/string_book';
import { AGENT_BOOK_FILE_PATH } from '../../../src/cli/cli-commands/agent/agentProjectPaths';
import type { AgentMessageFile } from '../messages/AgentMessageFile';

/**
 * Local metadata rendered in the rich `ptbk agent run` dashboard.
 */
export type AgentRunUiMetadata = {
    readonly localAgentName: string;
    readonly latestUserMessageLines: readonly string[];
};

/**
 * Reads the local agent title and latest queued user message for the rich agent dashboard.
 */
export async function loadAgentRunUiMetadata(
    projectPath: string,
    queuedMessage: AgentMessageFile,
): Promise<AgentRunUiMetadata> {
    const [localAgentName, queuedMessageContent] = await Promise.all([
        readLocalAgentName(projectPath),
        readFile(queuedMessage.absolutePath, 'utf-8'),
    ]);

    return {
        localAgentName,
        latestUserMessageLines: extractLatestUserMessageLines(queuedMessageContent),
    };
}

/**
 * Reads the local `agent.book` title and falls back to a stable generic name when unavailable.
 */
export async function readLocalAgentName(projectPath: string): Promise<string> {
    try {
        const agentSource = await readFile(join(projectPath, AGENT_BOOK_FILE_PATH), 'utf-8');
        return parseAgentSourceWithCommitments(agentSource as string_book).agentName || 'Local Agent';
    } catch (error) {
        if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            ((error as { code?: string }).code === 'ENOENT' || (error as { code?: string }).code === 'ENOTDIR')
        ) {
            return 'Local Agent';
        }

        throw error;
    }
}

/**
 * Extracts the latest `MESSAGE @User` block while preserving the original line breaks.
 */
export function extractLatestUserMessageLines(messageContent: string): readonly string[] {
    const latestUserMessageContent =
        [...Book.parse(messageContent as string_book).getMessages()]
            .reverse()
            .find((message) => message.sender === 'USER')?.content || messageContent;

    const normalizedLatestUserMessageContent = latestUserMessageContent.trim();
    return normalizedLatestUserMessageContent.length > 0
        ? normalizedLatestUserMessageContent.split(/\r?\n/gu)
        : [];
}
