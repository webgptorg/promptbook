import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { DatabaseError } from '../../../../../src/errors/DatabaseError';
import { spaceTrim } from 'spacetrim';

/**
 * Options for loading bundled default agent books.
 *
 * @private utility of Agents Server default-agent seeding
 */
export type LoadDefaultAgentBooksOptions = {
    /**
     * Optional explicit directory containing `*.book` files.
     */
    readonly defaultAgentDirectory?: string | null;
};

/**
 * Candidate directories where bundled default agent books can be located.
 *
 * The app test suite runs from `apps/agents-server`, local development usually runs from the repository root, and
 * installer scripts can pass an explicit directory through `LoadDefaultAgentBooksOptions`.
 *
 * @private utility of Agents Server default-agent seeding
 */
const DEFAULT_AGENT_DIRECTORY_CANDIDATES = [
    resolve(process.cwd(), 'agents', 'default'),
    resolve(process.cwd(), '..', '..', 'agents', 'default'),
    resolve(__dirname, '../../../../../agents/default'),
] as const;

/**
 * Loads all default agent books in deterministic filename order.
 *
 * @param options - Optional explicit default-agent directory.
 * @returns Sorted default agent sources.
 *
 * @private utility of Agents Server default-agent seeding
 */
export async function loadDefaultAgentBooks(
    options: LoadDefaultAgentBooksOptions = {},
): Promise<ReadonlyArray<string_book>> {
    const defaultAgentDirectory = await resolveDefaultAgentDirectory(options);
    const directoryEntries = await readdir(defaultAgentDirectory);
    const defaultAgentFilenames = directoryEntries
        .filter((entry) => entry.toLowerCase().endsWith('.book'))
        .sort((leftFilename, rightFilename) => leftFilename.localeCompare(rightFilename));

    return Promise.all(
        defaultAgentFilenames.map(async (filename) => {
            const filePath = resolve(defaultAgentDirectory, filename);
            return (await readFile(filePath, 'utf-8')) as string_book;
        }),
    );
}

/**
 * Resolves the repository directory that stores default agent books.
 *
 * @param options - Optional explicit default-agent directory.
 * @returns Absolute path to `agents/default`.
 *
 * @private utility of Agents Server default-agent seeding
 */
export async function resolveDefaultAgentDirectory(options: LoadDefaultAgentBooksOptions = {}): Promise<string> {
    const directoryCandidates = [
        ...(options.defaultAgentDirectory ? [resolve(options.defaultAgentDirectory)] : []),
        ...DEFAULT_AGENT_DIRECTORY_CANDIDATES,
    ];

    for (const directoryCandidate of directoryCandidates) {
        try {
            await access(directoryCandidate);
            return directoryCandidate;
        } catch {
            // Continue to the next candidate directory.
        }
    }

    throw new DatabaseError(
        spaceTrim(
            (block) => `
                Failed to locate the default Agents Server books directory.

                Checked:
                ${block(directoryCandidates.map((candidate) => `- \`${normalizePathForLogs(candidate)}\``).join('\n'))}
            `,
        ),
    );
}

/**
 * Normalizes path separators for diagnostics.
 *
 * @param value - Raw filesystem path.
 * @returns Slash-normalized path.
 *
 * @private utility of Agents Server default-agent seeding
 */
function normalizePathForLogs(value: string): string {
    return value.split('\\').join('/');
}
