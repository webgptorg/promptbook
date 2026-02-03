import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentBasicInformation } from '../../../../book-2.0/agent-source/AgentBasicInformation';
import { parseAgentSource } from '../../../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../../book-2.0/agent-source/string_book';
import { DEFAULT_IS_VERBOSE } from '../../../../config';
import { DatabaseError } from '../../../../errors/DatabaseError';
import { NotFoundError } from '../../../../errors/NotFoundError';
import { UnexpectedError } from '../../../../errors/UnexpectedError';
import { ZERO_USAGE } from '../../../../execution/utils/usage-constants';
import type { string_agent_name, string_agent_permanent_id } from '../../../../types/typeAliases';
import { keepUnused } from '../../../../utils/organization/keepUnused';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';
import { TODO_USE } from '../../../../utils/organization/TODO_USE';
import { $randomBase58 } from '../../../../utils/random/$randomBase58';
import { TODO_any } from '../../../../_packages/types.index';
import type { PreparedExternals } from '../../../../types/PreparedExternals';
import { PROMPTBOOK_ENGINE_VERSION } from '../../../../version';
import { AgentCollectionInSupabaseOptions } from './AgentCollectionInSupabaseOptions';
import type { AgentsDatabaseSchema } from './AgentsDatabaseSchema';


// import { getTableName } from '../../../../../apps/agents-server/src/database/getTableName';
// <- TODO: [🐱‍🚀] Prevent imports from `/apps` -> `/src`

/**
 * Options for creating a new agent entry.
 */
type CreateAgentOptions = {
    /**
     * Folder identifier to assign the new agent to.
     */
    readonly folderId?: number | null;
    /**
     * Sort order for the agent within its parent folder.
     */
    readonly sortOrder?: number;
};

/**
 * Agent collection stored in a Supabase table.
 *
 * This class provides a way to manage a collection of agents (pipelines) using Supabase
 * as the storage backend. It supports listing, creating, updating, and soft-deleting agents.
 *
 * Note: This object can work both from Node.js and browser environment depending on the Supabase client provided.
 *
 * @public exported from `@promptbook/core`
 * <- TODO: [🐱‍🚀] Move to `@promptbook/supabase` package
 */
export class AgentCollectionInSupabase /* TODO: [🌈][🐱‍🚀] implements AgentCollection */ {
    /**
     * @param supabaseClient - The initialized Supabase client
     * @param options - Configuration options for the collection (e.g., table prefix, verbosity)
     */
    public constructor(
        private readonly supabaseClient: SupabaseClient<AgentsDatabaseSchema>,
        /// TODO: [🐱‍🚀] Remove> private readonly tools?: Pick<ExecutionTools, 'llm' | 'fs' | 'scrapers'>,
        public readonly options?: AgentCollectionInSupabaseOptions,
    ) {
        const { isVerbose = DEFAULT_IS_VERBOSE } = options || {};

        if (isVerbose) {
            console.info(`Creating pipeline collection from supabase...`);
        }
    }

