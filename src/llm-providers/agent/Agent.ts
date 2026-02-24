import { BehaviorSubject } from 'rxjs';
import type {
    AgentBasicInformation,
    AgentCapability,
    BookParameter,
} from '../../book-2.0/agent-source/AgentBasicInformation';
import { computeAgentHash } from '../../book-2.0/agent-source/computeAgentHash';
import { createDefaultAgentName } from '../../book-2.0/agent-source/createDefaultAgentName';
import { parseAgentSource } from '../../book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { getAllCommitmentsToolTitles } from '../../commitments/_common/getAllCommitmentsToolTitles';
import { PROMPT_PARAMETER_SELF_LEARNING_ENABLED } from '../../constants';
import type { CallChatModelStreamOptions, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { Prompt } from '../../types/Prompt';
import type { SelfLearningToolCallResult, ToolCall } from '../../types/ToolCall';
import type {
    string_agent_hash,
    string_agent_name,
    string_agent_url,
    string_color,
    string_date_iso8601,
    string_fonts,
    string_markdown,
    string_prompt,
    string_url_image,
} from '../../types/typeAliases';
import { asUpdatableSubject } from '../../types/Updatable';
import { normalizeMessageText } from '../../utils/normalization/normalizeMessageText';
import { getSingleLlmExecutionTools } from '../_multiple/getSingleLlmExecutionTools';
import { AgentLlmExecutionTools } from './AgentLlmExecutionTools';
import type { AgentOptions } from './AgentOptions';
import { SelfLearningManager } from './self-learning/SelfLearningManager';

/**
 * Parses boolean prompt parameters, defaulting when the value is missing or invalid.
 *
 * @private
 */
function parseBooleanPromptParameter(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined) {
        return fallback;
    }

    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
        return true;
    }

    if (normalized === 'false') {
        return false;
    }

    try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'boolean') {
            return parsed;
        }
    } catch {
        // If JSON parsing fails, fall back to the default.
    }

    return fallback;
}

/**
 * Represents one AI Agent
 *
 * Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAssistantExecutionTools` - (Deprecated) which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities
 * - `OpenAiAgentKitExecutionTools` - which is a specific implementation of `LlmExecutionTools` backed by OpenAI AgentKit
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
     * Capabilities of the agent
     * This is parsed from commitments like USE BROWSER, USE SEARCH ENGINE, KNOWLEDGE, etc.
     */
    public capabilities: Array<AgentCapability> = [];

    /**
     * List of sample conversations (question/answer pairs)
     */
    public samples: Array<{ question: string | null; answer: string }> = [];

    /**
     * Knowledge sources (documents, URLs) used by the agent
     * This is parsed from KNOWLEDGE commitments
     * Used for resolving document citations when the agent references sources
     */
    public knowledgeSources: Array<{ url: string; filename: string }> = [];

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
        font?: string_fonts;
        color?: string_color;
        title?: string;
        description?: string;
        [key: string]: string | undefined;
    } = {};

    /**
     * Human-readable titles for tool functions
     */
    public toolTitles: Record<string, string> = {};

    /**
     * Not used in Agent, always returns empty array
     */
    get parameters(): Array<BookParameter> {
        return [
            /* [😰] */
        ];
    }

    public readonly agentSource: BehaviorSubject<string_book>;
    private readonly selfLearningManager: SelfLearningManager;

    public constructor(options: AgentOptions) {
        const agentSource = asUpdatableSubject(options.agentSource);

        super({
            isVerbose: options.isVerbose,
            llmTools: getSingleLlmExecutionTools(options.executionTools.llm),
            assistantPreparationMode: options.assistantPreparationMode,
            agentSource: agentSource.value, // <- TODO: [🐱‍🚀] Allow to pass BehaviorSubject<string_book> OR refresh llmExecutionTools.callChat on agentSource change
        });
        // TODO: [🐱‍🚀] Add `Agent` simple "mocked" learning by appending to agent source
        // TODO: [🐱‍🚀] Add `Agent` learning by promptbookAgent

        this.agentSource = agentSource;
        this.selfLearningManager = new SelfLearningManager({
            teacherAgent: options.teacherAgent,
            getAgentSource: () => this.agentSource.value,
            updateAgentSource: (source) => this.agentSource.next(source),
        });
        this.agentSource.subscribe((source) => {
            this.updateAgentSource(source);

            const {
                agentName,
                personaDescription,
                initialMessage,
                links,
                meta,
                capabilities,
                samples,
                knowledgeSources,
            } = parseAgentSource(source);
            this._agentName = agentName;
            this.personaDescription = personaDescription;
            this.initialMessage = initialMessage;
            this.links = links;
            this.capabilities = capabilities;
            this.samples = samples;
            this.knowledgeSources = knowledgeSources;
            this.meta = { ...this.meta, ...meta };
            this.toolTitles = {
                ...getAllCommitmentsToolTitles(),
                'self-learning': 'Self learning',
            };
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
        options?: CallChatModelStreamOptions,
    ): Promise<ChatPromptResult> {
        // [1] Check if the user is asking the same thing as in the samples
        const modelRequirements = await this.getModelRequirements();
        if (modelRequirements.samples) {
            const normalizedPrompt = normalizeMessageText(prompt.content);
            const sample = modelRequirements.samples.find(
                (sample) => sample.question !== null && normalizeMessageText(sample.question) === normalizedPrompt,
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
                        duration: { value: 0, isUncertain: true },
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

        const result = await super.callChatModelStream(prompt, onProgress, options);

        if (result.rawResponse && 'sample' in result.rawResponse) {
            return result;
        }

        if (modelRequirements.isClosed) {
            return result;
        }

        const shouldSelfLearn = parseBooleanPromptParameter(
            prompt.parameters?.[PROMPT_PARAMETER_SELF_LEARNING_ENABLED],
            true,
        );

        if (!shouldSelfLearn) {
            return result;
        }

        // Note: [0] Notify start of self-learning
        const selfLearningToolCall: ToolCall = {
            name: 'self-learning',
            arguments: {},
            createdAt: new Date().toISOString() as string_date_iso8601,
        };

        const resultWithLearning = {
            ...result,
            toolCalls: [...(result.toolCalls || []), selfLearningToolCall],
        };

        onProgress(resultWithLearning);

        const teacherSummary = await this.selfLearningManager.runSelfLearning(prompt, result);

        // Note: [4] Notify end of self-learning
        const completedAt = new Date().toISOString() as string_date_iso8601;
        const selfLearningResult: SelfLearningToolCallResult = {
            success: true,
            startedAt: selfLearningToolCall.createdAt,
            completedAt,
            samplesAdded: 1,
            teacher: teacherSummary || undefined,
        };
        const completedSelfLearningToolCall: ToolCall = {
            ...selfLearningToolCall,
            result: selfLearningResult,
        };

        const finalResult = {
            ...result,
            toolCalls: [...(result.toolCalls || []), completedSelfLearningToolCall],
        };

        onProgress(finalResult);

        return finalResult;
    }
}

/**
 * TODO: [🧠][😰]Agent is not working with the parameters, should it be?
 */
