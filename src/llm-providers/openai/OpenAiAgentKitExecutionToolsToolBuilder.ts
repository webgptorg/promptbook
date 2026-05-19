import type { Tool as AgentKitTool } from '@openai/agents';
import {
    Agent as AgentFromKit,
    fileSearchTool,
    tool as agentKitTool,
    webSearchTool,
} from '@openai/agents';
import { spaceTrim } from 'spacetrim';
import { parseToolExecutionEnvelope } from '../../commitments/_common/toolExecutionEnvelope';
import type { ToolCallProgressUpdate } from '../../commitments/_common/toolRuntimeContext';
import {
    registerToolCallProgressListener,
    TOOL_PROGRESS_TOKEN_PARAMETER,
    unregisterToolCallProgressListener,
} from '../../commitments/_common/toolRuntimeContext';
import { assertsError } from '../../errors/assertsError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { serializeError } from '../../errors/utils/serializeError';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { ScriptExecutionTools } from '../../execution/ScriptExecutionTools';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown } from '../../types/string_markdown';
import type { string_javascript_name } from '../../types/string_person_fullname';
import type { string_prompt } from '../../types/string_prompt';
import type { string_date_iso8601 } from '../../types/string_token';
import type { ToolCall, ToolCallLogEntry, ToolCallState } from '../../types/ToolCall';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import type { TODO_any } from '../../utils/organization/TODO_any';
import type { OpenAiAgentKitExecutionToolsOptions } from './OpenAiAgentKitExecutionToolsOptions';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from './OpenAiCompatibleExecutionToolsOptions';
import { buildToolInvocationScript } from './utils/buildToolInvocationScript';

/**
 * Constant for default model used for nested DeepSearch tool invocations.
 */
const DEFAULT_DEEP_SEARCH_MODEL_NAME = 'o4-mini-deep-research';

/**
 * Tool name used by the Book commitment-backed DeepSearch capability.
 */
const DEEP_SEARCH_TOOL_NAME = 'deep_search' as string_javascript_name;

/**
 * One Promptbook tool definition normalized for AgentKit conversion.
 */
type AgentKitToolDefinition = NonNullable<ModelRequirements['tools']>[number];

/**
 * Builds AgentKit tools and tracks their execution state.
 *
 * @private helper of `OpenAiAgentKitExecutionTools`
 */
export class OpenAiAgentKitExecutionToolsToolBuilder {
    private readonly agentKitToolResultsByCallId = new Map<string, ToolCall['result']>();
    private readonly agentKitToolSnapshotsByCallId = new Map<string, ToolCall>();

    public constructor(
        private readonly context: {
            readonly options: OpenAiAgentKitExecutionToolsOptions;
            readonly agentKitModelName: string;
        },
    ) {}

    /**
     * Clears per-run tool state before a new AgentKit stream starts.
     */
    public clearRunState(): void {
        this.agentKitToolResultsByCallId.clear();
        this.agentKitToolSnapshotsByCallId.clear();
    }

    /**
     * Stores one latest tool-call snapshot keyed by AgentKit call id.
     */
    public storeToolSnapshot(callId: string | undefined, toolCall: ToolCall): void {
        if (!callId) {
            return;
        }

        this.agentKitToolSnapshotsByCallId.set(callId, toolCall);
    }

    /**
     * Returns one latest tool-call snapshot keyed by AgentKit call id.
     */
    public getToolSnapshot(callId: string | undefined): ToolCall | undefined {
        return callId ? this.agentKitToolSnapshotsByCallId.get(callId) : undefined;
    }

    /**
     * Deletes one latest tool-call snapshot keyed by AgentKit call id.
     */
    public deleteToolSnapshot(callId: string | undefined): void {
        if (!callId) {
            return;
        }

        this.agentKitToolSnapshotsByCallId.delete(callId);
    }

