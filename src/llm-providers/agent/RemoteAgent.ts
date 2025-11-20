import { BehaviorSubject } from 'rxjs';
import { string_book } from '../../_packages/types.index';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import { string_agent_url } from '../../types/typeAliases';
import { MockedEchoLlmExecutionTools } from '../mocked/MockedEchoLlmExecutionTools';
import { Agent } from './Agent';
import type { AgentOptions } from './AgentOptions';
import { RemoteAgentOptions } from './RemoteAgentOptions';

/**
 * Represents one AI Agent
 *
 * Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAssistantExecutionTools` - which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities, recommended for usage in `Agent` or `AgentLlmExecutionTools`
 *
 * @public exported from `@promptbook/core`
 */
export class RemoteAgent extends Agent {
    public static async connect(options: RemoteAgentOptions) {
        const bookRequest = await fetch(`${options.agentUrl}/api/book`);
        // <- TODO: !!!! What about closed-source agents?

        const agentSourceValue = (await bookRequest.text()) as string_book;
        const agentSource: BehaviorSubject<string_book> = new BehaviorSubject<string_book>(agentSourceValue);
        // <- TODO: !!!!!! Support updating

        return new RemoteAgent({
            ...options,
            executionTools: {
                /* Note: Theese tools arent used */
            },
            agentSource,
        });
    }

    /**
     * The source of the agent
     */
    private agentUrl: string_agent_url;

    constructor(options: AgentOptions & RemoteAgentOptions) {
        super(options);
        this.agentUrl = options.agentUrl;
    }

    /**
     * Creates LlmExecutionTools which exposes the agent as a model
     */
    getLlmExecutionTools(): LlmExecutionTools {
        return new MockedEchoLlmExecutionTools({});
    }
}

/**
 * TODO: [🧠][😰]Agent is not working with the parameters, should it be?
 * TODO: !!! Agent on remote server
 */
