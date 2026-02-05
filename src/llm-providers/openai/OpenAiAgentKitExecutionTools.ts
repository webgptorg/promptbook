import { Agent as OpenAiAgentKitAgent, Runner, tool, type AgentInputItem, type ModelSettings, type Tool } from '@openai/agents';
import { OpenAIProvider, fileSearchTool } from '@openai/agents';
import colors from 'colors';
import spaceTrim from 'spacetrim';
import { serializeError } from '../../_packages/utils.index';
import { assertsError } from '../../errors/assertsError';
import { NotAllowed } from '../../errors/NotAllowed';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { LlmToolDefinition } from '../../types/LlmToolDefinition';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { Prompt } from '../../types/Prompt';
import type { ToolCall } from '../../types/ToolCall';
import type {
    Parameters,
    string_date_iso8601,
    string_markdown,
    string_markdown_text,
    string_model_name,
    string_prompt,
    string_title,
    string_token,
} from '../../types/typeAliases';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { exportJson } from '../../utils/serialization/exportJson';
import type { OpenAiAgentKitExecutionToolsOptions } from './OpenAiAgentKitExecutionToolsOptions';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from './OpenAiCompatibleExecutionToolsOptions';
import { OpenAiVectorStoreExecutionTools } from './OpenAiVectorStoreExecutionTools';
import { uploadFilesToOpenAi } from './utils/uploadFilesToOpenAi';

const DEFAULT_OPENAI_AGENT_KIT_MODEL_NAME = 'gpt-5.2' as string_model_name;

/**
 * Cached configuration for OpenAI AgentKit agents.
 */
type OpenAiAgentKitAgentConfiguration = {
    readonly agentId: string_token;
    readonly name: string_title;
    readonly instructions: string_markdown;
    readonly modelName: string_model_name;
    readonly modelSettings: ModelSettings;
    readonly toolDefinitions?: ReadonlyArray<LlmToolDefinition>;
    readonly vectorStoreId?: string;
};

/**
 * Execution Tools for calling OpenAI AgentKit.
 *
 * @public exported from `@promptbook/openai`
 */
export class OpenAiAgentKitExecutionTools extends OpenAiVectorStoreExecutionTools implements LlmExecutionTools {
    public readonly agentId: string_token;
    private readonly isCreatingNewAgentsAllowed: boolean = false;
    private readonly agentConfiguration: OpenAiAgentKitAgentConfiguration | null;
    private openAiAgentKitRunner: Runner | null = null;

    /**
     * Cache of AgentKit configurations by agentId.
     */
    private static agentConfigurationCache = new Map<string_token, OpenAiAgentKitAgentConfiguration>();

    /**
     * Creates OpenAI AgentKit execution tools.
     *
     * @param options Options relevant to OpenAI client and AgentKit behavior.
     * @param agentConfiguration Optional prepared agent configuration for immediate use.
     */
    public constructor(options: OpenAiAgentKitExecutionToolsOptions, agentConfiguration?: OpenAiAgentKitAgentConfiguration) {
        if (options.isProxied) {
            throw new NotYetImplementedError(`Proxy mode is not yet implemented for OpenAI AgentKit`);
        }

        super(options);

        const resolvedAgentId = agentConfiguration?.agentId ?? options.agentId;
        this.agentId = resolvedAgentId;
        this.isCreatingNewAgentsAllowed = options.isCreatingNewAgentsAllowed ?? false;
        this.agentConfiguration = agentConfiguration ? { ...agentConfiguration, agentId: resolvedAgentId } : null;

        if (this.agentId === null && !this.isCreatingNewAgentsAllowed) {
            throw new NotAllowed(
                `Agent ID is null and creating new agents is not allowed - this configuration does not make sense`,
            );
        }

        if (this.agentConfiguration) {
            OpenAiAgentKitExecutionTools.agentConfigurationCache.set(this.agentConfiguration.agentId, this.agentConfiguration);
        }
    }

    public get title(): string_title & string_markdown_text {
        return 'OpenAI AgentKit';
    }

    public get description(): string_markdown {
        return 'Use OpenAI AgentKit with tool calling and knowledge search';
    }

    /**
     * Returns the vector store ID used by this AgentKit configuration, if any.
     */
    public get vectorStoreId(): string | undefined {
        return this.agentConfiguration?.vectorStoreId;
    }

    /**
     * Calls OpenAI AgentKit to use a chat model.
     */
    public async callChatModel(prompt: Prompt): Promise<ChatPromptResult> {
        return this.callChatModelStream(prompt, () => {});
    }

