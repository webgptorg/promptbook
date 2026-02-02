import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { PreparedExternals } from '../../types/PreparedExternals';
import type { Updatable } from '../../types/Updatable';

import { Agent } from './Agent';

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

    /**
     * Teacher agent for self-learning
     *
     * Note: If provided, the agent can do full self-learning from the teacher agent during its operation.
     */
    teacherAgent: Agent | null;

    /**
     * Callback for updating prepared externals.
     * This is called when a new external resource (like OpenAI Assistant) is created.
     */
    onPreparedExternalsUpdate?: (preparedExternals: PreparedExternals) => void;

    /**
     * Initial prepared externals (if any) to use for caching.
     */
    preparedExternals?: PreparedExternals;
};
