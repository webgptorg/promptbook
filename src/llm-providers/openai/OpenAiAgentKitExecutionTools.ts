import { Agent as AgentFromKit, run, setDefaultOpenAIClient, setDefaultOpenAIKey } from '@openai/agents';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { CallChatModelStreamOptions, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import { uncertainNumber } from '../../execution/utils/uncertainNumber';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text } from '../../types/string_markdown';
import type { string_model_name } from '../../types/string_model_name';
import type { string_prompt } from '../../types/string_prompt';
import type { string_title } from '../../types/string_title';
import type { string_date_iso8601 } from '../../types/string_token';
import type { ToolCall, ToolCallLogEntry } from '../../types/ToolCall';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import type { chococake } from '../../utils/organization/really_any';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { templateParameters } from '../../utils/parameters/templateParameters';
import type { OpenAiAgentKitExecutionToolsOptions } from './OpenAiAgentKitExecutionToolsOptions';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from './OpenAiCompatibleExecutionToolsOptions';
import { OpenAiAgentKitExecutionToolsInputBuilder } from './OpenAiAgentKitExecutionToolsInputBuilder';
import { OpenAiAgentKitExecutionToolsOutputTypeMapper } from './OpenAiAgentKitExecutionToolsOutputTypeMapper';
import { OpenAiAgentKitExecutionToolsToolBuilder } from './OpenAiAgentKitExecutionToolsToolBuilder';
import { OpenAiVectorStoreHandler } from './OpenAiVectorStoreHandler';

/**
 * Constant for default agent kit model name.
 */
const DEFAULT_AGENT_KIT_MODEL_NAME = 'gpt-5.4-mini' as string_model_name;

/**
 * Alias for OpenAI AgentKit agent to avoid naming confusion with Promptbook agents.
 */
type OpenAiAgentKitAgent = AgentFromKit;

/**
 * Prepared AgentKit agent details.
 */
type OpenAiAgentKitPreparedAgent = {
    readonly agent: OpenAiAgentKitAgent;
    readonly vectorStoreId?: string;
};

/**
 * AgentKit output type returned by the dedicated response-format mapper.
 */
type OpenAiAgentKitAgentOutputType = ReturnType<
    typeof OpenAiAgentKitExecutionToolsOutputTypeMapper.mapResponseFormatToAgentOutputType
>;

/**
 * Discriminant for type guards.
 *
 * @private const of `OpenAiAgentKitExecutionTools`
 */
const DISCRIMINANT = 'OPEN_AI_AGENT_KIT_V1';

/**
 * Execution tools for OpenAI AgentKit (Agents SDK).
 *
 * @public exported from `@promptbook/openai`
 */
export class OpenAiAgentKitExecutionTools extends OpenAiVectorStoreHandler implements LlmExecutionTools {
    private preparedAgentKitAgent: OpenAiAgentKitPreparedAgent | null = null;
    private readonly agentKitModelName: string_model_name;
    private readonly inputBuilder = new OpenAiAgentKitExecutionToolsInputBuilder();
    private readonly toolBuilder: OpenAiAgentKitExecutionToolsToolBuilder;

    /**
     * Creates OpenAI AgentKit execution tools.
     */
    public constructor(options: OpenAiAgentKitExecutionToolsOptions) {
        if ((options as OpenAiCompatibleExecutionToolsNonProxiedOptions).isProxied) {
            throw new NotYetImplementedError(`Proxy mode is not yet implemented for OpenAI AgentKit`);
        }

        super(options as OpenAiCompatibleExecutionToolsNonProxiedOptions);
        this.agentKitModelName = options.agentKitModelName ?? DEFAULT_AGENT_KIT_MODEL_NAME;
        this.toolBuilder = new OpenAiAgentKitExecutionToolsToolBuilder({
            options,
            agentKitModelName: this.agentKitModelName,
        });
    }

    public get title(): string_title & string_markdown_text {
        return 'OpenAI AgentKit';
    }

    public get description(): string_markdown {
        return 'Use OpenAI AgentKit for agent-style chat with tools and knowledge';
    }

    /**
     * Calls OpenAI AgentKit with a chat prompt (non-streaming).
     */
    public async callChatModel(prompt: Prompt): Promise<ChatPromptResult> {
        return this.callChatModelStream(prompt, () => {});
    }