    /**
     * Calls OpenAI AgentKit to use a chat model with streaming.
     */
    public async callChatModelStream(
        prompt: Prompt,
        onProgress: (chunk: ChatPromptResult) => void,
    ): Promise<ChatPromptResult> {
        if (this.options.isVerbose) {
            console.info('?? OpenAI AgentKit callChatModel call', { prompt });
        }

        const { content, parameters, modelRequirements } = prompt;

        if (modelRequirements.modelVariant !== 'CHAT') {
            throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
        }

        const agentConfiguration = this.getAgentConfiguration();
        const rawPromptContent = templateParameters(content, {
            ...parameters,
            modelName: agentConfiguration.modelName,
        });

        const inputItems = await this.buildAgentInputItems(prompt, rawPromptContent);
        const rawRequest = {
            agentId: agentConfiguration.agentId,
            agentName: agentConfiguration.name,
            modelName: agentConfiguration.modelName,
            modelSettings: agentConfiguration.modelSettings,
            vectorStoreId: agentConfiguration.vectorStoreId,
            inputItems,
        };

        const start: string_date_iso8601 = $getCurrentDate();
        let streamedContent = '';
        const completedToolCalls: ToolCall[] = [];

        const openAiAgentKitAgent = this.createAgentKitAgent({
            configuration: agentConfiguration,
            promptParameters: parameters,
            onToolCall: (toolCall) => {
                onProgress({
                    content: streamedContent,
                    modelName: agentConfiguration.modelName,
                    timing: { start, complete: $getCurrentDate() },
                    usage: UNCERTAIN_USAGE,
                    rawPromptContent,
                    rawRequest,
                    rawResponse: {},
                    toolCalls: [toolCall],
                });
            },
            onToolCallCompleted: (toolCall) => {
                completedToolCalls.push(toolCall);
            },
            getCurrentContent: () => streamedContent,
        });

        const runner = await this.getAgentKitRunner();
        const runResult = await runner.run(openAiAgentKitAgent, inputItems, { stream: true });

        for await (const event of runResult) {
            if (event.type === 'raw_model_stream_event' && event.data.type === 'output_text_delta') {
                streamedContent += event.data.delta;
                onProgress({
                    content: streamedContent,
                    modelName: agentConfiguration.modelName,
                    timing: { start, complete: $getCurrentDate() },
                    usage: UNCERTAIN_USAGE,
                    rawPromptContent,
                    rawRequest,
                    rawResponse: event.data,
                });
            }
        }

        await runResult.completed;

        const finalOutput = typeof runResult.finalOutput === 'string' ? runResult.finalOutput : streamedContent;
        const complete: string_date_iso8601 = $getCurrentDate();

        const finalChunk: ChatPromptResult = {
            content: finalOutput,
            modelName: agentConfiguration.modelName,
            timing: { start, complete },
            usage: UNCERTAIN_USAGE,
            rawPromptContent,
            rawRequest,
            rawResponse: {
                rawResponses: runResult.rawResponses,
                state: runResult.state,
            },
            toolCalls: completedToolCalls.length > 0 ? completedToolCalls : undefined,
        };

        onProgress(finalChunk);

        return exportJson({
            name: 'promptResult',
            message: `Result of \`OpenAiAgentKitExecutionTools.callChatModelStream\``,
            order: [],
            value: finalChunk,
        });
    }

    /**
     * Retrieves a cached AgentKit configuration by agentId.
     */
    public getAgent(agentId: string_token): OpenAiAgentKitExecutionTools {
        const cachedConfiguration = OpenAiAgentKitExecutionTools.agentConfigurationCache.get(agentId);

        if (!cachedConfiguration) {
            throw new Error(`OpenAiAgentKitExecutionTools configuration for agentId '${agentId}' was not found`);
        }

        return new OpenAiAgentKitExecutionTools(
            {
                ...this.options,
                isCreatingNewAgentsAllowed: this.isCreatingNewAgentsAllowed,
                agentId,
            },
            cachedConfiguration,
        );
    }

