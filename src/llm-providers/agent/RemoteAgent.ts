import { BehaviorSubject } from 'rxjs';
import { ChatPromptResult, Prompt, string_book, TODO_any } from '../../_packages/types.index';
import { string_agent_url } from '../../types/typeAliases';
import { Agent } from './Agent';
import type { AgentOptions } from './AgentOptions';
import { RemoteAgentOptions } from './RemoteAgentOptions';

/**
 * Represents one AI Agent
 *
 * !!! Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * !!!! `RemoteAgent`
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAssistantExecutionTools` - which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities, recommended for usage in `Agent` or `AgentLlmExecutionTools`
 *
 * @public exported from `@promptbook/core`
 */
export class RemoteAgent extends Agent {
    public static async connect(options: RemoteAgentOptions) {
        console.log('!!!!!', `${options.agentUrl}/api/book`);
        const bookResponse = await fetch(`${options.agentUrl}/api/book`);
        // <- TODO: !!!! What about closed-source agents?
        // <- TODO: !!!! Maybe use promptbookFetch

        const agentSourceValue = (await bookResponse.text()) as string_book;
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

    private constructor(options: AgentOptions & RemoteAgentOptions) {
        super(options);
        this.agentUrl = options.agentUrl;
    }

    /**
     * Calls the agent on agents remote server
     */
    public async callChatModel(prompt: Prompt): Promise<ChatPromptResult> {
        // Ensure we're working with a chat prompt
        if (prompt.modelRequirements.modelVariant !== 'CHAT') {
            throw new Error('Agents only supports chat prompts');
        }

        const bookResponse = await fetch(`${this.agentUrl}/api/chat?message=${encodeURIComponent(prompt.content)}`);
        // <- TODO: !!!! What about closed-source agents?
        // <- TODO: !!!! Maybe use promptbookFetch

        const bookResponseContent = (await bookResponse.text()) as string_book;
        // <- TODO: !!!!!!!! Try streaming
        // <- TODO: !!!!!!!! Transfer metadata

        const agentResult: ChatPromptResult = {
            content: bookResponseContent,
            modelName: this.modelName,
            timing: {} as TODO_any,
            usage: {} as TODO_any,
            rawPromptContent: {} as TODO_any,
            rawRequest: {} as TODO_any,
            rawResponse: {} as TODO_any,
            // <- TODO: !!!!!!!! Transfer and proxy the metadata
        };

        return agentResult;
    }
}

/**
 * TODO: [🧠][😰]Agent is not working with the parameters, should it be?
 * TODO: !!! Agent on remote server
 */
