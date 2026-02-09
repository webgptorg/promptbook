import type { Tool as AgentKitTool } from '@openai/agents';
import {
    Agent as AgentFromKit,
    tool as agentKitTool,
    fileSearchTool,
    run,
    setDefaultOpenAIClient,
    setDefaultOpenAIKey,
} from '@openai/agents';
import spaceTrim from 'spacetrim';
import { TODO_any } from '../../_packages/types.index';
import { serializeError } from '../../_packages/utils.index';
import { assertsError } from '../../errors/assertsError';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { ScriptExecutionTools } from '../../execution/ScriptExecutionTools';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { Prompt } from '../../types/Prompt';
import type { ToolCall } from '../../types/ToolCall';
import type {
    string_date_iso8601,
    string_markdown,
    string_markdown_text,
    string_model_name,
    string_prompt,
    string_title,
} from '../../types/typeAliases';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import type { chococake } from '../../utils/organization/really_any';
import { templateParameters } from '../../utils/parameters/templateParameters';
import type { OpenAiAgentKitExecutionToolsOptions } from './OpenAiAgentKitExecutionToolsOptions';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from './OpenAiCompatibleExecutionToolsOptions';
import type { AgentOutputType, JsonSchemaDefinition, JsonSchemaDefinitionEntry } from '@openai/agents-core';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai';
import { OpenAiVectorStoreHandler } from './OpenAiVectorStoreHandler';

const DEFAULT_AGENT_KIT_MODEL_NAME = 'gpt-5.2' as string_model_name;

type OpenAiChatResponseFormat =
    ChatCompletionCreateParamsNonStreaming['response_format'];

const DEFAULT_JSON_SCHEMA_NAME = 'StructuredOutput';

const EMPTY_JSON_SCHEMA: JsonSchemaDefinition['schema'] = {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: true,
};

function buildJsonSchemaDefinition(
    jsonSchema?: {
        name?: string;
        strict?: boolean | null;
        schema?: {
            description?: string;
            additionalProperties?: boolean;
            properties?: Record<string, JsonSchemaDefinitionEntry>;
            required?: Array<string>;
        };
    },
): JsonSchemaDefinition {
    const schema = jsonSchema?.schema ?? {};

    return {
        type: 'json_schema',
        name: jsonSchema?.name ?? DEFAULT_JSON_SCHEMA_NAME,
        strict: Boolean(jsonSchema?.strict),
        schema: {
            type: 'object',
            properties: (schema.properties ?? {}) as Record<string, JsonSchemaDefinitionEntry>,
            required: Array.isArray(schema.required) ? schema.required : [],
            additionalProperties:
                schema.additionalProperties === undefined
                    ? true
                    : Boolean(schema.additionalProperties),
            description: schema.description,
        },
    };
}

/**
 * Maps OpenAI response_format payloads to Agent output types so the AgentKit runner
 * can forward the user's structured-output preference to OpenAI.
 */
function mapResponseFormatToAgentOutputType(
    responseFormat?: OpenAiChatResponseFormat,
): AgentOutputType | undefined {
    if (!responseFormat) {
        return undefined;
    }

    if (typeof responseFormat === 'string') {
        if (responseFormat === 'text') {
            return 'text';
        }
        if (responseFormat === 'json_schema' || responseFormat === 'json_object') {
            return buildJsonSchemaDefinition();
        }
        return 'text';
    }

    switch (responseFormat.type) {
        case 'text':
            return 'text';
        case 'json_schema':
            return buildJsonSchemaDefinition(responseFormat.json_schema);
        case 'json_object':
            return buildJsonSchemaDefinition();
        default:
            return undefined;
    }
}

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
 * Execution tools for OpenAI AgentKit (Agents SDK).
 *
 * @public exported from `@promptbook/openai`
 */
export class OpenAiAgentKitExecutionTools extends OpenAiVectorStoreHandler implements LlmExecutionTools {
    private preparedAgentKitAgent: OpenAiAgentKitPreparedAgent | null = null;
    private readonly agentKitModelName: string_model_name;

