import { CommonToolsOptions, ExecutionTools, string_book } from '../../_packages/types.index';
import { Updatable } from '../../types/Updatable';

/**
 * Options for creating an Agent
 */
export type AgentOptions = CommonToolsOptions & {

    /**
     * The execution tools available to the agent
     * 
     * Here the agent has access to various LLM models, browser, scrapers, LibreOffice, tools, etc.
     */
    executionTools: ExecutionTools;

    /**
     * The source of the agent
     */
    agentSource: Updatable<string_book>;
};