    /**
     * Calls OpenAI AgentKit with a chat prompt (streaming).
     */
    public async callChatModelStream(
        prompt: Prompt,
        onProgress: (chunk: ChatPromptResult) => void,
        options?: CallChatModelStreamOptions,
    ): Promise<ChatPromptResult> {
        const { content, parameters, modelRequirements } = prompt;

        if (modelRequirements.modelVariant !== 'CHAT') {
            throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
        }

        for (const key of ['maxTokens', 'modelName', 'seed', 'temperature'] as Array<keyof ModelRequirements>) {
            if (modelRequirements[key] !== undefined) {
                throw new NotYetImplementedError(`In \`OpenAiAgentKitExecutionTools\` you cannot specify \`${key}\``);
            }
        }

        const rawPromptContent = this.templatePromptContent(content, parameters);
        const responseFormatOutputType = OpenAiAgentKitExecutionToolsOutputTypeMapper.mapResponseFormatToAgentOutputType(
            modelRequirements.responseFormat,
        );
        const preparedAgentKitAgent = await this.prepareAgentKitAgent({
            name: (prompt.title || 'Agent') as string_title,
            instructions: modelRequirements.systemMessage || '',
            knowledgeSources: modelRequirements.knowledgeSources,
            tools: 'tools' in prompt && Array.isArray(prompt.tools) ? prompt.tools : modelRequirements.tools,
        });

        return this.callChatModelStreamWithPreparedAgent({
            openAiAgentKitAgent: preparedAgentKitAgent.agent,
            prompt,
            rawPromptContent,
            onProgress,
            responseFormatOutputType,
            signal: options?.signal,
        });
    }

    /**
     * Returns a prepared AgentKit agent when the server wants to manage caching externally.
     */
    public getPreparedAgentKitAgent(): OpenAiAgentKitPreparedAgent | null {
        return this.preparedAgentKitAgent;
    }

    /**
     * Stores a prepared AgentKit agent for later reuse by external cache managers.
     */
    public setPreparedAgentKitAgent(preparedAgent: OpenAiAgentKitPreparedAgent): void {
        this.preparedAgentKitAgent = preparedAgent;
    }

    /**
     * Creates a new tools instance bound to a prepared AgentKit agent.
     */
    public getPreparedAgentTools(preparedAgent: OpenAiAgentKitPreparedAgent): OpenAiAgentKitExecutionTools {
        const tools = new OpenAiAgentKitExecutionTools(this.agentKitOptions);
        tools.setPreparedAgentKitAgent(preparedAgent);
        return tools;
    }

