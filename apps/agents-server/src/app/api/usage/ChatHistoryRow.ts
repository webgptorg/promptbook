import type { AgentsServerDatabase } from '../../../database/schema';

/**
 * @private Chat-history row payload as stored in the Agents Server database.
 */
export type ChatHistoryRow = Pick<
    AgentsServerDatabase['public']['Tables']['ChatHistory']['Row'],
    'createdAt' | 'agentName' | 'message' | 'source' | 'apiKey' | 'userAgent' | 'actorType' | 'usage' | 'userId'
>;
