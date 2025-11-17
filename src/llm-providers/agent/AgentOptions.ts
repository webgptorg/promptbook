import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { Updatable } from '../../types/Updatable';

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