    /**
     * Builds the tool list for AgentKit, including hosted file search when applicable.
     */
    public buildAgentKitTools(options: {
        readonly tools?: ModelRequirements['tools'];
        readonly vectorStoreId?: string;
    }): Array<AgentKitTool> {
        const { tools, vectorStoreId } = options;
        const agentKitTools: Array<AgentKitTool> = [];

        if (vectorStoreId) {
            agentKitTools.push(fileSearchTool(vectorStoreId));
        }

        if (!tools || tools.length === 0) {
            return agentKitTools;
        }

        let scriptTools: Array<ScriptExecutionTools> | null = null;

        for (const toolDefinition of tools) {
            if (this.isDeepSearchToolDefinition(toolDefinition)) {
                agentKitTools.push(this.createDeepSearchAgentKitTool(toolDefinition));
                continue;
            }

            scriptTools ??= this.resolveScriptTools();

            agentKitTools.push(
                agentKitTool({
                    name: toolDefinition.name,
                    description: toolDefinition.description,
                    parameters: this.normalizeAgentKitToolParameters(toolDefinition.parameters),
                    strict: false,
                    execute: async (input, runContext, details) => {
                        const scriptTool = scriptTools![0]!;
                        const functionName = toolDefinition.name;
                        const calledAt = $getCurrentDate();
                        const callId = details?.toolCall?.callId;
                        const functionArgs = input ?? {};
                        const executionContext =
                            (runContext?.context as
                                | {
                                      parameters?: Prompt['parameters'];
                                      onToolProgress?: (chunk: ChatPromptResult) => void;
                                      rawPromptContent?: string;
                                      startedAt?: string_date_iso8601;
                                      modelName?: string;
                                  }
                                | undefined) ?? undefined;

                        if (this.context.options.isVerbose) {
                            console.info('[🤰]', 'Executing AgentKit tool', {
                                functionName,
                                callId,
                                calledAt,
                            });
                        }

                        try {
                            let currentToolCallSnapshot: ToolCall = {
                                name: functionName,
                                arguments: functionArgs,
                                result: '',
                                rawToolCall: details?.toolCall,
                                createdAt: calledAt,
                                state: 'PENDING',
                                logs: [
                                    OpenAiAgentKitExecutionToolsToolBuilder.createToolCallLogEntry({
                                        kind: 'request',
                                        title: 'Request prepared',
                                        message: `Prepared ${functionName} request.`,
                                        payload: {
                                            arguments: functionArgs,
                                        },
                                    }),
                                ],
                            };

                            const progressListenerToken = registerToolCallProgressListener((update) => {
                                currentToolCallSnapshot =
                                    OpenAiAgentKitExecutionToolsToolBuilder.applyToolCallProgressUpdate(
                                        currentToolCallSnapshot,
                                        update,
                                    );

                                this.storeToolSnapshot(callId, currentToolCallSnapshot);

                                if (!executionContext?.onToolProgress) {
                                    return;
                                }

                                executionContext.onToolProgress({
                                    content: '' as string_markdown,
                                    modelName: executionContext.modelName || this.context.agentKitModelName,
                                    timing: {
                                        start: executionContext.startedAt || calledAt,
                                        complete: $getCurrentDate(),
                                    },
                                    usage: UNCERTAIN_USAGE,
                                    rawPromptContent: (executionContext.rawPromptContent || '') as string_prompt,
                                    rawRequest: null,
                                    rawResponse: {},
                                    toolCalls: [currentToolCallSnapshot],
                                });
                            });

                            let functionResponse: string;
                            try {
                                functionResponse = await scriptTool.execute({
                                    scriptLanguage: 'javascript',
                                    script: buildToolInvocationScript({
                                        functionName,
                                        functionArgsExpression: JSON.stringify(functionArgs),
                                    }),
                                    parameters: {
                                        ...(executionContext?.parameters ?? {}),
                                        [TOOL_PROGRESS_TOKEN_PARAMETER]: progressListenerToken,
                                    },
                                });
                            } finally {
                                unregisterToolCallProgressListener(progressListenerToken);
                            }

                            return this.resolveAgentKitToolResponse(callId, functionResponse);
                        } catch (error) {
                            assertsError(error);

                            const serializedError = serializeError(error as Error);
                            const failedToolCall: ToolCall = {
                                name: functionName,
                                arguments: functionArgs,
                                result: '',
                                rawToolCall: details?.toolCall,
                                createdAt: calledAt,
                                state: 'ERROR',
                                errors: [serializedError],
                                logs: [
                                    OpenAiAgentKitExecutionToolsToolBuilder.createToolCallLogEntry({
                                        kind: 'error',
                                        level: 'error',
                                        title: 'Execution failed',
                                        message: `${functionName} failed before returning a result.`,
                                        payload: serializedError,
                                    }),
                                ],
                            };
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

                            this.storeToolSnapshot(callId, failedToolCall);

                            executionContext?.onToolProgress?.({
                                content: '' as string_markdown,
                                modelName: executionContext.modelName || this.context.agentKitModelName,
                                timing: {
                                    start: executionContext.startedAt || calledAt,
                                    complete: $getCurrentDate(),
                                },
                                usage: UNCERTAIN_USAGE,
                                rawPromptContent: (executionContext.rawPromptContent || '') as string_prompt,
                                rawRequest: null,
                                rawResponse: {},
                                toolCalls: [failedToolCall],
                            });

                            return errorMessage;
                        }
                    },
                }),
            );
        }

        return agentKitTools;
    }

