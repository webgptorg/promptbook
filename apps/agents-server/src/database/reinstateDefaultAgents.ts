import type { SupabaseClient } from '@supabase/supabase-js';
import { AgentCollectionInSupabase } from '../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentCollectionInSupabase';
import type { AgentsDatabaseSchema } from '../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentsDatabaseSchema';
import { loadDefaultAgentBooks } from '../utils/defaultAgents/loadDefaultAgentBooks';
import { createMissingAgentsFromBooks } from './createMissingAgentsFromBooks';
import { $provideSupabaseForServer } from './$provideSupabaseForServer';

/**
 * Environment variable with an explicit default-agent source directory.
 *
 * @private utility of standalone default-agent reinstatement
 */
const DEFAULT_AGENTS_DIRECTORY_ENV_NAME = 'PTBK_DEFAULT_AGENTS_DIR';

/**
 * Environment variable carrying the current Agents Server table prefix.
 *
 * @private utility of standalone default-agent reinstatement
 */
const SUPABASE_TABLE_PREFIX_ENV_NAME = 'SUPABASE_TABLE_PREFIX';

/**
 * Logger surface used by the default-agent reinstatement.
 *
 * @private utility of standalone default-agent reinstatement
 */
type ReinstateDefaultAgentsLogger = Pick<Console, 'info' | 'warn'>;

/**
 * Options for reinstating any missing bundled normal default agents on the current server.
 *
 * @private utility of standalone default-agent reinstatement
 */
export type ReinstateDefaultAgentsOptions = {
    /**
     * Optional explicit directory containing default `*.book` files.
     */
    readonly defaultAgentDirectory?: string | null;

    /**
     * Optional table prefix for the server namespace being reinstated.
     */
    readonly tablePrefix?: string | null;

    /**
     * Optional logger for installer output.
     */
    readonly logger?: ReinstateDefaultAgentsLogger;
};

/**
 * Result of one default-agent reinstatement run.
 *
 * @private utility of standalone default-agent reinstatement
 */
export type ReinstateDefaultAgentsResult = {
    /**
     * Names of the normal default agents created during this run.
     */
    readonly createdAgentNames: ReadonlyArray<string>;
};

/**
 * Recreates only the normal default agents that are missing from the current server.
 *
 * Unlike `seedDefaultAgents` — which only seeds a brand-new empty server — this reinstatement recreates individually
 * missing default agents while keeping every existing (possibly edited) agent untouched, so an admin can restore the
 * showcase agents at any time. It reuses the exact same creation logic used when the server is first created.
 *
 * @param options - Optional reinstatement controls.
 * @returns Reinstatement summary listing the created agents.
 *
 * @private utility of standalone default-agent reinstatement
 */
export async function reinstateDefaultAgents(
    options: ReinstateDefaultAgentsOptions = {},
): Promise<ReinstateDefaultAgentsResult> {
    const logger = options.logger ?? console;
    const tablePrefix = options.tablePrefix ?? process.env[SUPABASE_TABLE_PREFIX_ENV_NAME] ?? '';
    const defaultAgentDirectory = options.defaultAgentDirectory ?? process.env[DEFAULT_AGENTS_DIRECTORY_ENV_NAME];
    const collection = new AgentCollectionInSupabase(resolveAgentsDatabaseSupabaseClient(), { tablePrefix });

    const defaultAgentBooks = await loadDefaultAgentBooks({ defaultAgentDirectory });

    if (defaultAgentBooks.length === 0) {
        logger.warn('Skipping default agents because no bundled *.book files were found.');
        return { createdAgentNames: [] };
    }

    const activeAgents = await collection.listAgents();
    const existingAgentNames = new Set(activeAgents.map((activeAgent) => activeAgent.agentName));
    const createdAgentNames = await createMissingAgentsFromBooks({
        collection,
        agentBooks: defaultAgentBooks,
        existingAgentNames,
        logger,
    });

    return { createdAgentNames };
}

/**
 * Resolves the Supabase-shaped client for the Agent collection subset.
 *
 * @returns Supabase client typed for agent collection persistence.
 *
 * @private utility of standalone default-agent reinstatement
 */
function resolveAgentsDatabaseSupabaseClient(): SupabaseClient<AgentsDatabaseSchema> {
    return $provideSupabaseForServer() as unknown as SupabaseClient<AgentsDatabaseSchema>;
}
