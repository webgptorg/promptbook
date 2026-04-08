import { Client } from 'pg';
import { createInsertStatement, quoteIdentifier, type SqlRecorder } from './createSqlRecorder';
import type { NormalizedCreateServerInput } from './normalizeCreateServerInput';

/**
 * Inserts server bootstrap metadata into the prefixed `Metadata` table.
 *
 * @param client - Connected PostgreSQL client inside the bootstrap transaction.
 * @param input - Normalized create-server payload.
 * @param sqlRecorder - Mutable SQL dump recorder.
 *
 * @private function of createManagedServer
 */
export async function seedServerMetadata(
    client: Client,
    input: NormalizedCreateServerInput,
    sqlRecorder: SqlRecorder,
): Promise<void> {
    const metadataTableIdentifier = quoteIdentifier(`${input.tablePrefix}Metadata`);

    for (const metadataEntry of input.metadataEntries) {
        await client.query(
            `
                INSERT INTO ${metadataTableIdentifier} ("key", "value", "note", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, now(), now())
            `,
            [metadataEntry.key, metadataEntry.value, metadataEntry.note],
        );

        sqlRecorder.addStatement(
            createInsertStatement(`${input.tablePrefix}Metadata`, {
                key: metadataEntry.key,
                value: metadataEntry.value,
                note: metadataEntry.note,
            }),
        );
    }
}