    /**
     * Prepares an AgentKit agent with optional knowledge sources and tool definitions.
     */
    public async prepareAgentKitAgent(options: {
        readonly name: string_title;
        readonly instructions: string_markdown;
        readonly knowledgeSources?: ReadonlyArray<string>;
        readonly tools?: ModelRequirements['tools'];
        readonly vectorStoreId?: string;
        readonly storeAsPrepared?: boolean;
    }): Promise<OpenAiAgentKitPreparedAgent> {
        const {
            name,
            instructions,
            knowledgeSources,
            tools,
            vectorStoreId: cachedVectorStoreId,
            storeAsPrepared,
        } = options;

        await this.ensureAgentKitDefaults();

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Preparing OpenAI AgentKit agent', {
                name,
                instructionsLength: instructions.length,
                knowledgeSourcesCount: knowledgeSources?.length ?? 0,
                toolsCount: tools?.length ?? 0,
            });
        }

        let vectorStoreId = cachedVectorStoreId;

        if (!vectorStoreId && knowledgeSources && knowledgeSources.length > 0) {
            const vectorStoreResult = await this.createVectorStoreWithKnowledgeSources({
                client: await this.getClient(),
                name,
                knowledgeSources,
                logLabel: 'agentkit preparation',
            });
            vectorStoreId = vectorStoreResult.vectorStoreId;
        } else if (vectorStoreId && this.options.isVerbose) {
            console.info('[🤰]', 'Using cached vector store for AgentKit agent', {
                name,
                vectorStoreId,
            });
        }

        const agentKitTools = this.buildAgentKitTools({ tools, vectorStoreId });
        const openAiAgentKitAgent = new AgentFromKit({
            name,
            model: this.agentKitModelName,
            instructions: instructions || 'You are a helpful assistant.',
            tools: agentKitTools,
        });

        const preparedAgent: OpenAiAgentKitPreparedAgent = {
            agent: openAiAgentKitAgent,
            vectorStoreId,
        };

        if (storeAsPrepared) {
            this.setPreparedAgentKitAgent(preparedAgent);
        }

        if (this.options.isVerbose) {
            console.info('[🤰]', 'OpenAI AgentKit agent ready', {
                name,
                model: this.agentKitModelName,
                toolCount: agentKitTools.length,
                hasVectorStore: Boolean(vectorStoreId),
            });
        }

        return preparedAgent;
    }

    /**
     * Runs a prepared AgentKit agent and streams results back to the caller.
     */
    public async callChatModelStreamWithPreparedAgent(options: {
        readonly openAiAgentKitAgent: OpenAiAgentKitAgent;
        readonly prompt: Prompt;
        readonly rawPromptContent?: string;
        readonly onProgress: (chunk: ChatPromptResult & { isFinished?: boolean }) => void;
        readonly responseFormatOutputType?: OpenAiAgentKitAgentOutputType;
        /**
         * Optional abort signal propagated from chat surfaces so stream generation can be cancelled.
         */
        readonly signal?: AbortSignal;
    }): Promise<ChatPromptResult> {
        const { openAiAgentKitAgent, prompt, onProgress } = options;
        const rawPromptContent = options.rawPromptContent ?? this.templatePromptContent(prompt.content, prompt.parameters);
        const agentForRun =
            options.responseFormatOutputType !== undefined
                ? openAiAgentKitAgent.clone({
                      outputType: options.responseFormatOutputType as TODO_any,
                  })
                : openAiAgentKitAgent;
        const start: string_date_iso8601 = $getCurrentDate();
        let latestContent = '';
        const toolCalls: ToolCall[] = [];
        const toolCallIndexById = new Map<string, number>();

        this.toolBuilder.clearRunState();

        const inputItems = await this.inputBuilder.buildAgentKitInputItems(prompt, rawPromptContent);
        const rawRequest: chococake = {
            agentName: agentForRun.name,
            input: inputItems,
        };
        const streamResult = await run(agentForRun, inputItems, {
            stream: true,
            maxTurns: 200,
            context: {
                parameters: prompt.parameters,
                onToolProgress: onProgress,
                rawPromptContent,
                startedAt: start,
                modelName: this.agentKitModelName,
            },
            signal: options.signal,
        });

        const emitFinishedStreamSnapshot = (): void => {
            onProgress({
                content: (streamResult.finalOutput ?? latestContent) as string_markdown,
                modelName: this.agentKitModelName,
                timing: { start, complete: $getCurrentDate() },
                usage: UNCERTAIN_USAGE,
                rawPromptContent: rawPromptContent as string_prompt,
                rawRequest: null,
                rawResponse: { runResult: streamResult },
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                isFinished: true,
            });
        };

        for await (const event of streamResult) {
            if (event.type === 'raw_model_stream_event' && event.data?.type === 'output_text_delta') {
                latestContent += event.data.delta;
                onProgress({
                    content: latestContent as string_markdown,
                    modelName: this.agentKitModelName,
                    timing: { start, complete: $getCurrentDate() },
                    usage: UNCERTAIN_USAGE,
                    rawPromptContent: rawPromptContent as string_prompt,
                    rawRequest: null,
                    rawResponse: {},
                });
                continue;
            }

            if (event.type !== 'run_item_stream_event') {
                continue;
            }

            const rawItem = (event.item as TODO_any)?.rawItem as TODO_any | undefined;

            if (event.name === 'tool_called' && rawItem?.type === 'function_call') {
                const toolCall: ToolCall = {
                    name: rawItem.name,
                    arguments: rawItem.arguments,
                    rawToolCall: rawItem,
                    createdAt: $getCurrentDate(),
                    state: 'PENDING',
                    logs: [
                        OpenAiAgentKitExecutionToolsToolBuilder.createToolCallLogEntry({
                            kind: 'request',
                            title: 'Request prepared',
                            message: `Prepared ${String(rawItem.name)} request.`,
                            payload: {
                                arguments: rawItem.arguments,
                            },
                        }),
                    ],
                };

                toolCallIndexById.set(rawItem.callId, toolCalls.length);
                toolCalls.push(toolCall);
                this.toolBuilder.storeToolSnapshot(rawItem.callId, toolCall);

                onProgress({
                    content: latestContent as string_markdown,
                    modelName: this.agentKitModelName,
                    timing: { start, complete: $getCurrentDate() },
                    usage: UNCERTAIN_USAGE,
                    rawPromptContent: rawPromptContent as string_prompt,
                    rawRequest: null,
                    rawResponse: {},
                    toolCalls: [toolCall],
                });
                continue;
            }

            if (event.name === 'tool_output' && rawItem?.type === 'function_call_result') {
                const index = toolCallIndexById.get(rawItem.callId);
                const result = this.toolBuilder.resolveAgentKitToolOutputResult(rawItem.callId, rawItem.output);
                const progressToolCall = this.toolBuilder.getToolSnapshot(rawItem.callId);

                if (index === undefined) {
                    continue;
                }

                const existingToolCall = toolCalls[index]!;
                const completedToolCall: ToolCall = {
                    ...existingToolCall,
                    ...(progressToolCall || {}),
                    result,
                    rawToolCall: rawItem,
                    state: OpenAiAgentKitExecutionToolsToolBuilder.resolveFinalToolCallState({
                        currentState: progressToolCall?.state ?? existingToolCall.state,
                        errors: progressToolCall?.errors ?? existingToolCall.errors,
                    }),
                    logs: [
                        ...((progressToolCall?.logs || existingToolCall.logs || []) as ReadonlyArray<ToolCallLogEntry>),
                        OpenAiAgentKitExecutionToolsToolBuilder.createToolCallLogEntry({
                            kind: 'result',
                            title: 'Execution finished',
                            message: `${existingToolCall.name} returned a result.`,
                        }),
                    ],
                };

                toolCalls[index] = completedToolCall;
                this.toolBuilder.deleteToolSnapshot(rawItem.callId);

                onProgress({
                    content: latestContent as string_markdown,
                    modelName: this.agentKitModelName,
                    timing: { start, complete: $getCurrentDate() },
                    usage: UNCERTAIN_USAGE,
                    rawPromptContent: rawPromptContent as string_prompt,
                    rawRequest: null,
                    rawResponse: {},
                    toolCalls: [completedToolCall],
                });
            }
        }

        emitFinishedStreamSnapshot();
        await streamResult.completed;

        const complete: string_date_iso8601 = $getCurrentDate();
        const duration = uncertainNumber((new Date(complete).getTime() - new Date(start).getTime()) / 1000);
        const finalContent = (streamResult.finalOutput ?? latestContent) as string_markdown;
        const finalResult: ChatPromptResult = {
            content: finalContent,
            modelName: this.agentKitModelName,
            timing: { start, complete },
            usage: {
                ...UNCERTAIN_USAGE,
                duration,
            },
            rawPromptContent: rawPromptContent as string_prompt,
            rawRequest,
            rawResponse: { runResult: streamResult },
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        };

        onProgress(finalResult);

        return finalResult;
    }

    /**
     * Ensures the AgentKit SDK is wired to the OpenAI client and API key.
     */
    private async ensureAgentKitDefaults(): Promise<void> {
        const client = await this.getClient();
        setDefaultOpenAIClient(client as TODO_any);

        const apiKey = this.agentKitOptions.apiKey;
        if (apiKey && typeof apiKey === 'string') {
            setDefaultOpenAIKey(apiKey);
        }
    }

    /**
     * Builds the tool list for AgentKit while keeping the public facade small.
     */
    private buildAgentKitTools(options: {
        readonly tools?: ModelRequirements['tools'];
        readonly vectorStoreId?: string;
    }) {
        return this.toolBuilder.buildAgentKitTools(options);
    }

    /**
     * Returns AgentKit-specific options.
     */
    private get agentKitOptions(): OpenAiAgentKitExecutionToolsOptions {
        return this.options as OpenAiAgentKitExecutionToolsOptions;
    }

    /**
     * Formats raw prompt content with the AgentKit model injected.
     */
    private templatePromptContent(content: Prompt['content'], parameters: Prompt['parameters'] | undefined): string {
        return templateParameters(content, {
            ...parameters,
            modelName: this.agentKitModelName,
        });
    }

    /**
     * Discriminant for type guards.
     */
    protected get discriminant() {
        return DISCRIMINANT;
    }

    /**
     * Type guard to check if given `LlmExecutionTools` are instanceof `OpenAiAgentKitExecutionTools`.
     */
    public static isOpenAiAgentKitExecutionTools(
        llmExecutionTools: LlmExecutionTools,
    ): llmExecutionTools is OpenAiAgentKitExecutionTools {
        return (llmExecutionTools as OpenAiAgentKitExecutionTools).discriminant === DISCRIMINANT;
    }
}
