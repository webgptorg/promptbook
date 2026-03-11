import type { AgentsServerDatabase } from '@/src/database/schema';

/**
 * Database row shape for `UserChatJob`.
 */
export type UserChatJobRow = AgentsServerDatabase['public']['Tables']['UserChatJob']['Row'];

/**
 * Insert payload shape for `UserChatJob`.
 */
export type UserChatJobInsert = AgentsServerDatabase['public']['Tables']['UserChatJob']['Insert'];
