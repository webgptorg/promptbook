import { Client } from 'pg';
import { hashPassword } from '../../auth';
import { createInsertStatement, quoteIdentifier, type SqlRecorder } from './createSqlRecorder';
import type { NormalizedCreateServerInput } from './normalizeCreateServerInput';

/**
 * Inserts server bootstrap users into the prefixed `User` table.
 *
 * @param client - Connected PostgreSQL client inside the bootstrap transaction.
 * @param input - Normalized create-server payload.
 * @param sqlRecorder - Mutable SQL dump recorder.
 *
 * @private function of createManagedServer
 */
export async function seedServerUsers(
    client: Client,
    input: NormalizedCreateServerInput,
    sqlRecorder: SqlRecorder,
): Promise<void> {
    const userTableIdentifier = quoteIdentifier(`${input.tablePrefix}User`);

    for (const user of input.users) {
        const passwordHash = await hashPassword(user.password);

        await client.query(
            `
                INSERT INTO ${userTableIdentifier} ("username", "passwordHash", "isAdmin", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, now(), now())
            `,
            [user.username, passwordHash, user.isAdmin],
        );

        sqlRecorder.addStatement(
            createInsertStatement(`${input.tablePrefix}User`, {
                username: user.username,
                passwordHash,
                isAdmin: user.isAdmin,
            }),
        );
    }
}
