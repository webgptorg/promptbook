import { parseAgentSource } from '../../../../src/book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../../src/book-2.0/agent-source/string_book';
import type { AgentCollectionInSupabase } from '../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentCollectionInSupabase';

/**
 * Logger surface used while creating missing agents.
 *
 * @private utility of Agents Server default-agent seeding
 */
type CreateMissingAgentsLogger = Pick<Console, 'info'>;

/**
 * Options for creating only the missing agents from a set of bundled books.
 *
 * @private utility of Agents Server default-agent seeding
 */
export type CreateMissingAgentsFromBooksOptions = {
    /**
     * Agent collection bound to the target server namespace.
     */
    readonly collection: AgentCollectionInSupabase;

    /**
     * Bundled agent books to reinstate, in deterministic order.
     */
    readonly agentBooks: ReadonlyArray<string_book>;

    /**
     * Names of the agents that already exist and must not be recreated.
     */
    readonly existingAgentNames: ReadonlySet<string>;

    /**
     * Optional folder the created agents should be placed in (for example the `.core` folder).
     */
    readonly folderId?: number | null;

    /**
     * Optional logger for installer output.
     */
    readonly logger?: CreateMissingAgentsLogger;
};

/**
 * Creates only the agents whose name is not already present, reusing the shared persistence mechanism.
 *
 * This is the single place that turns a list of bundled books into persisted agents, so both the core-agent seeder and
 * the default-agent reinstatement share exactly the same creation logic.
 *
 * @param options - Collection, books, and the set of already-present agent names.
 * @returns Names of the agents created during this run.
 *
 * @private utility of Agents Server default-agent seeding
 */
export async function createMissingAgentsFromBooks(
    options: CreateMissingAgentsFromBooksOptions,
): Promise<ReadonlyArray<string>> {
    const { collection, agentBooks, existingAgentNames, folderId, logger } = options;
    const createdAgentNames: Array<string> = [];

    for (const [index, agentBook] of agentBooks.entries()) {
        const { agentName } = parseAgentSource(agentBook);

        if (existingAgentNames.has(agentName)) {
            continue;
        }

        const createdAgent = await collection.createAgent(agentBook, {
            folderId: folderId ?? undefined,
            sortOrder: index,
        });
        createdAgentNames.push(createdAgent.agentName);
        logger?.info(`Created agent: ${createdAgent.agentName}`);
    }

    return createdAgentNames;
}
