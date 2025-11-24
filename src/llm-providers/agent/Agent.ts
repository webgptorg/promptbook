import { BehaviorSubject } from 'rxjs';
import type { AgentBasicInformation, BookParameter } from '../../book-2.0/agent-source/AgentBasicInformation';
import { computeAgentHash } from '../../book-2.0/agent-source/computeAgentHash';
import { createDefaultAgentName } from '../../book-2.0/agent-source/createDefaultAgentName';
import { parseAgentSource } from '../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { string_agent_hash, string_agent_name, string_url_image } from '../../types/typeAliases';
import { asUpdatableSubject } from '../../types/Updatable';
import { getSingleLlmExecutionTools } from '../_multiple/getSingleLlmExecutionTools';
import { AgentLlmExecutionTools } from './AgentLlmExecutionTools';
import type { AgentOptions } from './AgentOptions';

/**
 * Represents one AI Agent
 *
 * !!! Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAssistantExecutionTools` - which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities, recommended for usage in `Agent` or `AgentLlmExecutionTools`
 *
 * @public exported from `@promptbook/core`
 */
export class Agent extends AgentLlmExecutionTools implements LlmExecutionTools, AgentBasicInformation {
    private _agentName: string_agent_name | undefined = undefined;

    /**
     * Name of the agent
     */
    public get agentName(): string_agent_name {
        return this._agentName || createDefaultAgentName(this.agentSource.value);
    }

    /**
     * Description of the agent
     */
    public personaDescription: string | null = null;

    /**
     * The initial message shown to the user when the chat starts
     */
    public initialMessage: string | null = null;

    /**
     * Computed hash of the agent source for integrity verification
     */
    public get agentHash(): string_agent_hash {
        return computeAgentHash(this.agentSource.value);
    }

    /**
     * Metadata like image or color
     */
    public meta: {
        image?: string_url_image;
        link?: string;
        title?: string;
        description?: string;
        [key: string]: string | undefined;
    } = {};

    /**
     * Not used in Agent, always returns empty array
     */
    get parameters(): BookParameter[] {
        return [
            /* [😰] */
        ];
    }

    public readonly agentSource: BehaviorSubject<string_book>;

    constructor(options: AgentOptions) {
        const agentSource = asUpdatableSubject(options.agentSource);

        super({
            isVerbose: options.isVerbose,
            llmTools: getSingleLlmExecutionTools(options.executionTools.llm),
            agentSource: agentSource.value, // <- TODO: !!!! Allow to pass BehaviorSubject<string_book> OR refresh llmExecutionTools.callChat on agentSource change
        });
        // TODO: !!!!! Add `Agent` simple "mocked" learning by appending to agent source
        // TODO: !!!!! Add `Agent` learning by promptbookAgent

        this.agentSource = agentSource;
        this.agentSource.subscribe((source) => {
            const { agentName, personaDescription, initialMessage, meta } = parseAgentSource(source);
            this._agentName = agentName;
            this.personaDescription = personaDescription;
            this.initialMessage = initialMessage;
            this.meta = { ...this.meta, ...meta };
        });
    }
}

/**
 * TODO: [🧠][😰]Agent is not working with the parameters, should it be?
 * TODO: !!! Agent on remote server
 */
