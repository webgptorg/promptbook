import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentBasicInformation } from '../../../../book-2.0/agent-source/AgentBasicInformation';
import { parseAgentSource } from '../../../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../../book-2.0/agent-source/string_book';
import { DEFAULT_IS_VERBOSE } from '../../../../config';
import { DatabaseError } from '../../../../errors/DatabaseError';
import { NotFoundError } from '../../../../errors/NotFoundError';
import { UnexpectedError } from '../../../../errors/UnexpectedError';
import { ZERO_USAGE } from '../../../../execution/utils/usage-constants';
import type { string_agent_name } from '../../../../types/typeAliases';
import { keepUnused } from '../../../../utils/organization/keepUnused';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';
import { TODO_USE } from '../../../../utils/organization/TODO_USE';
import { $randomBase58 } from '../../../../utils/random/$randomBase58';
import { PROMPTBOOK_ENGINE_VERSION } from '../../../../version';
import { AgentCollectionInSupabaseOptions } from './AgentCollectionInSupabaseOptions';
import type { AgentsDatabaseSchema } from './AgentsDatabaseSchema';

// import { getTableName } from '../../../../../apps/agents-server/src/database/getTableName';
// <- TODO: [🐱‍🚀] Prevent imports from `/apps` -> `/src`

/**
 * Agent collection stored in Supabase table
 *
 * Note: This object can work both from Node.js and browser environment depending on the Supabase client provided
 *
 * @public exported from `@promptbook/core`
 * <- TODO: [🐱‍🚀] Move to `@promptbook/supabase` package
 */