    /**
     * Gets all agents in the collection
     */
    public async listAgents(/* TODO: [🧠] Allow to pass some condition here */): Promise<
        ReadonlyArray<AgentBasicInformation>
    > {
        const { isVerbose = DEFAULT_IS_VERBOSE } = this.options || {};
        const selectResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .select('agentName,agentProfile,permanentId')
            .is('deletedAt', null);

        if (selectResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `

                        Error fetching agents from Supabase:

                        ${block(selectResult.error.message)}
                    `,
                ),
            );
        }

        if (isVerbose) {
            console.info(`Found ${selectResult.data.length} agents in directory`);
        }

        return selectResult.data.map(({ agentName, agentProfile, permanentId }) => {
            if (isVerbose && (agentProfile as AgentBasicInformation).agentName !== agentName) {
                console.warn(
                    spaceTrim(`
                        Agent name mismatch for agent "${agentName}". Using name from database.

                        agentName: "${agentName}"
                        agentProfile.agentName: "${(agentProfile as AgentBasicInformation).agentName}"
                    `),
                );
            }

            return {
                ...(agentProfile as AgentBasicInformation),
                agentName,
                permanentId: permanentId || (agentProfile as AgentBasicInformation).permanentId,
            };
        });
    }

    /**
     * Retrieves the permanent ID of an agent by its name or permanent ID.
     */
    public async getAgentPermanentId(
        agentNameOrPermanentId: string_agent_name | string_agent_permanent_id,
    ): Promise<string_agent_permanent_id> {
        const selectResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .select('permanentId')
            .or(`agentName.eq.${agentNameOrPermanentId},permanentId.eq.${agentNameOrPermanentId}`)
            .single();

        if (selectResult.error || !selectResult.data) {
            throw new NotFoundError(`Agent with name not id "${agentNameOrPermanentId}" not found`);
        }
        return selectResult.data.permanentId as string_agent_permanent_id;
    }

    /**
     * Retrieves the source code of an agent by its name or permanent ID.
     */
    public async getAgentSource(
        agentNameOrPermanentId: string_agent_name | string_agent_permanent_id,
    ): Promise<string_book> {
        const selectResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .select('agentSource')
            .or(`agentName.eq.${agentNameOrPermanentId},permanentId.eq.${agentNameOrPermanentId}`)
            .is('deletedAt', null);

        if (selectResult.data && selectResult.data.length === 0) {
            throw new NotFoundError(`Agent "${agentNameOrPermanentId}" not found`);
        } else if (selectResult.data && selectResult.data.length > 1) {
            throw new UnexpectedError(`More agents with name or id "${agentNameOrPermanentId}" found`);
        } else if (selectResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                        Error fetching agent "${agentNameOrPermanentId}" from Supabase:
                        
                        ${block(selectResult.error.message)}
                    `,
                ),
            );
        }

        return selectResult.data[0]!.agentSource as string_book;
    }

    /**
     * Retrieves the prepared externals of an agent by its name or permanent ID.
     */
    public async getAgentPreparedExternals(
        agentNameOrPermanentId: string_agent_name | string_agent_permanent_id,
    ): Promise<PreparedExternals | null> {
        const selectResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .select('preparedExternals')
            .or(`agentName.eq.${agentNameOrPermanentId},permanentId.eq.${agentNameOrPermanentId}`)
            .is('deletedAt', null);

        if (selectResult.data && selectResult.data.length === 0) {
            throw new NotFoundError(`Agent "${agentNameOrPermanentId}" not found`);
        } else if (selectResult.data && selectResult.data.length > 1) {
            throw new UnexpectedError(`More agents with name or id "${agentNameOrPermanentId}" found`);
        } else if (selectResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                        Error fetching agent prepared externals "${agentNameOrPermanentId}" from Supabase:
                        
                        ${block(selectResult.error.message)}
                    `,
                ),
            );
        }

        return (selectResult.data[0]!.preparedExternals as PreparedExternals) || null;
    }

    /**
     * Creates a new agent in the collection
     *
     * Note: You can set 'PARENT' in the agent source to inherit from another agent in the collection.
     *
     * @param agentSource - Source content of the agent.
     * @param options - Optional folder placement and ordering data.
     */
    public async createAgent(
        agentSource: string_book,
        options: CreateAgentOptions = {},
    ): Promise<AgentBasicInformation & Required<Pick<AgentBasicInformation, 'permanentId'>>> {
        let agentProfile = parseAgentSource(agentSource as string_book);
        //     <- TODO: [🕛]

        // 1. Extract permanentId from the source if present
        let { permanentId } = agentProfile;

        // 2. Remove META ID from the source
        const lines = agentSource.split(/\r?\n/);
        const strippedLines = lines.filter((line) => !line.trim().startsWith('META ID '));

        if (lines.length !== strippedLines.length) {
            agentSource = strippedLines.join('\n') as string_book;
            // 3. Re-parse the agent source to get the correct hash and other info
            agentProfile = parseAgentSource(agentSource as string_book);
        }

        const { agentName, agentHash } = agentProfile;

        if (!permanentId) {
            permanentId = $randomBase58(14);
        }

        const insertPayload: AgentsDatabaseSchema['public']['Tables']['Agent']['Insert'] = {
            agentName,
            agentHash,
            permanentId,
            agentProfile,
            createdAt: new Date().toISOString(),
            updatedAt: null,
            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
            usage: ZERO_USAGE,
            agentSource: agentSource,
        };

        if (options.folderId !== undefined) {
            insertPayload.folderId = options.folderId;
        }
        if (options.sortOrder !== undefined) {
            insertPayload.sortOrder = options.sortOrder;
        }

        const insertAgentResult = await this.supabaseClient.from(this.getTableName('Agent')).insert(insertPayload);

        if (insertAgentResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                        Error creating agent "${agentProfile.agentName}" in Supabase:
                        
                        ${block(insertAgentResult.error.message)}
                    `,
                ),
            );
        }

        const insertAgentHistoryResult = await this.supabaseClient.from(this.getTableName('AgentHistory')).insert({
            createdAt: new Date().toISOString(),
            agentName,
            permanentId,
            agentHash,
            previousAgentHash: null,
            agentSource,
            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
        });

        keepUnused(insertAgentHistoryResult);
        // <- TODO: [🧠] What to do with `insertAgentHistoryResult.error`, ignore? wait?

        return { ...agentProfile, permanentId };
    }

    /**
     * Updates an existing agent in the collection
     */
    public async updateAgentSource(permanentId: string_agent_permanent_id, agentSource: string_book): Promise<void> {
        const selectPreviousAgentResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .select('agentHash,agentName,permanentId')
            .eq('permanentId', permanentId)
            .single();

        if (selectPreviousAgentResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                
                        Error fetching agent "${permanentId}" from Supabase:
                        
                        ${block(selectPreviousAgentResult.error.message)}
                    `,
                ),
            );
            // <- TODO: [🐱‍🚀] First check if the error is "not found" and throw `NotFoundError` instead then throw `DatabaseError`, look at `getAgentSource` implementation
        }

        const previousAgentName = selectPreviousAgentResult.data.agentName;
        const previousAgentHash = selectPreviousAgentResult.data.agentHash;
        const previousPermanentId = selectPreviousAgentResult.data.permanentId;

        let agentProfile = parseAgentSource(agentSource as string_book);
        //     <- TODO: [🕛]

        // 1. Extract permanentId from the source if present
        let { permanentId: newPermanentId } = agentProfile;

        // 2. Remove META ID from the source
        const lines = agentSource.split(/\r?\n/);
        const strippedLines = lines.filter((line) => !line.trim().startsWith('META ID '));

        if (lines.length !== strippedLines.length) {
            agentSource = strippedLines.join('\n') as string_book;
            // 3. Re-parse the agent source to get the correct hash and other info
            agentProfile = parseAgentSource(agentSource as string_book);
        }

        const { agentHash, agentName } = agentProfile;

        if (!newPermanentId && previousPermanentId) {
            newPermanentId = previousPermanentId;
        }

        if (!newPermanentId) {
            newPermanentId = $randomBase58(14);
        }

        if (newPermanentId !== permanentId) {
            // [🧠] Should be allowed to change permanentId?
            throw new UnexpectedError(
                `Permanent ID mismatch: "${permanentId}" (argument) !== "${newPermanentId}" (in source)`,
            );
        }

        // TODO: [🐱‍🚀] What about agentName change

        // console.log('[🐱‍🚀] agentName', agentName);

        TODO_USE(previousAgentName); // <- Do some extra action on name change

        const updateAgentResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .update({
                agentName,
                permanentId,
                agentProfile,
                updatedAt: new Date().toISOString(),
                agentHash: agentProfile.agentHash,
                agentSource,
                promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
            })
            .eq('permanentId', permanentId);

        // console.log('[🐱‍🚀] updateAgent', updateResult);
        // console.log('[🐱‍🚀] old', oldAgentSource);
        // console.log('[🐱‍🚀] new', newAgentSource);

        if (updateAgentResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                        Error updating agent "${permanentId}" in Supabase:
                        
                        ${block(updateAgentResult.error.message)}
                    `,
                ),
            );
        }

        const insertAgentHistoryResult = await this.supabaseClient.from(this.getTableName('AgentHistory')).insert({
            createdAt: new Date().toISOString(),
            agentName,
            permanentId,
            agentHash,
            previousAgentHash,
            agentSource,
            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
        });

        keepUnused(insertAgentHistoryResult);
        // <- TODO: [🧠] What to do with `insertAgentHistoryResult.error`, ignore? wait?
    }

    // TODO: [🐱‍🚀] public async getAgentSourceSubject(permanentId: string_agent_permanent_id): Promise<BehaviorSubject<string_book>>
    //            Use Supabase realtime logic

    /**
     * Updates prepared externals of an existing agent in the collection
     */
    public async updateAgentPreparedExternals(
        permanentId: string_agent_permanent_id,
        preparedExternals: PreparedExternals,
    ): Promise<void> {
        const updateAgentResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .update({
                preparedExternals: preparedExternals as TODO_any,
                updatedAt: new Date().toISOString(),
                promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
            })
            .eq('permanentId', permanentId);

        if (updateAgentResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                        Error updating agent prepared externals "${permanentId}" in Supabase:
                        
                        ${block(updateAgentResult.error.message)}
                    `,
                ),
            );
        }
    }

    /**
     * List agents that are soft deleted (deletedAt IS NOT NULL)
     */
    public async listDeletedAgents(): Promise<ReadonlyArray<AgentBasicInformation>> {
        const { isVerbose = DEFAULT_IS_VERBOSE } = this.options || {};
        const selectResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .select('agentName,agentProfile,permanentId')
            .not('deletedAt', 'is', null);

        if (selectResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                    Error fetching deleted agents from Supabase:

                    ${block(selectResult.error.message)}
                `,
                ),
            );
        }

        if (isVerbose) {
            console.info(`Found ${selectResult.data.length} deleted agents in directory`);
        }

        return selectResult.data.map(({ agentName, agentProfile, permanentId }) => {
            if (isVerbose && (agentProfile as AgentBasicInformation).agentName !== agentName) {
                console.warn(
                    spaceTrim(`
                        Agent name mismatch for agent "${agentName}". Using name from database.

                        agentName: "${agentName}"
                        agentProfile.agentName: "${(agentProfile as AgentBasicInformation).agentName}"
                    `),
                );
            }

            return {
                ...(agentProfile as AgentBasicInformation),
                agentName,
                permanentId: permanentId || (agentProfile as AgentBasicInformation).permanentId,
            };
        });
    }

    /**
     * List history of an agent
     */
    public async listAgentHistory(
        permanentId: string_agent_permanent_id,
    ): Promise<ReadonlyArray<{ id: number; createdAt: string; agentHash: string; promptbookEngineVersion: string }>> {
        const result = await this.supabaseClient
            .from(this.getTableName('AgentHistory'))
            .select('id, createdAt, agentHash, promptbookEngineVersion')
            .eq('permanentId', permanentId)
            .order('createdAt', { ascending: false });

        if (result.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                    Error listing history for agent "${permanentId}" from Supabase:

                    ${block(result.error.message)}
                `,
                ),
            );
        }

        return result.data;
    }

    /**
     * Restore a soft-deleted agent by setting deletedAt to NULL
     */
    public async restoreAgent(permanentId: string_agent_permanent_id): Promise<void> {
        const updateResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .update({ deletedAt: null })
            .eq('permanentId', permanentId)
            .not('deletedAt', 'is', null);

        if (updateResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                    Error restoring agent "${permanentId}" from Supabase:

                    ${block(updateResult.error.message)}
                `,
                ),
            );
        }
    }

    /**
     * Restore an agent from a specific history entry
     *
     * This will update the current agent with the source from the history entry
     */
    public async restoreAgentFromHistory(historyId: number): Promise<void> {
        // First, get the history entry
        const historyResult = await this.supabaseClient
            .from(this.getTableName('AgentHistory'))
            .select('permanentId, agentSource')
            .eq('id', historyId)
            .single();

        if (historyResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                    Error fetching history entry with id "${historyId}" from Supabase:

                    ${block(historyResult.error.message)}
                `,
                ),
            );
        }

        if (!historyResult.data) {
            throw new NotFoundError(`History entry with id "${historyId}" not found`);
        }

        const { permanentId, agentSource } = historyResult.data;

        // Update the agent with the source from the history entry
        await this.updateAgentSource(permanentId as string_agent_permanent_id, agentSource as string_book);
    }

    /**
     * Soft delete an agent by setting deletedAt to current timestamp
     */
    public async deleteAgent(permanentId: string_agent_permanent_id): Promise<void> {
        const updateResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .update({ deletedAt: new Date().toISOString() })
            .eq('permanentId', permanentId)
            .is('deletedAt', null);

        if (updateResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                    Error deleting agent "${permanentId}" from Supabase:

                    ${block(updateResult.error.message)}
                `,
                ),
            );
        }
    }

    /**
     * Get the Supabase table name with prefix
     *
     * @param tableName - The original table name
     * @returns The prefixed table name
     */
    private getTableName<TTable extends keyof AgentsDatabaseSchema['public']['Tables']>(tableName: TTable): TTable {
        const { tablePrefix = '' } = this.options || {};

        return `${tablePrefix}${tableName}` as TTable;
        // <- TODO: [🏧] DRY
    }
}

/**
 * TODO: [🐱‍🚀] Implement it here correctly and update JSDoc comments here, and on interface + other implementations
 * TODO: Write unit test
 * TODO: [🧠][🚙] `AgentXxx` vs `AgentsXxx` naming convention
 */
