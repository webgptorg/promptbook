import type { FindUserWalletByIdOptions, UserWalletRecord } from './UserWalletRecord';
import { findUserWalletRowById } from './findUserWalletRowById';
import { mapUserWalletRow } from './mapUserWalletRow';

/**
 * Finds one wallet record by id for a specific user.
 */
export async function findUserWalletRecordById(options: FindUserWalletByIdOptions): Promise<UserWalletRecord | null> {
    const row = await findUserWalletRowById(options);
    return row ? mapUserWalletRow(row) : null;
}