    /**
     * Creates a new AgentKit agent configuration and returns a ready execution tools instance.
     */
    public async createNewAgent(options: {
        /**
         * Name of the new agent.
         */
        readonly name: string_title;

        /**
         * Instructions for the new agent.
         */
        readonly instructions: string_markdown;

        /**
         * Optional list of knowledge source links (URLs or file paths) to attach via vector store.
         */
        readonly knowledgeSources?: ReadonlyArray<string>;

        /**
         * Optional list of tools to attach to the agent.
         */
        readonly tools?: ModelRequirements['tools'];

        /**
         * Optional model override for the agent.
         */
        readonly modelName?: string_model_name;

        /**
         * Optional temperature override for the agent.
         */
        readonly temperature?: number;

        /**
         * Optional max tokens override for the agent.
         */
        readonly maxTokens?: number;

        /**
         * Optional ID used to identify the agent configuration in caches.
         */
        readonly agentId?: string_token;

        /**
         * Optional vector store ID to reuse instead of creating a new one.
         */
        readonly vectorStoreId?: string;
    }): Promise<OpenAiAgentKitExecutionTools> {
        if (!this.isCreatingNewAgentsAllowed) {
            throw new NotAllowed(
                `Creating new agents is not allowed. Set \`isCreatingNewAgentsAllowed: true\` in options to enable this feature.`,
            );
        }

        const { name, instructions, knowledgeSources, tools, modelName, temperature, maxTokens, agentId, vectorStoreId } =
            options;
        const preparationStartedAtMs = Date.now();
        const knowledgeSourcesCount = knowledgeSources?.length ?? 0;
        const toolsCount = tools?.length ?? 0;

        if (this.options.isVerbose) {
            console.info('[??]', 'Starting OpenAI AgentKit agent creation', {
                name,
                knowledgeSourcesCount,
                toolsCount,
                instructionsLength: instructions.length,
            });
        }

        const client = await this.getClient();
        let resolvedVectorStoreId: string | undefined = vectorStoreId;

        if (!resolvedVectorStoreId && knowledgeSources && knowledgeSources.length > 0) {
            const vectorStoreResult = await this.createVectorStoreWithKnowledgeSources({
                client,
                name,
                knowledgeSources,
                logLabel: 'agentkit creation',
            });
            resolvedVectorStoreId = vectorStoreResult.vectorStoreId;
        } else if (resolvedVectorStoreId && this.options.isVerbose) {
            console.info('[??]', 'Reusing cached vector store for AgentKit agent', {
                name,
                vectorStoreId: resolvedVectorStoreId,
            });
        }

        const configuration: OpenAiAgentKitAgentConfiguration = {
            agentId: agentId ?? this.agentId,
            name,
            instructions,
            modelName: modelName ?? DEFAULT_OPENAI_AGENT_KIT_MODEL_NAME,
            modelSettings: {
                temperature,
                maxTokens,
            },
            toolDefinitions: tools ? [...tools] : undefined,
            vectorStoreId: resolvedVectorStoreId,
        };

        if (this.options.isVerbose) {
            console.info('[??]', 'OpenAI AgentKit agent prepared', {
                agentId: configuration.agentId,
                name,
                vectorStoreId,
                elapsedMs: Date.now() - preparationStartedAtMs,
            });
        }

        return new OpenAiAgentKitExecutionTools(
            {
                ...this.options,
                isCreatingNewAgentsAllowed: false,
                agentId: configuration.agentId,
            },
            configuration,
        );
    }

