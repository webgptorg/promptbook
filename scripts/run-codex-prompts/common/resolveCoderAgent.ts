import { readFile } from 'fs/promises';
import { basename, extname, relative, resolve } from 'path';
import { parseAgentSource } from '../../../src/book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../src/book-2.0/agent-source/string_book';
import { resolveLocalAgentSource } from '../../../src/cli/cli-commands/common/resolveLocalAgentSource';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { createAgentRunnerSystemMessage } from '../../run-agent-messages/messages/createAgentRunnerSystemMessage';

/**
 * Source and prompt-routing references resolved from an optional `--agent` book file.
 */
export type ResolvedCoderAgentBook = {
    /**
     * Raw source of the agent `.book` file.
     */
    readonly agentSource: string_book;

    /**
     * Human-readable name of the agent, as it is reported in prompt status lines and run traces.
     *
     * Comes from the `META FULLNAME` of the Book, or from the plain title on its first line, so it is the
     * display name of the agent and not its normalized identifier.
     */
    readonly agentName: string;

    /**
     * Equivalent references by which a prompt may target this agent.
     *
     * Includes the configured path, relative path, filename, filename without `.book`, and the
     * normalized Book title from its first line.
     */
    readonly agentReferences: ReadonlyArray<string>;
};

/**
 * Agent data resolved from the optional `--agent` book file.
 */
export type ResolvedCoderAgent = ResolvedCoderAgentBook & {
    /** Source with inheritance and imports applied, also used for the coder's agent visual. */
    readonly agentSource: string_book;

    /**
     * Compiled system message injected into each coding prompt.
     */
    readonly systemMessage: string;
    /** Books created during resolution, committed according to the coder's normal commit setting. */
    readonly createdAgentBookPaths: ReadonlyArray<string>;
};

/**
 * Reads an optional agent `.book` file and prepares the references that route prompts to it.
 *
 * Returns `undefined` when no agent path is provided.
 */
export async function resolveCoderAgentBook(
    agentBookReference: string | undefined,
    currentWorkingDirectory: string,
): Promise<ResolvedCoderAgentBook | undefined> {
    const normalizedAgentBookReference = agentBookReference?.trim();

    if (!normalizedAgentBookReference) {
        return undefined;
    }

    const resolvedAgentBookPath = resolve(currentWorkingDirectory, normalizedAgentBookReference);
    const agentSource = (await readFile(resolvedAgentBookPath, 'utf-8').catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT' || error.code === 'EISDIR') {
            throw new NotFoundError(
                spaceTrim(`
                    Agent book \`${normalizedAgentBookReference}\` was not found or is not a file.

                    Pass a path to a \`.book\` file in \`--agent\`.
                `),
            );
        }
        throw error;
    })) as string_book;

    // Note: Parsed once here, because both the display name of the agent and its routing references need it
    const parsedAgentSource = parseAgentSource(agentSource);

    return {
        agentSource,
        agentName: parsedAgentSource.meta.fullname || parsedAgentSource.agentName,
        agentReferences: createCoderAgentReferences({
            agentBookReference: normalizedAgentBookReference,
            resolvedAgentBookPath,
            currentWorkingDirectory,
            normalizedAgentNameFromBook: parsedAgentSource.agentName,
        }),
    };
}

/**
 * Reads an optional agent `.book` file and compiles its system message for injection into coder prompts.
 *
 * Returns `undefined` when no agent path is provided.
 */
export async function resolveCoderAgent(
    agentBookReference: string | undefined,
    currentWorkingDirectory: string,
): Promise<ResolvedCoderAgent | undefined> {
    const resolvedAgentBook = await resolveCoderAgentBook(agentBookReference, currentWorkingDirectory);

    if (resolvedAgentBook === undefined) {
        return undefined;
    }

    const resolvedSource = await resolveLocalAgentSource(
        resolve(currentWorkingDirectory, agentBookReference!.trim()),
        currentWorkingDirectory,
    );

    return {
        ...resolvedAgentBook,
        agentSource: resolvedSource.agentSource,
        systemMessage: await createAgentRunnerSystemMessage(resolvedSource.agentSource, {
            agentReferenceResolver: resolvedSource.agentReferenceResolver,
        }),
        createdAgentBookPaths: resolvedSource.createdAgentBookPaths,
    };
}

/**
 * Creates the path and Book-title aliases which a prompt can use to target one selected agent.
 *
 * @private internal utility of `resolveCoderAgentBook`
 */
function createCoderAgentReferences(options: {
    readonly agentBookReference: string;
    readonly resolvedAgentBookPath: string;
    readonly currentWorkingDirectory: string;
    readonly normalizedAgentNameFromBook: string;
}): string[] {
    const relativeAgentBookPath = relative(options.currentWorkingDirectory, options.resolvedAgentBookPath).replaceAll(
        '\\',
        '/',
    );
    const agentBookFileName = basename(options.resolvedAgentBookPath);
    const agentBookName = basename(options.resolvedAgentBookPath, extname(options.resolvedAgentBookPath));

    return Array.from(
        new Set(
            [
                options.agentBookReference,
                relativeAgentBookPath,
                agentBookFileName,
                agentBookName,
                options.normalizedAgentNameFromBook,
            ].filter((agentReference) => agentReference.trim() !== ''),
        ),
    );
}