    /**
     * Creates OpenAI AgentKit execution tools.
     */
    public constructor(options: OpenAiAgentKitExecutionToolsOptions) {
        if ((options as OpenAiCompatibleExecutionToolsNonProxiedOptions).isProxied) {
            throw new NotYetImplementedError(`Proxy mode is not yet implemented for OpenAI AgentKit`);
        }

        super(options as OpenAiCompatibleExecutionToolsNonProxiedOptions);
        this.agentKitModelName = options.agentKitModelName ?? DEFAULT_AGENT_KIT_MODEL_NAME;
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

        const rawPromptContent = templateParameters(content, {
            ...parameters,
            modelName: this.agentKitModelName,
        });

        const responseFormatOutputType = mapResponseFormatToAgentOutputType(
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
     * Builds the tool list for AgentKit, including hosted file search when applicable.
     */
    private buildAgentKitTools(options: {
        readonly tools?: ModelRequirements['tools'];
        readonly vectorStoreId?: string;
    }): Array<AgentKitTool> {
        const { tools, vectorStoreId } = options;
        const agentKitTools: Array<AgentKitTool> = [];

        if (vectorStoreId) {
            agentKitTools.push(fileSearchTool(vectorStoreId));
        }

        if (tools && tools.length > 0) {
            const scriptTools = this.resolveScriptTools();

            for (const toolDefinition of tools) {
                agentKitTools.push(
                    agentKitTool({
                        name: toolDefinition.name,
                        description: toolDefinition.description,
                        parameters: toolDefinition.parameters
                            ? ({
                                  ...toolDefinition.parameters,
                                  additionalProperties: false,
                                  required: toolDefinition.parameters.required ?? [],
                              } as TODO_any)
                            : undefined,
                        strict: false,
                        execute: async (input, runContext, details) => {
                            const scriptTool = scriptTools[0]!;
                            const functionName = toolDefinition.name;
                            const calledAt = $getCurrentDate();
                            const callId = details?.toolCall?.callId;
                            const functionArgs = input ?? {};

                            if (this.options.isVerbose) {
                                console.info('[🤰]', 'Executing AgentKit tool', {
                                    functionName,
                                    callId,
                                    calledAt,
                                });
                            }

                            try {
                                return await scriptTool.execute({
                                    scriptLanguage: 'javascript',
                                    script: `
                                        const args = ${JSON.stringify(functionArgs)};
                                        return await ${functionName}(args);
                                    `,
                                    parameters:
                                        (runContext?.context as { parameters?: Prompt['parameters'] })?.parameters ??
                                        {},
                                });
                            } catch (error) {
                                assertsError(error);

                                const serializedError = serializeError(error as Error);
                                const errorMessage = spaceTrim(
                                    (block) => `

                                        The invoked tool \`${functionName}\` failed with error:

                                        \`\`\`json
                                        ${block(JSON.stringify(serializedError, null, 4))}
                                        \`\`\`

                                    `,
                                );

                                console.error('[🤰]', 'AgentKit tool execution failed', {
                                    functionName,
                                    callId,
                                    error: serializedError,
                                });

                                return errorMessage;
                            }
                        },
                    }),
                );
            }
        }

        return agentKitTools;
    }

    /**
     * Resolves the configured script tools for tool execution.
     */
    private resolveScriptTools(): Array<ScriptExecutionTools> {
        const executionTools = (this.options as OpenAiCompatibleExecutionToolsNonProxiedOptions).executionTools;

        if (!executionTools || !executionTools.script) {
            throw new PipelineExecutionError(
                `Model requested tools but no executionTools.script were provided in OpenAiAgentKitExecutionTools options`,
            );
        }

        return Array.isArray(executionTools.script) ? executionTools.script : [executionTools.script];
    }

    /**
     * Runs a prepared AgentKit agent and streams results back to the caller.
     */
    public async callChatModelStreamWithPreparedAgent(options: {
        readonly openAiAgentKitAgent: OpenAiAgentKitAgent;
        readonly prompt: Prompt;
        readonly rawPromptContent?: string;
        readonly onProgress: (chunk: ChatPromptResult) => void;
        readonly responseFormatOutputType?: AgentOutputType;
    }): Promise<ChatPromptResult> {
        const { openAiAgentKitAgent, prompt, onProgress } = options;
        const rawPromptContent =
            options.rawPromptContent ??
            templateParameters(prompt.content, {
                ...prompt.parameters,
                modelName: this.agentKitModelName,
            });
        const agentForRun =
            options.responseFormatOutputType !== undefined
                ? openAiAgentKitAgent.clone({
                      outputType: options.responseFormatOutputType,
                  })
                : openAiAgentKitAgent;

        const start: string_date_iso8601 = $getCurrentDate();
        let latestContent = '';
        const toolCalls: ToolCall[] = [];
        const toolCallIndexById = new Map<string, number>();

        const inputItems = await this.buildAgentKitInputItems(prompt, rawPromptContent);
        const rawRequest: chococake = {
            agentName: agentForRun.name,
            input: inputItems,
        };

        const streamResult = await run(agentForRun, inputItems, {
            stream: true,
            context: { parameters: prompt.parameters },
        });

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

            if (event.type === 'run_item_stream_event') {
                const rawItem = (event.item as TODO_any)?.rawItem as TODO_any | undefined;

                if (event.name === 'tool_called' && rawItem?.type === 'function_call') {
                    const toolCall: ToolCall = {
                        name: rawItem.name,
                        arguments: rawItem.arguments,
                        rawToolCall: rawItem,
                        createdAt: $getCurrentDate(),
                    };
                    toolCallIndexById.set(rawItem.callId, toolCalls.length);
                    toolCalls.push(toolCall);

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
                }

                if (event.name === 'tool_output' && rawItem?.type === 'function_call_result') {
                    const index = toolCallIndexById.get(rawItem.callId);
                    const result = this.formatAgentKitToolOutput(rawItem.output);

                    if (index !== undefined) {
                        const existingToolCall = toolCalls[index]!;
                        const completedToolCall: ToolCall = {
                            ...existingToolCall,
                            result,
                            rawToolCall: rawItem,
                        };
                        toolCalls[index] = completedToolCall;

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
            }
        }

        await streamResult.completed;

        const complete: string_date_iso8601 = $getCurrentDate();
        const finalContent = (streamResult.finalOutput ?? latestContent) as string_markdown;

        const finalResult: ChatPromptResult = {
            content: finalContent,
            modelName: this.agentKitModelName,
            timing: { start, complete },
            usage: UNCERTAIN_USAGE,
            rawPromptContent: rawPromptContent as string_prompt,
            rawRequest,
            rawResponse: { runResult: streamResult },
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        };

        onProgress(finalResult);

        return finalResult;
    }

    /**
     * Builds AgentKit input items from the prompt and optional thread.
     */
    private async buildAgentKitInputItems(prompt: Prompt, rawPromptContent: string): Promise<Array<TODO_any>> {
        const inputItems: Array<TODO_any> = [];

        if ('thread' in prompt && Array.isArray(prompt.thread)) {
            for (const message of prompt.thread) {
                const sender = (message as TODO_any).sender;
                const content = (message as TODO_any).content ?? '';

                if (sender === 'assistant' || sender === 'agent') {
                    inputItems.push({
                        role: 'assistant',
                        status: 'completed',
                        content: [{ type: 'output_text', text: content }],
                    });
                } else {
                    inputItems.push({
                        role: 'user',
                        content,
                    });
                }
            }
        }

        const userContent = await this.buildAgentKitUserContent(prompt, rawPromptContent);
        inputItems.push({
            role: 'user',
            content: userContent,
        });

        return inputItems;
    }

    /**
     * Builds the user message content for AgentKit runs, including file inputs when provided.
     */
    private async buildAgentKitUserContent(prompt: Prompt, rawPromptContent: string): Promise<TODO_any> {
        if ('files' in prompt && Array.isArray(prompt.files) && prompt.files.length > 0) {
            const fileItems = await Promise.all(
                prompt.files.map(async (file: File) => {
                    const arrayBuffer = await file.arrayBuffer();
                    const base64 = Buffer.from(arrayBuffer).toString('base64');
                    return {
                        type: 'input_image',
                        image: `data:${file.type};base64,${base64}`,
                    };
                }),
            );

            return [{ type: 'input_text', text: rawPromptContent }, ...fileItems];
        }

        return rawPromptContent;
    }

    /**
     * Normalizes AgentKit tool outputs into a string for Promptbook tool call results.
     */
    private formatAgentKitToolOutput(output: unknown): string {
        if (typeof output === 'string') {
            return output;
        }

        if (output && typeof output === 'object') {
            const textOutput = output as { type?: string; text?: string };
            if (textOutput.type === 'text' && typeof textOutput.text === 'string') {
                return textOutput.text;
            }
        }

        return JSON.stringify(output ?? null);
    }

    /**
     * Returns AgentKit-specific options.
     */
    private get agentKitOptions(): OpenAiAgentKitExecutionToolsOptions {
        return this.options as OpenAiAgentKitExecutionToolsOptions;
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

/**
 * Discriminant for type guards.
 *
 * @private const of `OpenAiAgentKitExecutionTools`
 */
const DISCRIMINANT = 'OPEN_AI_AGENT_KIT_V1';
