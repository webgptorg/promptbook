import type { UserWalletRecord, UserWalletRecordType } from './UserWalletRecord';
import type { UserWalletRow } from './UserWalletRow';

/**
 * Maps raw row to normalized wallet record.
 *
 * @private function of `userWallet`
 */
export function mapUserWalletRow(row: UserWalletRow): UserWalletRecord {
    return {
        id: row.id,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        userId: row.userId,
        isUserScoped: row.isUserScoped,
        agentPermanentId: row.agentPermanentId,
        recordType: row.recordType as UserWalletRecordType,
        service: row.service,
        key: row.key,
        jsonSchema: row.jsonSchema,
        username: row.username,
        password: row.password,
        secret: row.secret,
        cookies: row.cookies,
        isGlobal: row.isGlobal,
        deletedAt: row.deletedAt,
    };
}
