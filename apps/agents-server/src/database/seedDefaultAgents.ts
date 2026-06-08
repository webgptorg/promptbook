import type { SupabaseClient } from '@supabase/supabase-js';
import { AgentCollectionInSupabase } from '../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentCollectionInSupabase';
import type { AgentsDatabaseSchema } from '../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentsDatabaseSchema';
import { $provideSupabaseForServer } from './$provideSupabaseForServer';
import { DEFAULT_AGENT_VISIBILITY } from '../utils/agentVisibility';
import { loadDefaultAgentBooks } from '../utils/defaultAgents/loadDefaultAgentBooks';
import { loadAgentsServerEnvFile } from './loadAgentsServerEnvFile';

/**
 * Environment variable with an explicit default-agent source directory.
 *
 * @private utility of standalone default-agent seeding
 */
const DEFAULT_AGENTS_DIRECTORY_ENV_NAME = 'PTBK_DEFAULT_AGENTS_DIR';

/**
 * Environment variable carrying the current Agents Server table prefix.
 *
 * @private utility of standalone default-agent seeding
 */
const SUPABASE_TABLE_PREFIX_ENV_NAME = 'SUPABASE_TABLE_PREFIX';

/**
 * Logger surface used by the default-agent seeder.
 *
 * @private utility of standalone default-agent seeding
 */
type SeedDefaultAgentsLogger = Pick<Console, 'error' | 'info' | 'warn'>;

/**
 * Options for installing bundled default agents into the current Agents Server database.
 *
 * @private utility of standalone default-agent seeding
 */
export type SeedDefaultAgentsOptions = {
    /**
     * Optional explicit directory containing default `*.book` files.
     */
    readonly defaultAgentDirectory?: string | null;

    /**
     * Optional table prefix for the server namespace being seeded.
     */
    readonly tablePrefix?: string | null;

    /**
     * Optional logger for installer output.
     */
    readonly logger?: SeedDefaultAgentsLogger;
};

/**
 * Result of one default-agent seed attempt.
 *
 * @private utility of standalone default-agent seeding
 */
export type SeedDefaultAgentsResult = {
    /**
     * Number of agents already present before seeding, including soft-deleted agents.
     */
    readonly existingAgentCount: number;

    /**
     * Number of bundled default books found.
     */
    readonly sourceCount: number;

    /**
     * Number of default agents created.
     */
    readonly createdCount: number;

    /**
     * Names of agents created during this run.
     */
    readonly createdAgentNames: ReadonlyArray<string>;

    /**
     * Reason no agents were created.
     */
    readonly skippedReason: 'existing-agents' | 'no-default-books' | null;
};

/**
 * Installs bundled default agents when the current server has no agents yet.
 *
 * @param options - Optional seed controls.
 * @returns Seed summary.
 *
 * @private utility of standalone default-agent seeding
 */
export async function seedDefaultAgents(options: SeedDefaultAgentsOptions = {}): Promise<SeedDefaultAgentsResult> {
    const logger = options.logger ?? console;
    const tablePrefix = options.tablePrefix ?? process.env[SUPABASE_TABLE_PREFIX_ENV_NAME] ?? '';
    const collection = new AgentCollectionInSupabase(resolveAgentsDatabaseSupabaseClient(), { tablePrefix });
    const existingAgentCount = await countExistingAgents(collection);

    if (existingAgentCount > 0) {
        logger.info(
            `Skipping default agents because the server already has ${existingAgentCount} agent${
                existingAgentCount === 1 ? '' : 's'
            }.`,
        );
        return {
            existingAgentCount,
            sourceCount: 0,
            createdCount: 0,
            createdAgentNames: [],
            skippedReason: 'existing-agents',
        };
    }

    const defaultAgentBooks = await loadDefaultAgentBooks({
        defaultAgentDirectory: options.defaultAgentDirectory ?? process.env[DEFAULT_AGENTS_DIRECTORY_ENV_NAME],
    });

    if (defaultAgentBooks.length === 0) {
        logger.warn('Skipping default agents because no bundled *.book files were found.');
        return {
            existingAgentCount,
            sourceCount: 0,
            createdCount: 0,
            createdAgentNames: [],
            skippedReason: 'no-default-books',
        };
    }

    const createdAgentNames: Array<string> = [];

    for (const [index, defaultAgentBook] of defaultAgentBooks.entries()) {
        const createdAgent = await collection.createAgent(defaultAgentBook, {
            sortOrder: index,
            visibility: DEFAULT_AGENT_VISIBILITY,
        });
        createdAgentNames.push(createdAgent.agentName);
        logger.info(`Created default agent: ${createdAgent.agentName}`);
    }

    return {
        existingAgentCount,
        sourceCount: defaultAgentBooks.length,
        createdCount: createdAgentNames.length,
        createdAgentNames,
        skippedReason: null,
    };
}

/**
 * Counts active and soft-deleted agents so repeated installer runs do not recreate defaults.
 *
 * @param collection - Agent collection bound to the current table prefix.
 * @returns Number of existing active and deleted agents.
 *
 * @private utility of standalone default-agent seeding
 */
async function countExistingAgents(collection: AgentCollectionInSupabase): Promise<number> {
    const activeAgents = await collection.listAgents();
    const deletedAgents = await collection.listDeletedAgents();

    return activeAgents.length + deletedAgents.length;
}

/**
 * Resolves the Supabase-shaped client for the Agent collection subset.
 *
 * @returns Supabase client typed for agent collection persistence.
 *
 * @private utility of standalone default-agent seeding
 */
function resolveAgentsDatabaseSupabaseClient(): SupabaseClient<AgentsDatabaseSchema> {
    return $provideSupabaseForServer() as unknown as SupabaseClient<AgentsDatabaseSchema>;
}

/**
 * Runs the standalone default-agent seed command.
 *
 * @private utility of standalone default-agent seeding
 */
async function runSeedDefaultAgentsCommand(): Promise<void> {
    loadAgentsServerEnvFile();
    const result = await seedDefaultAgents();

    if (result.createdCount > 0) {
        console.info(`Installed ${result.createdCount} default agent${result.createdCount === 1 ? '' : 's'}.`);
    }
}

if (require.main === module) {
    runSeedDefaultAgentsCommand().catch((error) => {
        console.error('Failed to install default agents:');
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    });
}