    /**
     * Updates an existing AgentKit configuration by creating a fresh instance.
     */
    public async updateAgent(options: {
        /**
         * ID of the agent configuration to update.
         */
        readonly agentId: string_token;

        /**
         * Name of the agent.
         */
        readonly name: string_title;

        /**
         * Instructions for the agent.
         */
        readonly instructions: string_markdown;

        /**
         * Optional list of knowledge source links (URLs or file paths) to attach via vector store.
         */
        readonly knowledgeSources?: ReadonlyArray<string>;

        /**
         * Optional list of tools to attach to the agent.
         */
        readonly tools?: ModelRequirements['tools'];

        /**
         * Optional model override for the agent.
         */
        readonly modelName?: string_model_name;

        /**
         * Optional temperature override for the agent.
         */
        readonly temperature?: number;

        /**
         * Optional max tokens override for the agent.
         */
        readonly maxTokens?: number;

        /**
         * Optional vector store ID to reuse instead of creating a new one.
         */
        readonly vectorStoreId?: string;
    }): Promise<OpenAiAgentKitExecutionTools> {
        if (!this.isCreatingNewAgentsAllowed) {
            throw new NotAllowed(
                `Updating agents is not allowed. Set \`isCreatingNewAgentsAllowed: true\` in options to enable this feature.`,
            );
        }

        const { agentId, name, instructions, knowledgeSources, tools, modelName, temperature, maxTokens, vectorStoreId } =
            options;
        const preparationStartedAtMs = Date.now();

        if (this.options.isVerbose) {
            console.info('[??]', 'Updating OpenAI AgentKit agent', {
                agentId,
                name,
            });
        }

        const client = await this.getClient();
        let resolvedVectorStoreId: string | undefined = vectorStoreId;

        if (!resolvedVectorStoreId && knowledgeSources && knowledgeSources.length > 0) {
            const vectorStoreResult = await this.createVectorStoreWithKnowledgeSources({
                client,
                name,
                knowledgeSources,
                logLabel: 'agentkit update',
            });
            resolvedVectorStoreId = vectorStoreResult.vectorStoreId;
        } else if (resolvedVectorStoreId && this.options.isVerbose) {
            console.info('[??]', 'Reusing cached vector store for AgentKit agent update', {
                agentId,
                vectorStoreId: resolvedVectorStoreId,
            });
        }

        const configuration: OpenAiAgentKitAgentConfiguration = {
            agentId,
            name,
            instructions,
            modelName: modelName ?? DEFAULT_OPENAI_AGENT_KIT_MODEL_NAME,
            modelSettings: {
                temperature,
                maxTokens,
            },
            toolDefinitions: tools ? [...tools] : undefined,
            vectorStoreId: resolvedVectorStoreId,
        };

        if (this.options.isVerbose) {
            console.info('[??]', 'OpenAI AgentKit agent updated', {
                agentId,
                elapsedMs: Date.now() - preparationStartedAtMs,
            });
        }

        return new OpenAiAgentKitExecutionTools(
            {
                ...this.options,
                isCreatingNewAgentsAllowed: false,
                agentId,
            },
            configuration,
        );
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

    /**
     * Ensures there is a configuration available for this AgentKit tools instance.
     */
    private getAgentConfiguration(): OpenAiAgentKitAgentConfiguration {
        if (!this.agentConfiguration) {
            throw new Error('OpenAiAgentKitExecutionTools is missing an agent configuration');
        }

        return this.agentConfiguration;
    }

    /**
     * Builds an AgentKit agent instance for the current prompt.
     */
    private createAgentKitAgent(options: {
        readonly configuration: OpenAiAgentKitAgentConfiguration;
        readonly promptParameters: Parameters;
        readonly onToolCall: (toolCall: ToolCall) => void;
        readonly onToolCallCompleted: (toolCall: ToolCall) => void;
        readonly getCurrentContent: () => string;
    }): OpenAiAgentKitAgent {
        const { configuration, promptParameters, onToolCall, onToolCallCompleted, getCurrentContent } = options;
        const tools: Tool[] = [];

        if (configuration.vectorStoreId) {
            tools.push(fileSearchTool(configuration.vectorStoreId));
        }

        if (configuration.toolDefinitions && configuration.toolDefinitions.length > 0) {
            tools.push(
                ...this.buildAgentKitFunctionTools({
                    toolDefinitions: configuration.toolDefinitions,
                    promptParameters,
                    onToolCall,
                    onToolCallCompleted,
                    getCurrentContent,
                }),
            );
        }

        return new OpenAiAgentKitAgent({
            name: configuration.name,
            instructions: configuration.instructions,
            model: configuration.modelName,
            modelSettings: configuration.modelSettings,
            tools,
        });
    }

    /**
     * Builds AgentKit function tools from Promptbook tool definitions.
     */
    private buildAgentKitFunctionTools(options: {
        readonly toolDefinitions: ReadonlyArray<LlmToolDefinition>;
        readonly promptParameters: Parameters;
        readonly onToolCall: (toolCall: ToolCall) => void;
        readonly onToolCallCompleted: (toolCall: ToolCall) => void;
        readonly getCurrentContent: () => string;
    }): Tool[] {
        const { toolDefinitions, promptParameters, onToolCall, onToolCallCompleted, getCurrentContent } = options;
        const scriptTools = this.resolveScriptTools();

        return toolDefinitions.map((definition) =>
            tool({
                name: definition.name,
                description: definition.description,
                parameters: {
                    type: 'object',
                    properties: definition.parameters.properties,
                    required: definition.parameters.required ?? [],
                    additionalProperties: true,
                },
                strict: false,
                execute: async (input, _context, details) => {
                    const calledAt = $getCurrentDate();
                    const functionArgs = this.normalizeToolInput(input);

                    const toolCall: ToolCall = {
                        name: definition.name,
                        arguments: functionArgs,
                        rawToolCall: details?.toolCall,
                        createdAt: calledAt,
                    };

                    onToolCall(toolCall);

                    let functionResponse: string;
                    let errors: Array<ReturnType<typeof serializeError>> | undefined;

                    try {
                        const scriptTool = scriptTools[0]!; // <- TODO: [🧠] Which script tool to use?

                        functionResponse = await scriptTool.execute({
                            scriptLanguage: 'javascript',
                            script: `
                                const args = ${JSON.stringify(functionArgs)};
                                return await ${definition.name}(args);
                            `,
                            parameters: promptParameters,
                        });
                    } catch (error) {
                        assertsError(error);

                        const serializedError = serializeError(error as Error);
                        errors = [serializedError];
                        functionResponse = spaceTrim(
                            (block) => `

                                The invoked tool \`${definition.name}\` failed with error:

                                \`\`\`json
                                ${block(JSON.stringify(serializedError, null, 4))}
                                \`\`\`

                            `,
                        );
                        console.error(colors.bgRed(`? Error executing tool ${definition.name}:`));
                        console.error(error);
                    }

                    const completedToolCall: ToolCall = {
                        ...toolCall,
                        result: functionResponse,
                        errors,
                    };

                    onToolCallCompleted(completedToolCall);

                    if (this.options.isVerbose) {
                        console.info('?? AgentKit tool completed', {
                            toolName: definition.name,
                            hasErrors: Boolean(errors?.length),
                        });
                    }

                    return functionResponse;
                },
            }),
        );
    }

    /**
     * Normalizes tool input into a JSON-serializable shape.
     */
    private normalizeToolInput(input: unknown): ToolCall['arguments'] {
        if (typeof input === 'string') {
            try {
                return JSON.parse(input) as Record<string, TODO_any>;
            } catch {
                return input;
            }
        }

        return (input ?? {}) as Record<string, TODO_any>;
    }

    /**
     * Resolves available script execution tools or throws if none are configured.
     */
    private resolveScriptTools() {
        const executionTools = (this.options as OpenAiCompatibleExecutionToolsNonProxiedOptions).executionTools;

        if (!executionTools || !executionTools.script) {
            throw new PipelineExecutionError(
                `Model requested tool but no executionTools.script were provided in OpenAiAgentKitExecutionTools options`,
            );
        }

        return Array.isArray(executionTools.script) ? executionTools.script : [executionTools.script];
    }

    /**
     * Builds AgentKit input items from a Prompt, including uploaded files.
     */
    private async buildAgentInputItems(prompt: Prompt, rawPromptContent: string_prompt): Promise<AgentInputItem[]> {
        const items: AgentInputItem[] = [];

        if ('thread' in prompt && Array.isArray(prompt.thread)) {
            for (const message of prompt.thread) {
                if (message.sender === 'assistant' || message.sender === 'agent') {
                    items.push({
                        role: 'assistant',
                        status: 'completed',
                        content: [
                            {
                                type: 'output_text',
                                text: message.content,
                            },
                        ],
                    });
                } else {
                    items.push({
                        role: 'user',
                        content: message.content,
                    });
                }
            }
        }

        if ('files' in prompt && Array.isArray(prompt.files) && prompt.files.length > 0) {
            const client = await this.getClient();
            const fileIds = await uploadFilesToOpenAi(client, prompt.files);
            const contentParts = [
                { type: 'input_text' as const, text: rawPromptContent },
                ...fileIds.map((fileId) => ({
                    type: 'input_file' as const,
                    file: { id: fileId },
                })),
            ];
            items.push({
                role: 'user',
                content: contentParts,
            });
        } else {
            items.push({
                role: 'user',
                content: rawPromptContent,
            });
        }

        return items;
    }

    /**
     * Lazily creates or reuses the AgentKit runner configured with OpenAI provider.
     */
    private async getAgentKitRunner(): Promise<Runner> {
        if (this.openAiAgentKitRunner) {
            return this.openAiAgentKitRunner;
        }

        const client = await this.getClient();
        const provider = new OpenAIProvider({
            openAIClient: client as unknown as NonNullable<ConstructorParameters<typeof OpenAIProvider>[0]>['openAIClient'],
            useResponses: true,
        });

        this.openAiAgentKitRunner = new Runner({
            modelProvider: provider,
        });

        return this.openAiAgentKitRunner;
    }
}

/**
 * Discriminant for type guards.
 *
 * @private const of `OpenAiAgentKitExecutionTools`
 */
const DISCRIMINANT = 'OPEN_AI_AGENT_KIT_V1';
