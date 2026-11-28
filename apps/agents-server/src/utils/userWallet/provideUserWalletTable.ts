import { $getTableName } from '@/src/database/$getTableName';
import { $provideSupabaseForServer } from '@/src/database/$provideSupabaseForServer';

/**
 * Returns a scoped Supabase table client for `Wallet`.
 *
 * @private function of `userWallet`
 */
export async function provideUserWalletTable() {
    const tableName = await $getTableName('Wallet');
    const supabase = $provideSupabaseForServer();
    return supabase.from(tableName);
}
