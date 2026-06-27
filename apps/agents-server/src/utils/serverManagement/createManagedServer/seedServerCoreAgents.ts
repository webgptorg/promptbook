import type { Client } from 'pg';
import { createAgentPersistenceRecords } from '../../../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/createAgentPersistenceRecords';
import { DEFAULT_AGENT_VISIBILITY } from '../../agentVisibility';
import { CORE_AGENT_DIRECTORY_NAME, loadCoreAgentBooks } from '../../defaultAgents/loadDefaultAgentBooks';
import { createInsertStatement, quoteIdentifier, type SqlRecorder } from './createSqlRecorder';
import type { NormalizedCreateServerInput } from './normalizeCreateServerInput';

/**
 * Loads bundled `.core` agent books from the repository and persists them into the newly created server.
 *
 * Each `*.book` file in `agents/default/.core` becomes one persisted agent in the `.core` folder with its initial
 * history snapshot.
 *
 * @param client - Connected PostgreSQL client inside the bootstrap transaction.
 * @param input - Normalized create-server payload.
 * @param sqlRecorder - Mutable SQL dump recorder.
 *
 * @private function of createManagedServer
 */
export async function seedServerCoreAgents(
    client: Client,
    input: NormalizedCreateServerInput,
    sqlRecorder: SqlRecorder,
): Promise<void> {
    const coreAgentBooks = await loadCoreAgentBooks();
    if (coreAgentBooks.length === 0) {
        return;
    }

    const coreFolderId = await insertCoreFolder(client, input, sqlRecorder);
    const agentTableIdentifier = quoteIdentifier(`${input.tablePrefix}Agent`);
    const agentHistoryTableIdentifier = quoteIdentifier(`${input.tablePrefix}AgentHistory`);

    for (const [index, coreAgentBook] of coreAgentBooks.entries()) {
        const createdAt = new Date().toISOString();
        const { agentInsertRecord, agentHistoryInsertRecord } = createAgentPersistenceRecords(
            coreAgentBook,
            { folderId: coreFolderId, sortOrder: index, visibility: DEFAULT_AGENT_VISIBILITY },
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
                    "sortOrder",
                    "visibility"
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10, $11, $12)
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
                coreFolderId,
                agentInsertRecord.sortOrder ?? index,
                agentInsertRecord.visibility ?? DEFAULT_AGENT_VISIBILITY,
            ],
        );
        sqlRecorder.addStatement(
            createInsertStatement(`${input.tablePrefix}Agent`, {
                ...agentInsertRecord,
                agentProfile: JSON.stringify(agentInsertRecord.agentProfile),
                usage: JSON.stringify(agentInsertRecord.usage),
                folderId: coreFolderId,
                sortOrder: agentInsertRecord.sortOrder ?? index,
                visibility: agentInsertRecord.visibility ?? DEFAULT_AGENT_VISIBILITY,
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
 * Inserts the `.core` folder row for the newly bootstrapped server.
 *
 * @param client - Connected PostgreSQL client inside the bootstrap transaction.
 * @param input - Normalized create-server payload.
 * @param sqlRecorder - Mutable SQL dump recorder.
 * @returns Identifier of the inserted `.core` folder.
 *
 * @private function of createManagedServer
 */
async function insertCoreFolder(
    client: Client,
    input: NormalizedCreateServerInput,
    sqlRecorder: SqlRecorder,
): Promise<number> {
    const agentFolderTableIdentifier = quoteIdentifier(`${input.tablePrefix}AgentFolder`);
    const createdAt = new Date().toISOString();
    const insertResult = await client.query<{ id: number }>(
        `
            INSERT INTO ${agentFolderTableIdentifier} (
                "name",
                "parentId",
                "sortOrder",
                "icon",
                "color",
                "createdAt",
                "updatedAt"
            )
            VALUES ($1, NULL, $2, NULL, NULL, $3, NULL)
            RETURNING "id"
        `,
        [CORE_AGENT_DIRECTORY_NAME, 0, createdAt],
    );

    sqlRecorder.addStatement(
        createInsertStatement(`${input.tablePrefix}AgentFolder`, {
            name: CORE_AGENT_DIRECTORY_NAME,
            parentId: null,
            sortOrder: 0,
            icon: null,
            color: null,
            createdAt,
            updatedAt: null,
        }),
    );

    return insertResult.rows[0].id;
}
