import type { SupabaseClient } from '@supabase/supabase-js';
import { spaceTrim } from 'spacetrim';
import { AgentCollectionInSupabase } from '../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentCollectionInSupabase';
import type { AgentsDatabaseSchema } from '../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentsDatabaseSchema';
import { parseAgentSource } from '../../../../src/book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../../src/book-2.0/agent-source/string_book';
import { DatabaseError } from '../../../../src/errors/DatabaseError';
import { CORE_AGENT_DIRECTORY_NAME, loadCoreAgentBooks } from '../utils/defaultAgents/loadDefaultAgentBooks';
import { $provideSupabaseForServer } from './$provideSupabaseForServer';

/**
 * Logger surface used by the core-agent seeder.
 *
 * @private utility of `.core` folder seeding
 */
type SeedCoreAgentsLogger = Pick<Console, 'error' | 'info' | 'warn'>;

/**
 * Options for ensuring the bundled `.core` folder and core agents exist.
 *
 * @private utility of `.core` folder seeding
 */
export type SeedCoreAgentsOptions = {
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
    readonly logger?: SeedCoreAgentsLogger;
};

/**
 * Result of one `.core` agents seed attempt.
 *
 * @private utility of `.core` folder seeding
 */
export type SeedCoreAgentsResult = {
    /**
     * Identifier of the `.core` folder, or `null` when no books were available and the folder was not created.
     */
    readonly coreFolderId: number | null;

    /**
     * Names of agents that were created during this run.
     */
    readonly createdAgentNames: ReadonlyArray<string>;
};

/**
 * Ensures the `.core` folder and well-known core agents are present in the current server database.
 *
 * - Creates the `.core` folder when it is missing.
 * - Creates each bundled `.core/*.book` agent when it is missing from the database.
 * - Reuses the same persistence mechanism used by the default agent seeder.
 *
 * @param options - Optional seed controls.
 * @returns Seed summary including the resolved `.core` folder id.
 *
 * @private utility of `.core` folder seeding
 */
export async function seedCoreAgents(options: SeedCoreAgentsOptions = {}): Promise<SeedCoreAgentsResult> {
    const logger = options.logger ?? console;
    const tablePrefix = options.tablePrefix ?? process.env.SUPABASE_TABLE_PREFIX ?? '';
    const collection = new AgentCollectionInSupabase(resolveAgentsDatabaseSupabaseClient(), { tablePrefix });

    const coreAgentBooks = await loadCoreAgentBooks({
        defaultAgentDirectory: options.defaultAgentDirectory,
    });

    if (coreAgentBooks.length === 0) {
        logger.warn(
            spaceTrim(`
                Skipping \`.core\` agents because no bundled \`.core/*.book\` files were found.
            `),
        );

        return { coreFolderId: null, createdAgentNames: [] };
    }

    const coreFolderId = await ensureCoreFolderExists(tablePrefix);
    const existingAgentNames = await loadExistingActiveAgentNames(tablePrefix);
    const createdAgentNames: Array<string> = [];

    for (const [index, coreAgentBook] of coreAgentBooks.entries()) {
        const agentName = parseCoreAgentName(coreAgentBook);

        if (existingAgentNames.has(agentName)) {
            continue;
        }

        const createdAgent = await collection.createAgent(coreAgentBook, {
            folderId: coreFolderId,
            sortOrder: index,
        });
        createdAgentNames.push(createdAgent.agentName);
        logger.info(`Created \`.core\` agent: ${createdAgent.agentName}`);
    }

    return { coreFolderId, createdAgentNames };
}

/**
 * Reads the agent name from one bundled `.core` book source.
 *
 * @param coreAgentBook - Raw `.core` agent book source.
 * @returns Persisted agent name parsed from the book.
 *
 * @private utility of `.core` folder seeding
 */
function parseCoreAgentName(coreAgentBook: string_book): string {
    return parseAgentSource(coreAgentBook).agentName;
}

/**
 * Reads the set of active agent names already persisted on the current server.
 *
 * @param tablePrefix - Table prefix for the server namespace being seeded.
 * @returns Set of active agent names indexed for quick lookups.
 *
 * @private utility of `.core` folder seeding
 */
async function loadExistingActiveAgentNames(tablePrefix: string): Promise<Set<string>> {
    const supabase = $provideSupabaseForServer();
    const agentTableName = `${tablePrefix}Agent` as 'Agent';
    const selectResult = await supabase
        .from(agentTableName)
        .select('agentName')
        .is('deletedAt', null);

    if (selectResult.error) {
        throw new DatabaseError(
            spaceTrim(
                (block) => `
                    Failed to read active agents before seeding \`.core\` agents:

                    ${block(selectResult.error.message)}
                `,
            ),
        );
    }

    const existingAgentNames = new Set<string>();
    for (const row of (selectResult.data || []) as Array<{ agentName: string }>) {
        existingAgentNames.add(row.agentName);
    }
    return existingAgentNames;
}

/**
 * Ensures the `.core` folder exists at the root and returns its identifier.
 *
 * @param tablePrefix - Table prefix for the server namespace being seeded.
 * @returns Persisted `.core` folder identifier.
 *
 * @private utility of `.core` folder seeding
 */
async function ensureCoreFolderExists(tablePrefix: string): Promise<number> {
    const supabase = $provideSupabaseForServer();
    const folderTableName = `${tablePrefix}AgentFolder` as 'AgentFolder';

    const existingFolderResult = await supabase
        .from(folderTableName)
        .select('id')
        .eq('name', CORE_AGENT_DIRECTORY_NAME)
        .is('parentId', null)
        .is('deletedAt', null)
        .maybeSingle();

    if (existingFolderResult.error) {
        throw new DatabaseError(
            spaceTrim(
                (block) => `
                    Failed to read the \`${CORE_AGENT_DIRECTORY_NAME}\` folder before seeding core agents:

                    ${block(existingFolderResult.error.message)}
                `,
            ),
        );
    }

    if (existingFolderResult.data) {
        return (existingFolderResult.data as { id: number }).id;
    }

    const insertFolderResult = await supabase
        .from(folderTableName)
        .insert({
            name: CORE_AGENT_DIRECTORY_NAME,
            parentId: null,
            sortOrder: 0,
            icon: null,
            color: null,
            createdAt: new Date().toISOString(),
            updatedAt: null,
        } as never)
        .select('id')
        .maybeSingle();

    if (insertFolderResult.error || !insertFolderResult.data) {
        throw new DatabaseError(
            spaceTrim(
                (block) => `
                    Failed to create the \`${CORE_AGENT_DIRECTORY_NAME}\` folder while seeding core agents:

                    ${block(
                        insertFolderResult.error?.message ||
                            `The database did not return the created \`${CORE_AGENT_DIRECTORY_NAME}\` folder.`,
                    )}
                `,
            ),
        );
    }

    return (insertFolderResult.data as { id: number }).id;
}

/**
 * Resolves the Supabase-shaped client for the Agent collection subset.
 *
 * @returns Supabase client typed for agent collection persistence.
 *
 * @private utility of `.core` folder seeding
 */
function resolveAgentsDatabaseSupabaseClient(): SupabaseClient<AgentsDatabaseSchema> {
    return $provideSupabaseForServer() as unknown as SupabaseClient<AgentsDatabaseSchema>;
}
