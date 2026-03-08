import type { FindUserWalletByIdOptions } from './UserWalletRecord';
import type { UserWalletRow } from './UserWalletRow';
import { provideUserWalletTable } from './provideUserWalletTable';

/**
 * Finds raw wallet row by id.
 *
 * @private function of `userWallet`
 */
export async function findUserWalletRowById(options: FindUserWalletByIdOptions): Promise<UserWalletRow | null> {
    const userWalletTable = await provideUserWalletTable();

    const { data, error } = await userWalletTable
        .select('*')
        .eq('id', options.walletId)
        .eq('userId', options.userId)
        .is('deletedAt', null)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to find wallet record ${options.walletId}: ${error.message}`);
    }

    return (data as UserWalletRow | null) || null;
}
