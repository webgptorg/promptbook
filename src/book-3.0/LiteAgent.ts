import {
    Agent as AgentFromKit,
    fileSearchTool,
    run,
    setDefaultOpenAIClient,
    setDefaultOpenAIKey,
} from '@openai/agents';
import { readFile } from 'fs/promises';
import { basename, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { CreateAgentModelRequirementsOptions } from '../book-2.0/agent-source/CreateAgentModelRequirementsOptions';
import { createAgentModelRequirements } from '../book-2.0/agent-source/createAgentModelRequirements';
import type { AgentModelRequirements } from '../book-2.0/agent-source/AgentModelRequirements';
import { NotAllowed } from '../errors/NotAllowed';
import type { ScriptExecutionTools } from '../execution/ScriptExecutionTools';
import { OpenAiAgentKitExecutionToolsToolBuilder } from '../llm-providers/openai/OpenAiAgentKitExecutionToolsToolBuilder';
import { OpenAiVectorStoreHandler } from '../llm-providers/openai/OpenAiVectorStoreHandler';
import { OPENAI_MODELS } from '../llm-providers/openai/openai-models';
import { computeOpenAiUsage } from '../llm-providers/openai/computeOpenAiUsage';
import { $provideScriptingForNode } from '../scrapers/_common/register/$provideScriptingForNode';
import type { string_knowledge_source_link } from '../types/string_knowledge_source_content';
import type { string_markdown, string_markdown_text } from '../types/string_markdown';
import type { string_model_name } from '../types/string_model_name';
import type { string_title } from '../types/string_title';
import type { TODO_any } from '../utils/organization/TODO_any';
import { spaceTrim } from '../utils/organization/spaceTrim';
import type { BookNodeAgentSourceOptions } from './BookNodeAgentSource';
import { resolveBookNodeAgentSource } from './BookNodeAgentSource';

/**
 * Default OpenAI model used by `LiteAgent` when the Book does not request one explicitly.
 *
 * @private internal constant of `LiteAgent`
 */
const DEFAULT_LITE_AGENT_MODEL_NAME = 'gpt-5.4-mini' as string_model_name;

/**
 * Options for constructing one `LiteAgent`.
 *
 * `LiteAgent` is intentionally smaller than the CLI harnesses. It runs the Book through the
 * OpenAI Agents SDK directly, while keeping Promptbook tool definitions and hosted knowledge
 * whenever those features fit inside the lighter runtime.
 *
 * @public exported from `@promptbook/node`
 */
export type LiteAgentOptions = BookNodeAgentSourceOptions & {
    readonly apiKey?: string;
    readonly baseURL?: string;
    readonly createAgentModelRequirementsOptions?: CreateAgentModelRequirementsOptions;
    readonly isVerbose?: boolean;
    readonly maxRequestsPerMinute?: number;
    readonly modelName?: string_model_name;
    readonly organization?: string;
    readonly project?: string;
    readonly scriptExecutionTools?: ScriptExecutionTools | ReadonlyArray<ScriptExecutionTools>;
    readonly userId?: string;
};

/**
 * Per-run options for `LiteAgent`.
 *
 * @public exported from `@promptbook/node`
 */
export type LiteAgentRunOptions = {
    readonly context?: string;
    readonly signal?: AbortSignal;
};

/**
 * Prepared OpenAI SDK runtime cached on one `LiteAgent` instance.
 *
 * @private internal utility of `LiteAgent`
 */
type PreparedLiteAgent = {
    readonly agent: AgentFromKit;
    readonly modelRequirements: AgentModelRequirements;
    readonly toolBuilder: OpenAiAgentKitExecutionToolsToolBuilder | null;
};

/**
 * Lightweight Node.js wrapper around the OpenAI Agents SDK for Promptbook Books.
 *
 * This path is intentionally simpler than `ptbk agent exec`: it prepares one SDK agent in-process
 * and reuses it across calls, which keeps JavaScript integration small while still honoring the
 * compiled Promptbook system message, prompt suffix, tools, and hosted knowledge when supported.
 *
 * @public exported from `@promptbook/node`
 */
export class LiteAgent {
    private preparedAgentPromise: Promise<PreparedLiteAgent> | null = null;

    public constructor(private readonly options: LiteAgentOptions) {}

    /**
     * Runs one user message through the prepared OpenAI Agents SDK agent.
     *
     * @param message - User message sent to the agent.
     * @param options - Optional context and cancellation signal.
     * @returns Final text returned by the SDK agent.
     */
    public async run(message: string, options: LiteAgentRunOptions = {}): Promise<string> {
        const normalizedMessage = message.trim();

        if (!normalizedMessage) {
            throw new NotAllowed(
                spaceTrim(`
                    Pass a non-empty message to \`LiteAgent.run(...)\`.
                `),
            );
        }

        const preparedAgent = await this.prepareAgent();
        preparedAgent.toolBuilder?.clearRunState();

        const result = await run(
            preparedAgent.agent,
            createLiteAgentPromptText(normalizedMessage, options.context, preparedAgent.modelRequirements.promptSuffix),
            options.signal ? { signal: options.signal } : undefined,
        );

        return formatLiteAgentOutput(result.finalOutput);
    }

    /**
     * Lazily prepares and caches the underlying OpenAI Agents SDK runtime.
     *
     * @private internal utility of `LiteAgent`
     */
    private async prepareAgent(): Promise<PreparedLiteAgent> {
        if (!this.preparedAgentPromise) {
            this.preparedAgentPromise = this.createPreparedAgent().catch((error) => {
                this.preparedAgentPromise = null;
                throw error;
            });
        }

        return this.preparedAgentPromise;
    }

    /**
     * Builds the in-process OpenAI Agents SDK runtime from the Book source.
     *
     * @private internal utility of `LiteAgent`
     */
    private async createPreparedAgent(): Promise<PreparedLiteAgent> {
        const resolvedSource = await resolveBookNodeAgentSource(this.options);
        const modelRequirements = await createAgentModelRequirements(
            resolvedSource.agentSource,
            this.options.modelName,
            undefined,
            undefined,
            this.options.createAgentModelRequirementsOptions,
        );
        const resolvedModelName = resolveLiteAgentModelName(modelRequirements, this.options.modelName);
        const scriptExecutionTools = await resolveLiteAgentScriptExecutionTools(this.options, modelRequirements);
        const runtime = new LiteAgentOpenAiRuntime({
            apiKey: this.options.apiKey,
            baseURL: this.options.baseURL,
            executionTools: scriptExecutionTools ? { script: scriptExecutionTools } : undefined,
            isProxied: false,
            isVerbose: this.options.isVerbose,
            maxRequestsPerMinute: this.options.maxRequestsPerMinute,
            organization: this.options.organization,
            project: this.options.project,
            userId: this.options.userId,
        });
        const client = await runtime.getClient();

        setDefaultOpenAIClient(client as TODO_any);

        if (this.options.apiKey) {
            setDefaultOpenAIKey(this.options.apiKey);
        }

        const toolBuilder =
            modelRequirements.tools && modelRequirements.tools.length > 0
                ? new OpenAiAgentKitExecutionToolsToolBuilder({
                      options: {
                          apiKey: this.options.apiKey,
                          baseURL: this.options.baseURL,
                          executionTools: scriptExecutionTools ? { script: scriptExecutionTools } : undefined,
                          isProxied: false,
                          isVerbose: this.options.isVerbose,
                          maxRequestsPerMinute: this.options.maxRequestsPerMinute,
                          organization: this.options.organization,
                          project: this.options.project,
                          userId: this.options.userId,
                      },
                      agentKitModelName: resolvedModelName,
                  })
                : null;
        const agentTools =
            toolBuilder?.buildAgentKitTools({
                tools: modelRequirements.tools ? [...modelRequirements.tools] : undefined,
            }) || [];
        const normalizedKnowledgeSources = await normalizeLiteAgentKnowledgeSources(
            modelRequirements.knowledgeSources || [],
            resolvedSource.sourceDirectoryPath,
        );

        if (normalizedKnowledgeSources.length > 0) {
            const vectorStore = await runtime.createHostedKnowledgeVectorStore({
                knowledgeSources: normalizedKnowledgeSources,
                name: resolvedSource.agentName,
            });

            agentTools.unshift(fileSearchTool(vectorStore.vectorStoreId));
        }

        return {
            agent: new AgentFromKit({
                name: resolvedSource.agentName,
                model: resolvedModelName,
                instructions: modelRequirements.systemMessage || 'You are a helpful assistant.',
                modelSettings: createLiteAgentModelSettings(modelRequirements) as TODO_any,
                tools: agentTools,
            }),
            modelRequirements,
            toolBuilder,
        };
    }
}

/**
 * Minimal concrete OpenAI runtime used by `LiteAgent` for client and vector-store management.
 *
 * @private helper of `LiteAgent`
 */
class LiteAgentOpenAiRuntime extends OpenAiVectorStoreHandler {
    public get title(): string_title & string_markdown_text {
        return 'OpenAI LiteAgent';
    }

    public get description(): string_markdown {
        return 'Internal OpenAI runtime used by Promptbook LiteAgent';
    }

    /**
     * Exposes hosted vector-store preparation needed by `LiteAgent`.
     */
    public async createHostedKnowledgeVectorStore(options: {
        readonly knowledgeSources: ReadonlyArray<string_knowledge_source_link>;
        readonly name: string;
    }): Promise<{ readonly vectorStoreId: string }> {
        const result = await this.createVectorStoreWithKnowledgeSources({
            client: await this.getClient(),
            knowledgeSources: options.knowledgeSources,
            logLabel: 'lite-agent',
            name: options.name as string_title,
        });

        return {
            vectorStoreId: result.vectorStoreId,
        };
    }

    protected get HARDCODED_MODELS() {
        return OPENAI_MODELS;
    }

    protected computeUsage = computeOpenAiUsage;

    protected getDefaultChatModel() {
        return this.getDefaultModel('gpt-5');
    }

    protected getDefaultCompletionModel() {
        return this.getDefaultModel('gpt-3.5-turbo-instruct');
    }

    protected getDefaultEmbeddingModel() {
        return this.getDefaultModel('text-embedding-3-large');
    }

    protected getDefaultImageGenerationModel() {
        return this.getDefaultModel('dall-e-3');
    }
}

/**
 * Resolves the model name used by the OpenAI Agents SDK runtime.
 *
 * @private internal utility of `LiteAgent`
 */
function resolveLiteAgentModelName(
    modelRequirements: AgentModelRequirements,
    explicitModelName: string_model_name | undefined,
): string_model_name {
    return explicitModelName || (modelRequirements.modelName as string_model_name) || DEFAULT_LITE_AGENT_MODEL_NAME;
}

/**
 * Resolves the script execution tools needed for Promptbook function tools.
 *
 * @private internal utility of `LiteAgent`
 */
async function resolveLiteAgentScriptExecutionTools(
    options: LiteAgentOptions,
    modelRequirements: AgentModelRequirements,
): Promise<ReadonlyArray<ScriptExecutionTools> | undefined> {
    if (!modelRequirements.tools || modelRequirements.tools.length === 0) {
        return undefined;
    }

    if (options.scriptExecutionTools) {
        return Array.isArray(options.scriptExecutionTools)
            ? options.scriptExecutionTools
            : [options.scriptExecutionTools as ScriptExecutionTools];
    }

    return $provideScriptingForNode({
        isVerbose: options.isVerbose,
    });
}

/**
 * Creates the final user prompt text passed into the OpenAI Agents SDK.
 *
 * @private internal utility of `LiteAgent`
 */
function createLiteAgentPromptText(message: string, context: string | undefined, promptSuffix: string): string {
    const normalizedContext = context?.trim();
    const normalizedPromptSuffix = promptSuffix.trim();

    return spaceTrim(
        (block) => `
            ${block(message)}
            ${block(
                normalizedContext
                    ? `
                        ## Additional context

                        ${normalizedContext}
                    `
                    : '',
            )}
            ${block(normalizedPromptSuffix)}
        `,
    );
}

/**
 * Normalizes the final output returned by the OpenAI Agents SDK.
 *
 * @private internal utility of `LiteAgent`
 */
function formatLiteAgentOutput(output: unknown): string {
    if (output === undefined || output === null || output === '') {
        return '(OpenAI Agents SDK returned no text response.)';
    }

    if (typeof output === 'string') {
        return output;
    }

    try {
        return JSON.stringify(output, null, 2);
    } catch {
        return String(output);
    }
}

/**
 * Creates SDK model settings from compiled Book requirements.
 *
 * `topK` is intentionally omitted because the OpenAI Agents SDK model settings do not expose it.
 *
 * @private internal utility of `LiteAgent`
 */
function createLiteAgentModelSettings(modelRequirements: AgentModelRequirements): Record<string, number> | undefined {
    const modelSettingsEntries = Object.entries({
        temperature: modelRequirements.temperature,
        topP: modelRequirements.topP,
    }).filter(([, value]) => typeof value === 'number') as Array<[string, number]>;

    if (modelSettingsEntries.length === 0) {
        return undefined;
    }

    return Object.fromEntries(modelSettingsEntries);
}

/**
 * Converts local knowledge-source paths into data URLs so the shared vector-store upload pipeline can ingest them.
 *
 * @private internal utility of `LiteAgent`
 */
async function normalizeLiteAgentKnowledgeSources(
    knowledgeSources: ReadonlyArray<string_knowledge_source_link>,
    sourceDirectoryPath: string,
): Promise<ReadonlyArray<string_knowledge_source_link>> {
    const normalizedKnowledgeSources: Array<string_knowledge_source_link> = [];

    for (const knowledgeSource of knowledgeSources) {
        if (isHttpKnowledgeSource(knowledgeSource) || knowledgeSource.startsWith('data:')) {
            normalizedKnowledgeSources.push(knowledgeSource);
            continue;
        }

        normalizedKnowledgeSources.push(
            await convertLiteAgentLocalKnowledgeSourceToDataUrl(knowledgeSource, sourceDirectoryPath),
        );
    }

    return normalizedKnowledgeSources;
}

/**
 * Detects HTTP(S) knowledge sources that can already be handled by the shared uploader.
 *
 * @private internal utility of `LiteAgent`
 */
function isHttpKnowledgeSource(knowledgeSource: string): boolean {
    return knowledgeSource.startsWith('http://') || knowledgeSource.startsWith('https://');
}

/**
 * Converts one local file knowledge source into a base64 data URL.
 *
 * @private internal utility of `LiteAgent`
 */
async function convertLiteAgentLocalKnowledgeSourceToDataUrl(
    knowledgeSource: string,
    sourceDirectoryPath: string,
): Promise<string_knowledge_source_link> {
    const absolutePath = knowledgeSource.startsWith('file:')
        ? fileURLToPath(knowledgeSource)
        : resolve(sourceDirectoryPath, knowledgeSource);
    const fileContent = await readFile(absolutePath);
    const fileName = basename(absolutePath);
    const mimeType = resolveLiteAgentKnowledgeSourceMimeType(fileName);

    return `data:${mimeType};name=${encodeURIComponent(fileName)};base64,${fileContent.toString(
        'base64',
    )}` as string_knowledge_source_link;
}

/**
 * Resolves one MIME type for local knowledge-source uploads.
 *
 * @private internal utility of `LiteAgent`
 */
function resolveLiteAgentKnowledgeSourceMimeType(fileName: string): string {
    const extension = fileName.includes('.') ? (fileName.split('.').pop() || '').toLowerCase() : '';

    switch (extension) {
        case 'csv':
            return 'text/csv';
        case 'html':
        case 'htm':
            return 'text/html';
        case 'json':
            return 'application/json';
        case 'markdown':
        case 'md':
            return 'text/markdown';
        case 'pdf':
            return 'application/pdf';
        case 'xml':
            return 'application/xml';
        case 'yaml':
        case 'yml':
            return 'text/yaml';
        case 'txt':
        default:
            return 'text/plain';
    }
}