export class AgentCollectionInSupabase /* TODO: [🐱‍🚀] implements Agent */ {
    /**
     * @param rootPath - path to the directory with agents
     * @param tools - Execution tools to be used in [🐱‍🚀] `Agent` itself and listing the agents
     * @param options - Options for the collection creation
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
            .select('agentName,agentProfile,permanentId');

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
     * [🐱‍🚀]@@@
     */
    public async getAgentSource(agentName: string_agent_name): Promise<string_book> {
        const selectResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .select('agentSource')
            .or(`agentName.eq.${agentName},permanentId.eq.${agentName}`);

        if (selectResult.data && selectResult.data.length === 0) {
            throw new NotFoundError(`Agent "${agentName}" not found`);
        } else if (selectResult.data && selectResult.data.length > 1) {
            throw new UnexpectedError(`More agents with agentName="${agentName}" found`);
        } else if (selectResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                        Error fetching agent "${agentName}" from Supabase:
                        
                        ${block(selectResult.error.message)}
                    `,
                ),
            );
        }

        return selectResult.data[0]!.agentSource as string_book;
    }

    /**
     * Creates a new agent in the collection
     *
     * Note: You can set 'PARENT' in the agent source to inherit from another agent in the collection.
     */
    public async createAgent(agentSource: string_book): Promise<AgentBasicInformation> {
        let agentProfile = parseAgentSource(agentSource as string_book);
        //     <- TODO: [🕛]
        const { agentName, agentHash } = agentProfile;
        let { permanentId } = agentProfile;

        if (!permanentId) {
            permanentId = $randomBase58(14);
            const lines = agentSource.split('\n');
            if (lines.length > 0) {
                lines.splice(1, 0, `META ID ${permanentId}`);
                agentSource = lines.join('\n') as string_book;
            } else {
                agentSource = `META ID ${permanentId}\n${agentSource}` as string_book;
            }
            agentProfile = parseAgentSource(agentSource as string_book);
        }

        const insertAgentResult = await this.supabaseClient.from(this.getTableName('Agent')).insert({
            agentName,
            agentHash,
            permanentId,
            agentProfile,
            createdAt: new Date().toISOString(),
            updatedAt: null,
            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
            usage: ZERO_USAGE,
            agentSource: agentSource,
        });

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
            agentHash,
            previousAgentHash: null,
            agentSource,
            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
        });

        keepUnused(insertAgentHistoryResult);
        // <- TODO: [🧠] What to do with `insertAgentHistoryResult.error`, ignore? wait?

        return agentProfile;
    }

    /**
     * Updates an existing agent in the collection
     */
    public async updateAgentSource(agentName: string_agent_name, agentSource: string_book): Promise<void> {
        const selectPreviousAgentResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .select('agentHash,agentName,permanentId')
            .eq('agentName', agentName)
            .single();

        if (selectPreviousAgentResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                
                        Error fetching agent "${agentName}" from Supabase:
                        
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
        const { agentHash } = agentProfile;
        let { permanentId } = agentProfile;

        if (!permanentId && previousPermanentId) {
            permanentId = previousPermanentId;
            const lines = agentSource.split('\n');
            if (lines.length > 0) {
                lines.splice(1, 0, `META ID ${permanentId}`);
                agentSource = lines.join('\n') as string_book;
            } else {
                agentSource = `META ID ${permanentId}\n${agentSource}` as string_book;
            }
            agentProfile = parseAgentSource(agentSource as string_book);
        }

        // TODO: [🐱‍🚀] What about agentName change

        // console.log('[🐱‍🚀] agentName', agentName);

        TODO_USE(previousAgentName); // <- Do some extra action on name change

        const updateAgentResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .update({
                // TODO: [🐱‍🚀] Compare not update> agentName: agentProfile.agentName || '[🐱‍🚀]' /* <- TODO: [🐱‍🚀] Remove */,
                permanentId,
                agentProfile,
                updatedAt: new Date().toISOString(),
                agentHash: agentProfile.agentHash,
                agentSource,
                promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
            })
            .eq('agentName', agentName);

        // console.log('[🐱‍🚀] updateAgent', updateResult);
        // console.log('[🐱‍🚀] old', oldAgentSource);
        // console.log('[🐱‍🚀] new', newAgentSource);

        if (updateAgentResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                        Error updating agent "${agentName}" in Supabase:
                        
                        ${block(updateAgentResult.error.message)}
                    `,
                ),
            );
        }

        const insertAgentHistoryResult = await this.supabaseClient.from(this.getTableName('AgentHistory')).insert({
            createdAt: new Date().toISOString(),
            agentName,
            agentHash,
            previousAgentHash,
            agentSource,
            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
        });

        keepUnused(insertAgentHistoryResult);
        // <- TODO: [🧠] What to do with `insertAgentHistoryResult.error`, ignore? wait?
    }

    // TODO: [🐱‍🚀] public async getAgentSourceSubject(agentName: string_agent_name): Promise<BehaviorSubject<string_book>>
    //            Use Supabase realtime logic

    /**
     * Deletes an agent from the collection
     */
    public async deleteAgent(agentIdentifier: string): Promise<void> {
        const deleteResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .delete()
            .or(`agentName.eq.${agentIdentifier},permanentId.eq.${agentIdentifier}`);

        if (deleteResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                        Error deleting agent "${agentIdentifier}" from Supabase:

                        ${block(deleteResult.error.message)}
                    `,
                ),
            );
        }
    }

    /**
     * List history of an agent
     */
    public async listAgentHistory(agentName: string_agent_name): Promise<
        ReadonlyArray<{ id: number; createdAt: string; agentHash: string; promptbookEngineVersion: string }>
    > {
        const result = await this.supabaseClient
            .from(this.getTableName('AgentHistory'))
            .select('id, createdAt, agentHash, promptbookEngineVersion')
            .eq('agentName', agentName)
            .order('createdAt', { ascending: false });

        if (result.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                    Error listing history for agent "${agentName}" from Supabase:
                    
                    ${block(result.error.message)}
                `,
                ),
            );
        }

        return result.data;
    }

    /**
     * List agents that are in history but not in the active agents list
     */
    public async listDeletedAgents(): Promise<ReadonlyArray<string_agent_name>> {
        const historyNamesResult = await this.supabaseClient.from(this.getTableName('AgentHistory')).select('agentName');
        const currentNamesResult = await this.supabaseClient.from(this.getTableName('Agent')).select('agentName');

        if (historyNamesResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                    Error fetching agent history names from Supabase:
                    
                    ${block(historyNamesResult.error.message)}
                `,
                ),
            );
        }

        if (currentNamesResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                    Error fetching current agent names from Supabase:
                    
                    ${block(currentNamesResult.error.message)}
                `,
                ),
            );
        }

        const currentNames = new Set(currentNamesResult.data.map((d) => d.agentName));
        const deletedNames = new Set<string_agent_name>();

        for (const { agentName } of historyNamesResult.data) {
            if (!currentNames.has(agentName)) {
                deletedNames.add(agentName as string_agent_name);
            }
        }

        return Array.from(deletedNames);
    }

    /**
     * Restore an agent from history
     */
    public async restoreAgent(historyId: number): Promise<void> {
        const historyResult = await this.supabaseClient
            .from(this.getTableName('AgentHistory'))
            .select('*')
            .eq('id', historyId)
            .single();

        if (historyResult.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                    Error fetching agent history item "${historyId}" from Supabase:
                    
                    ${block(historyResult.error.message)}
                `,
                ),
            );
        }

        const { agentName, agentSource } = historyResult.data;

        // Check if agent exists
        const agentResult = await this.supabaseClient
            .from(this.getTableName('Agent'))
            .select('id')
            .eq('agentName', agentName)
            .single();

        if (agentResult.data) {
            // Update
            await this.updateAgentSource(agentName as string_agent_name, agentSource as string_book);
        } else {
            // Insert (Restore from deleted)
            await this.createAgent(agentSource as string_book);
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
    }
}

/**
 * TODO: [🐱‍🚀] Implement it here correctly and update JSDoc comments here, and on interface + other implementations
 * TODO: Write unit test
 * TODO: [🧠][🚙] `AgentXxx` vs `AgentsXxx` naming convention
 */
