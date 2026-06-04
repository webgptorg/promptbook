import { createAgentPersistenceRecords } from '../../../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/createAgentPersistenceRecords';
import type { Client } from 'pg';
import { loadDefaultAgentBooks } from '../../defaultAgents/loadDefaultAgentBooks';
import { createInsertStatement, quoteIdentifier, type SqlRecorder } from './createSqlRecorder';
import type { NormalizedCreateServerInput } from './normalizeCreateServerInput';

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
