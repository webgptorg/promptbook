import { BehaviorSubject } from 'rxjs';
import spaceTrim from 'spacetrim';
import type { AgentBasicInformation, BookParameter } from '../../book-2.0/agent-source/AgentBasicInformation';
import { computeAgentHash } from '../../book-2.0/agent-source/computeAgentHash';
import { createDefaultAgentName } from '../../book-2.0/agent-source/createDefaultAgentName';
import { padBook } from '../../book-2.0/agent-source/padBook';
import { parseAgentSource } from '../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { validateBook } from '../../book-2.0/agent-source/string_book';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type {
    string_agent_hash,
    string_agent_name,
    string_agent_url,
    string_date_iso8601,
    string_markdown,
    string_prompt,
    string_url_image,
} from '../../types/typeAliases';
import { asUpdatableSubject } from '../../types/Updatable';
import { normalizeMessageText } from '../../utils/normalization/normalizeMessageText';
import { getSingleLlmExecutionTools } from '../_multiple/getSingleLlmExecutionTools';
import { AgentLlmExecutionTools } from './AgentLlmExecutionTools';
import type { AgentOptions } from './AgentOptions';

/**
 * Represents one AI Agent
 *
 * Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAssistantExecutionTools` - which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities, recommended for usage in `Agent` or `AgentLlmExecutionTools`
 * - `RemoteAgent` - which is an `Agent` that connects to a Promptbook Agents Server
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
     * Links found in the agent source
     */
    public links: Array<string_agent_url> = [];

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
        fullname?: string;
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
            agentSource: agentSource.value, // <- TODO: [🐱‍🚀] Allow to pass BehaviorSubject<string_book> OR refresh llmExecutionTools.callChat on agentSource change
        });
        // TODO: [🐱‍🚀] Add `Agent` simple "mocked" learning by appending to agent source
        // TODO: [🐱‍🚀] Add `Agent` learning by promptbookAgent

        this.agentSource = agentSource;
        this.agentSource.subscribe((source) => {
            this.updateAgentSource(source);

            const { agentName, personaDescription, initialMessage, links, meta } = parseAgentSource(source);
            this._agentName = agentName;
            this.personaDescription = personaDescription;
            this.initialMessage = initialMessage;
            this.links = links;
            this.meta = { ...this.meta, ...meta };
        });
    }

    /**
     * Calls the chat model with agent-specific system prompt and requirements with streaming
     *
     * Note: This method also implements the learning mechanism
     */
    public async callChatModelStream(
        prompt: Prompt,
        onProgress: (chunk: ChatPromptResult) => void,
    ): Promise<ChatPromptResult> {
        // [1] Check if the user is asking the same thing as in the samples
        const modelRequirements = await this.getAgentModelRequirements();
        if (modelRequirements.samples) {
            const normalizedPrompt = normalizeMessageText(prompt.content);
            const sample = modelRequirements.samples.find(
                (s) => normalizeMessageText(s.question) === normalizedPrompt,
            );

            if (sample) {
                const now = new Date().toISOString() as string_date_iso8601;
                const result: ChatPromptResult = {
                    content: sample.answer as string_markdown,
                    modelName: this.modelName,
                    timing: {
                        start: now,
                        complete: now,
                    },
                    usage: {
                        price: { value: 0, isUncertain: true },
                        input: {
                            tokensCount: { value: 0, isUncertain: true },
                            charactersCount: { value: 0, isUncertain: true },
                            wordsCount: { value: 0, isUncertain: true },
                            linesCount: { value: 0, isUncertain: true },
                            sentencesCount: { value: 0, isUncertain: true },
                            paragraphsCount: { value: 0, isUncertain: true },
                            pagesCount: { value: 0, isUncertain: true },
                        },
                        output: {
                            tokensCount: { value: 0, isUncertain: true },
                            charactersCount: { value: 0, isUncertain: true },
                            wordsCount: { value: 0, isUncertain: true },
                            linesCount: { value: 0, isUncertain: true },
                            sentencesCount: { value: 0, isUncertain: true },
                            paragraphsCount: { value: 0, isUncertain: true },
                            pagesCount: { value: 0, isUncertain: true },
                        },
                    },
                    rawPromptContent: prompt.content as string_prompt,
                    rawRequest: null,
                    rawResponse: { sample },
                };
                onProgress(result);
                return result;
            }
        }

        const result = await super.callChatModelStream(prompt, onProgress);

        if (result.rawResponse && 'sample' in result.rawResponse) {
            return result;
        }

        // TODO: !!! Extract learning to separate method
        // Learning: Append the conversation sample to the agent source
        const learningExample = spaceTrim(
            (block) => `

                ---

                USER MESSAGE
                ${block(prompt.content)}

                AGENT MESSAGE
                ${block(result.content)}

            `,
        );

        // Append to the current source
        const currentSource = this.agentSource.value;
        const newSource = padBook(validateBook(spaceTrim(currentSource) + '\n\n' + learningExample));

        // Update the source (which will trigger the subscription and update the underlying tools)
        this.agentSource.next(newSource as string_book);

        return result;
    }
}

/**
 * TODO: [🧠][😰]Agent is not working with the parameters, should it be?
 */