    /**
     * Resolves the stored Promptbook tool result for one AgentKit tool call.
     */
    public resolveAgentKitToolOutputResult(callId: string | undefined, output: unknown): ToolCall['result'] {
        if (callId) {
            const storedToolResult = this.agentKitToolResultsByCallId.get(callId);

            if (storedToolResult !== undefined) {
                this.agentKitToolResultsByCallId.delete(callId);
                return storedToolResult;
            }
        }

        return this.formatAgentKitToolOutput(output);
    }

    /**
     * Creates one structured log entry for streamed tool-call updates.
     */
    public static createToolCallLogEntry(options: {
        readonly kind: string;
        readonly title: string;
        readonly message: string;
        readonly level?: ToolCallLogEntry['level'];
        readonly payload?: unknown;
    }): ToolCallLogEntry {
        return {
            createdAt: $getCurrentDate(),
            kind: options.kind,
            level: options.level,
            title: options.title,
            message: options.message,
            payload: options.payload,
        };
    }

    /**
     * Appends one incremental progress update to the currently tracked tool-call snapshot.
     */
    public static applyToolCallProgressUpdate(toolCall: ToolCall, update: ToolCallProgressUpdate): ToolCall {
        return {
            ...toolCall,
            state: update.state ?? 'PARTIAL',
            logs: update.log ? [...(toolCall.logs || []), update.log] : toolCall.logs,
        };
    }

    /**
     * Resolves the final lifecycle state for one AgentKit tool call after execution ends.
     */
    public static resolveFinalToolCallState(options: {
        readonly currentState: ToolCallState | undefined;
        readonly errors: ReadonlyArray<unknown> | undefined;
    }): ToolCallState {
        if (options.errors && options.errors.length > 0) {
            return 'ERROR';
        }

        if (options.currentState === 'ERROR') {
            return 'ERROR';
        }

        return 'COMPLETE';
    }

    /**
     * Returns true when one tool definition represents the dedicated DeepSearch capability.
     */
    private isDeepSearchToolDefinition(toolDefinition: AgentKitToolDefinition): boolean {
        return toolDefinition.name === DEEP_SEARCH_TOOL_NAME;
    }

