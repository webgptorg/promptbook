import { readFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import type { string_book } from '../book-2.0/agent-source/string_book';
import { assertsError } from '../errors/assertsError';
import { NotAllowed } from '../errors/NotAllowed';
import { NotFoundError } from '../errors/NotFoundError';
import { spaceTrim } from '../utils/organization/spaceTrim';
import { Book } from './Book';

/**
 * Book source value accepted by Node-backed Book agents.
 *
 * @public exported from `@promptbook/node`
 */
export type BookNodeAgentSource = Book | string_book;

/**
 * Common source options shared by Node-backed Book agents.
 *
 * Provide either `agentPath` or `book`.
 *
 * @public exported from `@promptbook/node`
 */
export type BookNodeAgentSourceOptions = {
    readonly agentPath?: string;
    readonly book?: BookNodeAgentSource;
    readonly currentWorkingDirectory?: string;
};

/**
 * Normalized source snapshot used internally by Node-backed Book agents.
 *
 * @private internal utility of `CliAgent` and `LiteAgent`
 */
export type ResolvedBookNodeAgentSource = {
    readonly agentName: string;
    readonly agentPath: string | null;
    readonly agentSource: string_book;
    readonly currentWorkingDirectory: string;
    readonly sourceDirectoryPath: string;
};

/**
 * Resolves shared Node-backed Book source options into one normalized source snapshot.
 *
 * @private internal utility of `CliAgent` and `LiteAgent`
 */
export async function resolveBookNodeAgentSource(
    options: BookNodeAgentSourceOptions,
): Promise<ResolvedBookNodeAgentSource> {
    const hasAgentPath = typeof options.agentPath === 'string' && options.agentPath.trim().length > 0;
    const hasBook = options.book !== undefined;

    if (hasAgentPath === hasBook) {
        throw new NotAllowed(
            spaceTrim(`
                Provide exactly one of \`agentPath\` or \`book\`.

                These options are mutually exclusive because they define different source-resolution strategies.
            `),
        );
    }

    const currentWorkingDirectory = options.currentWorkingDirectory || process.cwd();

    if (hasBook) {
        const agentSource = normalizeBookNodeAgentSource(options.book!);

        return {
            agentName: resolveBookNodeAgentName(agentSource),
            agentPath: null,
            agentSource,
            currentWorkingDirectory,
            sourceDirectoryPath: currentWorkingDirectory,
        };
    }

    const absoluteAgentPath = resolve(currentWorkingDirectory, options.agentPath!);
    const agentSource = await readAgentSourceFile(absoluteAgentPath, options.agentPath!);

    return {
        agentName: resolveBookNodeAgentName(agentSource),
        agentPath: absoluteAgentPath,
        agentSource,
        currentWorkingDirectory,
        sourceDirectoryPath: dirname(absoluteAgentPath),
    };
}

/**
 * Normalizes one in-memory Book source into a persisted string.
 *
 * @private internal utility of `resolveBookNodeAgentSource`
 */
function normalizeBookNodeAgentSource(book: BookNodeAgentSource): string_book {
    if (book instanceof Book) {
        return book.stringify();
    }

    return (book.endsWith('\n') ? book : `${book}\n`) as string_book;
}

/**
 * Reads one agent source file and wraps missing-file errors into Promptbook-branded errors.
 *
 * @private internal utility of `resolveBookNodeAgentSource`
 */
async function readAgentSourceFile(absoluteAgentPath: string, agentPathReference: string): Promise<string_book> {
    try {
        return (await readFile(absoluteAgentPath, 'utf-8')) as string_book;
    } catch (error) {
        assertsError(error);

        if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'EISDIR') {
            throw new NotFoundError(
                spaceTrim(`
                    Agent book \`${agentPathReference}\` was not found or is not a file.

                    Pass a path to an existing \`.book\` file.
                `),
            );
        }

        throw error;
    }
}

/**
 * Resolves the display name used by Node-backed Book agents.
 *
 * @private internal utility of `resolveBookNodeAgentSource`
 */
function resolveBookNodeAgentName(agentSource: string_book): string {
    return Book.parse(agentSource).agentName.trim() || 'Agent';
}
