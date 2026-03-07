import type { UpdateUserWalletRecordOptions, UserWalletRecord } from './UserWalletRecord';
import { mapUserWalletRow } from './mapUserWalletRow';
import { normalizeWalletPayload } from './normalizeWalletPayload';
import { provideUserWalletTable } from './provideUserWalletTable';

/**
 * Updates one wallet record owned by a user.
 */
export async function updateUserWalletRecord(options: UpdateUserWalletRecordOptions): Promise<UserWalletRecord> {
    const payload = normalizeWalletPayload(options);
    const userWalletTable = await provideUserWalletTable();

    const { data, error } = await userWalletTable
        .update({
            ...payload,
            updatedAt: new Date().toISOString(),
        })
        .eq('id', options.walletId)
        .eq('userId', options.userId)
        .is('deletedAt', null)
        .select('*')
        .single();

    if (error || !data) {
        throw new Error(error?.message || 'Failed to update wallet record.');
    }

    return mapUserWalletRow(data);
}