    /**
     * Normalizes Promptbook JSON-schema tool parameters for AgentKit function tools.
     */
    private normalizeAgentKitToolParameters(parameters: AgentKitToolDefinition['parameters'] | undefined): TODO_any {
        if (!parameters) {
            return undefined;
        }

        return {
            ...parameters,
            additionalProperties: parameters.additionalProperties ?? false,
            required: parameters.required ?? [],
        } as TODO_any;
    }

    /**
     * Creates the native Agent SDK tool used for `USE DEEPSEARCH`.
     */
    private createDeepSearchAgentKitTool(toolDefinition: AgentKitToolDefinition): AgentKitTool {
        const deepSearchAgent = new AgentFromKit({
            name: 'DeepSearch',
            model: DEFAULT_DEEP_SEARCH_MODEL_NAME,
            instructions: this.createDeepSearchAgentInstructions(toolDefinition.description),
            tools: [webSearchTool({ searchContextSize: 'high' })],
        });

        return deepSearchAgent.asTool({
            toolName: toolDefinition.name,
            toolDescription: toolDefinition.description,
            parameters: this.normalizeAgentKitToolParameters(toolDefinition.parameters),
            inputBuilder: ({ params }) => this.buildDeepSearchToolInput(params),
            customOutputExtractor: (result) =>
                typeof result.finalOutput === 'string' ? result.finalOutput : JSON.stringify(result.finalOutput ?? ''),
        });
    }

    /**
     * Creates instructions for the nested DeepSearch specialist agent.
     */
    private createDeepSearchAgentInstructions(toolDescription: string): string {
        const normalizedDescription = toolDescription.trim();

        return spaceTrim(
            (block) => `
                You are a DeepSearch specialist working as a tool for another agent.
                Perform thorough, source-grounded public-web research based on the provided request.
                Use web search to gather current information, compare relevant viewpoints, and synthesize a concise research brief.
                Do not ask follow-up questions. If the request is not specific enough, state the assumptions you had to make.
                Include citations in the research brief whenever sources were used.
                ${block(normalizedDescription ? `Tool guidance:\n${normalizedDescription}` : '')}
            `,
        );
    }

    /**
     * Builds the nested DeepSearch prompt from structured tool arguments.
     */
    private buildDeepSearchToolInput(rawInput: unknown): string {
        const input =
            rawInput && typeof rawInput === 'object'
                ? (rawInput as Record<string, unknown>)
                : ({} as Record<string, unknown>);
        const query = typeof input.query === 'string' ? input.query.trim() : '';
        const additionalHints = Object.entries(input)
            .filter(
                ([key, value]) => key !== 'query' && value !== undefined && value !== null && String(value).trim() !== '',
            )
            .map(([key, value]) => `- ${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);

        return spaceTrim(
            (block) => `
                Research request:
                ${query || JSON.stringify(input)}
                ${block(additionalHints.length > 0 ? `Execution hints:\n${additionalHints.join('\n')}` : '')}
            `,
        );
    }

    /**
     * Resolves the configured script tools for tool execution.
     */
    private resolveScriptTools(): Array<ScriptExecutionTools> {
        const executionTools = (this.context.options as OpenAiCompatibleExecutionToolsNonProxiedOptions).executionTools;

        if (!executionTools || !executionTools.script) {
            throw new PipelineExecutionError(
                `Model requested tools but no executionTools.script were provided in OpenAiAgentKitExecutionTools options`,
            );
        }

        return Array.isArray(executionTools.script) ? executionTools.script : [executionTools.script];
    }

    /**
     * Resolves the assistant-visible AgentKit tool response while preserving structured tool result data.
     */
    private resolveAgentKitToolResponse(callId: string | undefined, functionResponse: string): string {
        const toolExecutionEnvelope = parseToolExecutionEnvelope(functionResponse);

        if (!toolExecutionEnvelope) {
            return functionResponse;
        }

        if (callId) {
            this.agentKitToolResultsByCallId.set(callId, toolExecutionEnvelope.toolResult);
        }

        return toolExecutionEnvelope.assistantMessage;
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
}
