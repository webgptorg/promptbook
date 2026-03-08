import type { DeleteUserWalletRecordOptions } from './UserWalletRecord';
import { provideUserWalletTable } from './provideUserWalletTable';

/**
 * Soft deletes one wallet record owned by a user.
 */
export async function deleteUserWalletRecord(options: DeleteUserWalletRecordOptions): Promise<boolean> {
    const userWalletTable = await provideUserWalletTable();
    const now = new Date().toISOString();

    const { data, error } = await userWalletTable
        .update({
            deletedAt: now,
            updatedAt: now,
        })
        .eq('id', options.walletId)
        .eq('userId', options.userId)
        .is('deletedAt', null)
        .select('id')
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return Boolean(data);
}
