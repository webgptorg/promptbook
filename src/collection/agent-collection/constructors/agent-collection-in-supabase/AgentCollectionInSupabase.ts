import type { SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import type { AgentBasicInformation } from '../../../../book-2.0/agent-source/AgentBasicInformation';
import { parseAgentSource } from '../../../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../../book-2.0/agent-source/string_book';
import { DEFAULT_IS_VERBOSE } from '../../../../config';
import { DatabaseError } from '../../../../errors/DatabaseError';
import { NotYetImplementedError } from '../../../../errors/NotYetImplementedError';
import type { CommonToolsOptions } from '../../../../execution/CommonToolsOptions';
import { ZERO_USAGE } from '../../../../execution/utils/usage-constants';
import type { PrepareAndScrapeOptions } from '../../../../prepare/PrepareAndScrapeOptions';
import type { string_agent_name } from '../../../../types/typeAliases';
import { spaceTrim } from '../../../../utils/organization/spaceTrim';
import { TODO_USE } from '../../../../utils/organization/TODO_USE';
import { PROMPTBOOK_ENGINE_VERSION } from '../../../../version';
import type { AgentsDatabaseSchema } from './AgentsDatabaseSchema';

/**
 * Agent collection stored in Supabase table
 *
 * Note: This object can work both from Node.js and browser environment depending on the Supabase client provided
 *
 * @public exported from `@promptbook/core`
 * <- TODO: !!! Move to `@promptbook/supabase` package
 */
export class AgentCollectionInSupabase /* TODO: !!!! implements AgentCollection */ {
    /**
     * @param rootPath - path to the directory with agents
     * @param tools - Execution tools to be used in !!! `Agent` itself and listing the agents
     * @param options - Options for the collection creation
     */
    public constructor(
        private readonly supabaseClient: SupabaseClient<AgentsDatabaseSchema>,
        /// TODO: !!! Remove> private readonly tools?: Pick<ExecutionTools, 'llm' | 'fs' | 'scrapers'>,
        public readonly options?: PrepareAndScrapeOptions & CommonToolsOptions,
    ) {
        const { isVerbose = DEFAULT_IS_VERBOSE } = options || {};

        if (isVerbose) {
            console.info(`Creating pipeline collection from supabase...`);
        }
    }

    /**
     * Cached defined execution tools
     */
    // !!! private _definedTools: ExecutionTools | null = null;

    /*
    TODO: !!! Use or remove
    /**
     * Gets or creates execution tools for the collection
     * /
    private async getTools(): Promise<ExecutionTools> {
        if (this._definedTools !== null) {
            return this._definedTools;
        }

        this._definedTools = {
            ...(this.tools === undefined || this.tools.fs === undefined ? await $provideExecutionToolsForNode() : {}),
            ...this.tools,
        };
        return this._definedTools;
    }
    // <- TODO: [👪] Maybe create some common abstraction *(or parent abstract class)*
    */

    /**
     * Gets all agents in the collection
     */
    public async listAgents(/* TODO: [🧠] Allow to pass some condition here */): Promise<
        ReadonlyArray<AgentBasicInformation>
    > {
        const { isVerbose = DEFAULT_IS_VERBOSE } = this.options || {};
        const result = await this.supabaseClient
            .from('AgentCollection' /* <- TODO: !!!! Change to `Agent` */)
            .select('agentProfile');

        if (result.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                
                        Error fetching agents from Supabase:
                        
                        ${block(result.error.message)}
                    `,
                ),
            );
        }

        if (isVerbose) {
            console.info(`Found ${result.data.length} agents in directory`);
        }

        return result.data.map((row) => row.agentProfile as AgentBasicInformation);
    }

    /**
     * !!!
     * /
    public async spawnAgent(agentName: string_agent_name): Promise<Agent> {
   
        // <- TODO: !!! ENOENT: no such file or directory, open 'C:\Users\me\work\ai\promptbook\agents\examples\Asistent pro LŠVP.book
        const { isVerbose = DEFAULT_IS_VERBOSE } = this.options || {};
        const tools = await this.getTools();

        const agentSourceValue = validateBook(await tools.fs!.readFile(agentSourcePath, 'utf-8'));
        const agentSource = new BehaviorSubject(agentSourceValue);

        // Note: Write file whenever agent source changes
        agentSource.subscribe(async (newSource) => {
            if (isVerbose) {
                console.info(colors.cyan(`Writing agent source to file ${agentSourcePath}`));
            }
            await forTime(500); // <- TODO: [🙌] !!! Remove
            await tools.fs!.writeFile(agentSourcePath, newSource, 'utf-8');
        });

        // Note: Watch file for external changes
        for await (const event of tools.fs!.watch(agentSourcePath)) {
            // <- TODO: !!!! Solve the memory freeing when the watching is no longer needed

            if (event.eventType !== 'change') {
                continue;
            }

            if (isVerbose) {
                console.info(
                    colors.cyan(`Detected external change in agent source file ${agentSourcePath}, reloading`),
                );
            }
            await forTime(500); // <- TODO: [🙌] !!! Remove
            const newSource = validateBook(await tools.fs!.readFile(agentSourcePath, 'utf-8'));
            agentSource.next(newSource);
        }

        // TODO: [🙌] !!!! Debug the infinite loop when file is changed externally and agent source is updated which causes file to be written again

        const agent = new Agent({
            ...this.options,
            agentSource,
            executionTools: this.tools || {},
        });

        if (isVerbose) {
            console.info(colors.cyan(`Created agent "${agent.agentName}" from source file ${agentSourcePath}`));
        }

        return agent;
        * /
    }
    */

    /**
     * !!!@@@
     */
    public async getAgentSource(agentName: string_agent_name): Promise<BehaviorSubject<string_book>> {
        const result = await this.supabaseClient
            .from('AgentCollection' /* <- TODO: !!!! Change to `Agent` */)
            .select('agentSource')
            .eq('agentName', agentName)
            .single();

        if (result.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                
                        Error fetching agent "${agentName}" from Supabase:
                        
                        ${block(result.error.message)}
                    `,
                ),
            );
            // <- TODO: !!! First check if the error is "not found" and throw `NotFoundError` instead then throw `DatabaseError`
        }

        const agentSource = new BehaviorSubject(result.data.agentSource as string_book);
        // <- TODO: !!!! Dynamic updates
        return agentSource;
    }

    /**
     * Creates a new agent in the collection
     *
     * Note: You can set 'PARENT' in the agent source to inherit from another agent in the collection.
     */
    public async createAgent(agentSource: string_book): Promise<AgentBasicInformation> {
        const agentProfile = parseAgentSource(agentSource as string_book);
        //     <- TODO: [🕛]

        const result = await this.supabaseClient.from('AgentCollection' /* <- TODO: !!!! Change to `Agent` */).insert({
            agentName: agentProfile.agentName || '!!!!!' /* <- TODO: !!!! Remove */,
            agentProfile,
            createdAt: new Date().toISOString(),
            updatedAt: null,
            agentVersion: 0,
            promptbookEngineVersion: PROMPTBOOK_ENGINE_VERSION,
            usage: ZERO_USAGE,
            agentSource: agentSource,
        });

        if (result.error) {
            throw new DatabaseError(
                spaceTrim(
                    (block) => `
                        Error creating agent "${agentProfile.agentName}" in Supabase:
                        
                        ${block(result.error.message)}
                    `,
                ),
            );
        }

        return agentProfile;
    }

    /**
     * Deletes an agent from the collection
     */
    public async deleteAgent(agentName: string_agent_name): Promise<void> {
        TODO_USE(agentName);
        throw new NotYetImplementedError('Method not implemented.');
    }
}

/**
 * TODO: !!!! Implement it here correctly and update JSDoc comments here, and on interface + other implementations
 * TODO: Write unit test
 * TODO: [🧠][🚙] `AgentXxx` vs `AgentsXxx` naming convention
 */
