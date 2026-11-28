import type { AgentsServerDatabase } from '@/src/database/schema';

/**
 * Database row shape for `Wallet` table.
 *
 * @private function of `userWallet`
 */
export type UserWalletRow = AgentsServerDatabase['public']['Tables']['Wallet']['Row'];

/**
 * Input payload for inserting/updating `Wallet`.
 *
 * @private function of `userWallet`
 */
export type UserWalletInsert = AgentsServerDatabase['public']['Tables']['Wallet']['Insert'];

/**
 * JSON schema payload optionally attached to one wallet record.
 *
 * @private function of `userWallet`
 */
export type UserWalletJsonSchema = UserWalletRow['jsonSchema'];
