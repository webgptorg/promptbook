import { AgentsServerDatabase } from '@/src/database/schema';

/**
 * Stored row shape for `UserChat`.
 *
 * @private function of `userChat`
 */
export type UserChatRow = AgentsServerDatabase['public']['Tables']['UserChat']['Row'];

/**
 * Insert payload shape for `UserChat`.
 *
 * @private function of `userChat`
 */
export type UserChatInsert = AgentsServerDatabase['public']['Tables']['UserChat']['Insert'];
