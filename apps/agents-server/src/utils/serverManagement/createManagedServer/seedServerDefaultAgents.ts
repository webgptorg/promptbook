import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { string_book } from '../../../../../../src/book-2.0/agent-source/string_book';
import { createAgentPersistenceRecords } from '../../../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/createAgentPersistenceRecords';
import { DatabaseError } from '../../../../../../src/errors/DatabaseError';
import type { Client } from 'pg';
import { spaceTrim } from 'spacetrim';
import { createInsertStatement, quoteIdentifier, type SqlRecorder } from './createSqlRecorder';
import type { NormalizedCreateServerInput } from './normalizeCreateServerInput';

/**
 * Candidate directories where bundled default agent books can be located.
 *
 * The app test suite runs from `apps/agents-server`, while local development usually runs from the repository root.
 *
 * @private function of createManagedServer
 */
const DEFAULT_AGENT_DIRECTORY_CANDIDATES = [
    resolve(process.cwd(), 'agents', 'default'),
    resolve(process.cwd(), '..', '..', 'agents', 'default'),
    resolve(__dirname, '../../../../../../agents/default'),
] as const;

/**
 * Loads default agent books from the repository and persists them into the newly created server.
 *
 * Each `*.book` file in `agents/default` becomes one persisted agent with its initial history snapshot.
 *
 * @param client - Connected PostgreSQL client inside the bootstrap transaction.
 * @param input - Normalized create-server payload.
 * @param sqlRecorder - Mutable SQL dump recorder.
 *
 * @private function of createManagedServer
 */
export async function seedServerDefaultAgents(
    client: Client,
    input: NormalizedCreateServerInput,
    sqlRecorder: SqlRecorder,
): Promise<void> {
    const defaultAgentBooks = await loadDefaultAgentBooks();
    const agentTableIdentifier = quoteIdentifier(`${input.tablePrefix}Agent`);
    const agentHistoryTableIdentifier = quoteIdentifier(`${input.tablePrefix}AgentHistory`);

    for (const [index, defaultAgentBook] of defaultAgentBooks.entries()) {
        const createdAt = new Date().toISOString();
        const { agentInsertRecord, agentHistoryInsertRecord } = createAgentPersistenceRecords(
            defaultAgentBook,
            { sortOrder: index },
            createdAt,
        );

        await client.query(
            `
                INSERT INTO ${agentTableIdentifier} (
                    "agentName",
                    "createdAt",
                    "updatedAt",
                    "permanentId",
                    "agentHash",
                    "agentSource",
                    "agentProfile",
                    "promptbookEngineVersion",
                    "usage",
                    "folderId",
                    "sortOrder"
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10, $11)
            `,
            [
                agentInsertRecord.agentName,
                agentInsertRecord.createdAt,
                agentInsertRecord.updatedAt,
                agentInsertRecord.permanentId,
                agentInsertRecord.agentHash,
                agentInsertRecord.agentSource,
                JSON.stringify(agentInsertRecord.agentProfile),
                agentInsertRecord.promptbookEngineVersion,
                JSON.stringify(agentInsertRecord.usage),
                agentInsertRecord.folderId ?? null,
                agentInsertRecord.sortOrder ?? index,
            ],
        );
        sqlRecorder.addStatement(
            createInsertStatement(`${input.tablePrefix}Agent`, {
                ...agentInsertRecord,
                agentProfile: JSON.stringify(agentInsertRecord.agentProfile),
                usage: JSON.stringify(agentInsertRecord.usage),
                folderId: agentInsertRecord.folderId ?? null,
                sortOrder: agentInsertRecord.sortOrder ?? index,
            }),
        );

        await client.query(
            `
                INSERT INTO ${agentHistoryTableIdentifier} (
                    "createdAt",
                    "agentName",
                    "permanentId",
                    "agentHash",
                    "previousAgentHash",
                    "agentSource",
                    "promptbookEngineVersion",
                    "versionName"
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `,
            [
                agentHistoryInsertRecord.createdAt,
                agentHistoryInsertRecord.agentName,
                agentHistoryInsertRecord.permanentId,
                agentHistoryInsertRecord.agentHash,
                agentHistoryInsertRecord.previousAgentHash,
                agentHistoryInsertRecord.agentSource,
                agentHistoryInsertRecord.promptbookEngineVersion,
                agentHistoryInsertRecord.versionName,
            ],
        );
        sqlRecorder.addStatement(createInsertStatement(`${input.tablePrefix}AgentHistory`, agentHistoryInsertRecord));
    }
}

/**
 * Loads all default agent books in deterministic filename order.
 *
 * @returns Sorted default agent sources.
 *
 * @private function of `seedServerDefaultAgents`
 */
async function loadDefaultAgentBooks(): Promise<ReadonlyArray<string_book>> {
    const defaultAgentDirectory = await resolveDefaultAgentDirectory();
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
 * Resolves the repository directory that stores default managed-server agents.
 *
 * @returns Absolute path to `agents/default`.
 *
 * @private function of `seedServerDefaultAgents`
 */
async function resolveDefaultAgentDirectory(): Promise<string> {
    for (const directoryCandidate of DEFAULT_AGENT_DIRECTORY_CANDIDATES) {
        try {
            await access(directoryCandidate);
            return directoryCandidate;
        } catch {
            // Continue to the next candidate directory.
        }
    }

    throw new DatabaseError(
        spaceTrim(`
            Failed to locate the default Agents Server books directory.

            Checked:
            ${DEFAULT_AGENT_DIRECTORY_CANDIDATES.map((candidate) => `- \`${normalizePathForLogs(candidate)}\``).join('\n')}
        `),
    );
}

/**
 * Normalizes path separators for diagnostics.
 *
 * @param value - Raw filesystem path.
 * @returns Slash-normalized path.
 *
 * @private function of `seedServerDefaultAgents`
 */
function normalizePathForLogs(value: string): string {
    return value.split('\\').join('/');
}
