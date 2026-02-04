import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { ExecutionTools } from '../../execution/ExecutionTools';
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
     * How to manage OpenAI assistant preparation when using OpenAiAssistantExecutionTools.
     *
     * Use `external` when an external cache manager already created the assistant and
     * the agent should use it as-is.
     *
     * @default internal
     */
    assistantPreparationMode?: 'internal' | 'external';

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
};
