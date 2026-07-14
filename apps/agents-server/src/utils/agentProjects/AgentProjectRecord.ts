import type { AgentsServerDatabase } from '@/src/database/schema';

/**
 * Stored row shape for `AgentProject`.
 */
export type AgentProjectRow = AgentsServerDatabase['public']['Tables']['AgentProject']['Row'];

/**
 * Insert payload shape for `AgentProject`.
 */
export type AgentProjectInsert = AgentsServerDatabase['public']['Tables']['AgentProject']['Insert'];

/**
 * Application-level project record with resolved filesystem path.
 */
export type AgentProjectRecord = AgentProjectRow & {
    /**
     * Filesystem directory owned by this project.
     */
    readonly directoryPath: string;
};
