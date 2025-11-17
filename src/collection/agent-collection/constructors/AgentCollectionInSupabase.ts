import type { SupabaseClient } from '@supabase/supabase-js';
import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { BehaviorSubject } from 'rxjs';
import { forTime } from 'waitasecond';
import { parseAgentSource } from '../../../_packages/core.index';
import { AgentBasicInformation } from '../../../_packages/types.index';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import { validateBook } from '../../../book-2.0/agent-source/string_book';
import { DEFAULT_IS_VERBOSE } from '../../../config';
import { DatabaseError } from '../../../errors/DatabaseError';
import { NotYetImplementedError } from '../../../errors/NotYetImplementedError';
import type { CommonToolsOptions } from '../../../execution/CommonToolsOptions';
import type { ExecutionTools } from '../../../execution/ExecutionTools';
import { $provideExecutionToolsForNode } from '../../../execution/utils/$provideExecutionToolsForNode';
import { Agent } from '../../../llm-providers/agent/Agent';
import type { PrepareAndScrapeOptions } from '../../../prepare/PrepareAndScrapeOptions';
import type { string_agent_name } from '../../../types/typeAliases';
import { spaceTrim } from '../../../utils/organization/spaceTrim';
import { TODO_USE } from '../../../utils/organization/TODO_USE';
import type { AgentCollection } from '../AgentCollection';
import type { AgentsDatabaseSchema } from './AgentsDatabaseSchema';

/**
 * Agent collection stored in Supabase table
 *
 * Note: This object can work both from Node.js and browser environment depending on the Supabase client provided
 *
 * @public exported from `@promptbook/core`
 * <- TODO: !!! Move to `@promptbook/supabase` package
 */
export class AgentCollectionInSupabase implements AgentCollection {
    /**
     * @param rootPath - path to the directory with agents
     * @param tools - Execution tools to be used in `Agent` itself and listing the agents
     * @param options - Options for the collection creation
     */
    public constructor(
        private readonly supabaseClient: SupabaseClient<AgentsDatabaseSchema>,
        private readonly tools?: Pick<ExecutionTools, 'llm' | 'fs' | 'scrapers'>,
        public readonly options?: PrepareAndScrapeOptions & CommonToolsOptions,
    ) {
        const { isVerbose = DEFAULT_IS_VERBOSE } = options || {};

        if (isVerbose) {
            console.info(colors.cyan(`Creating pipeline collection from supabase`));
        }
    }

    /**
     * Cached defined execution tools
     */
    private _definedTools: ExecutionTools | null = null;

    /**
     * Gets or creates execution tools for the collection
     */
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

    /**
     * Gets all agents in the collection
     */
    public async listAgents(/* TODO: [🧠] Allow to pass some contition here */): Promise<
        ReadonlyArray<AgentBasicInformation>
    > {
        const { isVerbose = DEFAULT_IS_VERBOSE } = this.options || {};
        const result = await this.supabaseClient
            .from('AgentCollection' /* <- TODO: !!!! Change to `Agent` */)
            .select('agentName,agentSource');

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

        const agentNames = result.data.map(({ agentName: agentNameFromDatabase, agentSource }) => {
            const agent = parseAgentSource(agentSource as string_book);

            TODO_USE(agentNameFromDatabase);
            // TODO: !!! `isCrashedOnError` / `isCrashedOnInconsistency`

            return agent;
        });

        if (isVerbose) {
            console.info(`Found ${agentNames.length} agents in directory`);
        }

        return agentNames;
    }

    /**
     * Get one agent by its name
     *
     * Note: Agents are existing independently of you getting them or not, you can get the same agent multiple times.
     * Note: Agents are changed by interacting with `Agent` objects directly. Only creation and deletion is done via the collection.
     */
    public async getAgentByName(agentName: string_agent_name): Promise<Agent> {
        // <- TODO: !!! ENOENT: no such file or directory, open 'C:\Users\me\work\ai\promptbook\agents\examples\Asistent pro LŠVP.book
        const { isVerbose = DEFAULT_IS_VERBOSE } = this.options || {};
        const tools = await this.getTools();

        const agentSourcePath = `${this.rootPath}/${agentName}.book`;

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
    }

    /**
     * Deletes an agent from the collection
     *
     * Note: When you want delete an agent by name, first get the agent using `getAgentByName` and then pass it to `deleteAgent`.
     */
    public async deleteAgent(agent: Agent): Promise<void> {
        TODO_USE(agent);
        throw new NotYetImplementedError('Method not implemented.');
    }

    /**
     * Creates a new agent in the collection
     *
     * Note: You can set 'PARENT' in the agent source to inherit from another agent in the collection.
     */
    public async createAgent(agentSource: string_book): Promise<Agent> {
        TODO_USE(agentSource);
        throw new NotYetImplementedError('Method not implemented.');
    }
}

/**
 * TODO: [🧠][🚙] `AgentXxx` vs `AgentsXxx` naming convention
 */
