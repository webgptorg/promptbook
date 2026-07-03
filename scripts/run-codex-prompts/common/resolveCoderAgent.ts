import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { string_book } from '../../../src/book-2.0/agent-source/string_book';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { createAgentRunnerSystemMessage } from '../../run-agent-messages/messages/createAgentRunnerSystemMessage';

/**
 * Agent data resolved from the optional `--agent` book file.
 */
export type ResolvedCoderAgent = {
    /**
     * Raw source of the agent `.book` file.
     */
    readonly agentSource: string_book;

    /**
     * Compiled system message injected into each coding prompt.
     */
    readonly systemMessage: string;
};

/**
 * Reads an optional agent `.book` file and compiles its system message for injection into coder prompts.
 *
 * Returns `undefined` when no agent path is provided.
 */
export async function resolveCoderAgent(
    agentPath: string | undefined,
    currentWorkingDirectory: string,
): Promise<ResolvedCoderAgent | undefined> {
    if (!agentPath) {
        return undefined;
    }

    const resolvedAgentPath = resolve(currentWorkingDirectory, agentPath);
    const agentSource = await readFile(resolvedAgentPath, 'utf-8').catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT' || error.code === 'EISDIR') {
            throw new NotFoundError(
                spaceTrim(`
                    Agent book \`${agentPath}\` was not found or is not a file.

                    Pass a path to a \`.book\` file in \`--agent\`.
                `),
            );
        }
        throw error;
    });

    return {
        agentSource: agentSource as string_book,
        systemMessage: await createAgentRunnerSystemMessage(agentSource as string_book),
    };
}
