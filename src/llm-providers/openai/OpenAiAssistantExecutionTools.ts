import OpenAI from 'openai';
import { NotAllowed } from '../../errors/NotAllowed';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { CallChatModelStreamOptions, LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text } from '../../types/string_markdown';
import type { string_title } from '../../types/string_title';
import type { string_token } from '../../types/string_token';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import type { OpenAiAssistantExecutionToolsOptions } from './OpenAiAssistantExecutionToolsOptions';
import { OpenAiAssistantExecutionToolsProgressReporter } from './OpenAiAssistantExecutionToolsProgressReporter';
import { OpenAiAssistantExecutionToolsPromptBuilder } from './OpenAiAssistantExecutionToolsPromptBuilder';
import { OpenAiAssistantExecutionToolsStreamRunner } from './OpenAiAssistantExecutionToolsStreamRunner';
import { OpenAiAssistantExecutionToolsToolRunner } from './OpenAiAssistantExecutionToolsToolRunner';
import type { OpenAiCompatibleExecutionToolsNonProxiedOptions } from './OpenAiCompatibleExecutionToolsOptions';
import { OpenAiVectorStoreHandler } from './OpenAiVectorStoreHandler';
import { mapToolsToOpenAi } from './utils/mapToolsToOpenAi';

/**
 * Execution Tools for calling OpenAI API Assistants
 *
 * This is useful for calling OpenAI API with a single assistant, for more wide usage use `OpenAiExecutionTools`.
 *
 * Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAssistantExecutionTools` - which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities, recommended for usage in `Agent` or `AgentLlmExecutionTools`
 * - `RemoteAgent` - which is an `Agent` that connects to a Promptbook Agents Server
 *
 * @deprecated Use `OpenAiAgentKitExecutionTools` instead.
 *
 * @public exported from `@promptbook/openai`
 */
export class OpenAiAssistantExecutionTools extends OpenAiVectorStoreHandler implements LlmExecutionTools {
    /* <- TODO: [🍚] `, Destroyable` */
    public readonly assistantId: string_token;
    private readonly isCreatingNewAssistantsAllowed: boolean = false;
    private readonly promptBuilder = new OpenAiAssistantExecutionToolsPromptBuilder();
    private readonly progressReporter: OpenAiAssistantExecutionToolsProgressReporter;
    private readonly toolRunner: OpenAiAssistantExecutionToolsToolRunner;
    private readonly streamRunner: OpenAiAssistantExecutionToolsStreamRunner;

    /**
     * Creates OpenAI Execution Tools.
     *
     * @param options which are relevant are directly passed to the OpenAI client
     */
    public constructor(options: OpenAiAssistantExecutionToolsOptions) {
        if (options.isProxied) {
            throw new NotYetImplementedError(`Proxy mode is not yet implemented for OpenAI assistants`);
        }

        super(options);
        this.assistantId = options.assistantId;
        this.isCreatingNewAssistantsAllowed = options.isCreatingNewAssistantsAllowed ?? false;

        if (this.assistantId === null && !this.isCreatingNewAssistantsAllowed) {
            throw new NotAllowed(
                `Assistant ID is null and creating new assistants is not allowed - this configuration does not make sense`,
            );
        }

        // <- TODO: !!! `OpenAiAssistantExecutionToolsOptions` - Allow `assistantId: null` together with `isCreatingNewAssistantsAllowed: true`
        // TODO: [👱] Make limiter same as in `OpenAiExecutionTools`

        const assistantOptions = this.assistantOptions;
        this.progressReporter = new OpenAiAssistantExecutionToolsProgressReporter({
            isVerbose: assistantOptions.isVerbose ?? false,
        });
        this.toolRunner = new OpenAiAssistantExecutionToolsToolRunner({
            assistantId: this.assistantId,
            isVerbose: assistantOptions.isVerbose ?? false,
            scriptExecutionTools: assistantOptions.executionTools?.script,
            progressReporter: this.progressReporter,
        });
        this.streamRunner = new OpenAiAssistantExecutionToolsStreamRunner({
            assistantId: this.assistantId,
            isVerbose: assistantOptions.isVerbose ?? false,
            progressReporter: this.progressReporter,
        });
    }

    public get title(): string_title & string_markdown_text {
        return 'OpenAI Assistant';
    }

    public get description(): string_markdown {
        return 'Use single assistant provided by OpenAI';
    }

    /**
     * Calls OpenAI API to use a chat model.
     */
    public async callChatModel(prompt: Prompt): Promise<ChatPromptResult> {
        return this.callChatModelStream(prompt, () => {});
    }

    /**
     * Calls OpenAI API to use a chat model with streaming.
     */
    public async callChatModelStream(
        prompt: Prompt,
        onProgress: (chunk: ChatPromptResult) => void,
        options?: CallChatModelStreamOptions,
    ): Promise<ChatPromptResult> {
        TODO_USE(options);

        this.progressReporter.logAssistantChatCall(prompt);

        const { modelRequirements /*, format*/ } = prompt;
        const client = await this.getClient();

        this.assertSupportedAssistantModelRequirements(modelRequirements);

        const rawPromptContent = this.promptBuilder.createAssistantRawPromptContent(prompt);
        const threadMessages = await this.promptBuilder.createAssistantThreadMessages({
            client,
            prompt,
            rawPromptContent,
        });
        const assistantChatCallContext = {
            client,
            prompt,
            rawPromptContent,
            threadMessages,
            start: $getCurrentDate(),
            onProgress,
        };

        if (this.hasAssistantTools(modelRequirements)) {
            return this.toolRunner.callChatModelStreamWithTools(assistantChatCallContext);
        }

        return this.streamRunner.callChatModelStreamWithoutTools(assistantChatCallContext);
    }

    /**
     * Validates the subset of model requirements supported by OpenAI Assistants.
     */
    private assertSupportedAssistantModelRequirements(modelRequirements: ModelRequirements): void {
        // TODO: [☂] Use here more modelRequirements
        if (modelRequirements.modelVariant !== 'CHAT') {
            throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
        }

        // TODO: [👨‍👨‍👧‍👧] Remove:
        for (const key of ['maxTokens', 'modelName', 'seed', 'temperature'] as Array<keyof ModelRequirements>) {
            if (modelRequirements[key] !== undefined) {
                throw new NotYetImplementedError(`In \`OpenAiAssistantExecutionTools\` you cannot specify \`${key}\``);
            }
        }

        /*
        TODO: [👨‍👨‍👧‍👧] Implement all of this for Assistants
        const modelName = modelRequirements.modelName || this.getDefaultChatModel().modelName;
        const modelSettings = {
            model: modelName,

            temperature: modelRequirements.temperature,

            // <- TODO: [🈁] Use `seed` here AND/OR use is `isDeterministic` for entire execution tools
            // <- Note: [🧆]
        } as OpenAI.Chat.Completions.CompletionCreateParamsNonStreaming; // <- TODO: Guard here types better

        if (format === 'JSON') {
            modelSettings.response_format = {
                type: 'json_object',
            };
        }
        */

        // <- TODO: [🚸] Not all models are compatible with JSON mode
        //        > 'response_format' of type 'json_object' is not supported with this model.
    }

    /**
     * Returns true when the prompt exposes callable tools that require the Runs API flow.
     */
    private hasAssistantTools(modelRequirements: ModelRequirements): boolean {
        return modelRequirements.tools !== undefined && modelRequirements.tools.length > 0;
    }

    /*
    public async playground() {
        const client = await this.getClient();

        // List all assistants
        const assistants = await client.beta.assistants.list();
     
        // Get details of a specific assistant
        const assistantId = 'asst_MO8fhZf4dGloCfXSHeLcIik0';
        const assistant = await client.beta.assistants.retrieve(assistantId);

        // Update an assistant
        const updatedAssistant = await client.beta.assistants.update(assistantId, {
            name: assistant.name + '(M)',
            description: 'Updated description via Promptbook',
            metadata: {
                [Math.random().toString(36).substring(2, 15)]: new Date().toISOString(),
            },
        });
  
        await forEver();
    }
    */

    /**
     * Get an existing assistant tool wrapper
     */
    public getAssistant(assistantId: string_token): OpenAiAssistantExecutionTools {
        return new OpenAiAssistantExecutionTools({
            ...this.options,
            isCreatingNewAssistantsAllowed: this.isCreatingNewAssistantsAllowed,
            assistantId,
        });
    }

    public async createNewAssistant(options: {
        /**
         * Name of the new assistant
         */
        readonly name: string_title;

        /**
         * Instructions for the new assistant
         */
        readonly instructions: string_markdown;

        /**
         * Optional list of knowledge source links (URLs or file paths) to attach to the assistant via vector store
         */
        readonly knowledgeSources?: ReadonlyArray<string>;

        /**
         * Optional list of tools to attach to the assistant
         */
        readonly tools?: ModelRequirements['tools'];

        // <- TODO: [🧠] [🐱‍🚀] Add also other assistant creation parameters like name, description, model, ...
    }): Promise<OpenAiAssistantExecutionTools> {
        this.assertAssistantMutationsAllowed('Creating');

        // await this.playground();
        const { name, instructions, knowledgeSources, tools } = options;
        const preparationStartedAtMs = Date.now();
        const knowledgeSourcesCount = knowledgeSources?.length ?? 0;
        const toolsCount = tools?.length ?? 0;

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Starting OpenAI assistant creation', {
                name,
                knowledgeSourcesCount,
                toolsCount,
                instructionsLength: instructions.length,
            });
        }
        const client = await this.getClient();

        const vectorStoreId = await this.prepareAssistantVectorStore({
            client,
            name,
            knowledgeSources,
            logLabel: 'assistant creation',
        });

        // Create assistant with vector store attached
        const assistantConfig: OpenAI.Beta.AssistantCreateParams = {
            name,
            description: 'Assistant created via Promptbook',
            model: 'gpt-4o',
            instructions,
            tools: this.createAssistantToolDefinitions(tools),
        };

        // Attach vector store if created
        if (vectorStoreId) {
            assistantConfig.tool_resources = {
                file_search: {
                    vector_store_ids: [vectorStoreId],
                },
            };
        }

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Creating OpenAI assistant', {
                name,
                model: assistantConfig.model,
                toolCount: assistantConfig?.tools?.length,
                hasVectorStore: Boolean(vectorStoreId),
            });
        }

        const assistant = await client.beta.assistants.create(assistantConfig);

        if (this.options.isVerbose) {
            console.info('[🤰]', 'OpenAI assistant created', {
                assistantId: assistant.id,
                elapsedMs: Date.now() - preparationStartedAtMs,
            });
        }

        // TODO: [🐱‍🚀] Try listing existing assistants
        // TODO: [🐱‍🚀] Try marking existing assistants by DISCRIMINANT
        // TODO: [🐱‍🚀] Allow to update and reconnect to existing assistants

        return this.createAssistantWrapper(assistant.id);
    }

    public async updateAssistant(options: {
        /**
         * ID of the assistant to update
         */
        readonly assistantId: string_token;

        /**
         * Name of the assistant
         */
        readonly name?: string_title;

        /**
         * Instructions for the assistant
         */
        readonly instructions?: string_markdown;

        /**
         * Optional list of knowledge source links (URLs or file paths) to attach to the assistant via vector store
         */
        readonly knowledgeSources?: ReadonlyArray<string>;

        /**
         * Optional list of tools to attach to the assistant
         */
        readonly tools?: ModelRequirements['tools'];
    }): Promise<OpenAiAssistantExecutionTools> {
        this.assertAssistantMutationsAllowed('Updating');

        const { assistantId, name, instructions, knowledgeSources, tools } = options;
        const preparationStartedAtMs = Date.now();
        const knowledgeSourcesCount = knowledgeSources?.length ?? 0;
        const toolsCount = tools?.length ?? 0;

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Starting OpenAI assistant update', {
                assistantId,
                name,
                knowledgeSourcesCount,
                toolsCount,
                instructionsLength: instructions?.length ?? 0,
            });
        }
        const client = await this.getClient();

        const vectorStoreId = await this.prepareAssistantVectorStore({
            client,
            name: name ?? assistantId,
            knowledgeSources,
            logLabel: 'assistant update',
        });

        const assistantUpdate: OpenAI.Beta.AssistantUpdateParams = {
            name,
            instructions,
            tools: this.createAssistantToolDefinitions(tools),
        };

        if (vectorStoreId) {
            assistantUpdate.tool_resources = {
                file_search: {
                    vector_store_ids: [vectorStoreId],
                },
            };
        }

        if (this.options.isVerbose) {
            console.info('[🤰]', 'Updating OpenAI assistant', {
                assistantId,
                name,
                toolCount: assistantUpdate?.tools?.length,
                hasVectorStore: Boolean(vectorStoreId),
            });
        }

        const assistant = await client.beta.assistants.update(assistantId, assistantUpdate);

        if (this.options.isVerbose) {
            console.info('[🤰]', 'OpenAI assistant updated', {
                assistantId: assistant.id,
                elapsedMs: Date.now() - preparationStartedAtMs,
            });
        }

        return this.createAssistantWrapper(assistant.id);
    }

    /**
     * Ensures assistant creation/update helpers stay disabled unless explicitly enabled.
     */
    private assertAssistantMutationsAllowed(action: 'Creating' | 'Updating'): void {
        if (!this.isCreatingNewAssistantsAllowed) {
            throw new NotAllowed(
                `${action} assistants is not allowed. Set \`isCreatingNewAssistantsAllowed: true\` in options to enable this feature.`,
            );
        }
    }

    /**
     * Prepares the optional vector store backing assistant file search.
     */
    private async prepareAssistantVectorStore(options: {
        readonly client: OpenAI;
        readonly name: string_title | string_token;
        readonly knowledgeSources?: ReadonlyArray<string>;
        readonly logLabel: string;
    }): Promise<string | undefined> {
        if (!options.knowledgeSources || options.knowledgeSources.length === 0) {
            return undefined;
        }

        const vectorStoreResult = await this.createVectorStoreWithKnowledgeSources({
            client: options.client,
            name: options.name,
            knowledgeSources: options.knowledgeSources,
            logLabel: options.logLabel,
        });

        return vectorStoreResult.vectorStoreId;
    }

    /**
     * Builds the assistant tool definition list shared by create and update flows.
     */
    private createAssistantToolDefinitions(
        tools: ModelRequirements['tools'],
    ): NonNullable<OpenAI.Beta.AssistantCreateParams['tools']> {
        return [
            /* TODO: [🧠] Maybe add { type: 'code_interpreter' }, */
            { type: 'file_search' },
            ...(tools === undefined ? [] : mapToolsToOpenAi(tools)),
        ];
    }

    /**
     * Creates a new tools wrapper bound to one assistant id.
     */
    private createAssistantWrapper(assistantId: string_token): OpenAiAssistantExecutionTools {
        return new OpenAiAssistantExecutionTools({
            ...this.options,
            isCreatingNewAssistantsAllowed: false,
            assistantId,
        });
    }

    /**
     * Returns assistant-specific options with direct OpenAI execution helpers attached.
     */
    private get assistantOptions(): OpenAiAssistantExecutionToolsOptions &
        OpenAiCompatibleExecutionToolsNonProxiedOptions {
        return this.options as OpenAiAssistantExecutionToolsOptions & OpenAiCompatibleExecutionToolsNonProxiedOptions;
    }

    /**
     * Discriminant for type guards
     */
    protected get discriminant() {
        return DISCRIMINANT;
    }

    /**
     * Type guard to check if given `LlmExecutionTools` are instanceof `OpenAiAssistantExecutionTools`
     *
     * Note: This is useful when you can possibly have multiple versions of `@promptbook/openai` installed
     */
    public static isOpenAiAssistantExecutionTools(
        llmExecutionTools: LlmExecutionTools,
    ): llmExecutionTools is OpenAiAssistantExecutionTools {
        return (llmExecutionTools as OpenAiAssistantExecutionTools).discriminant === DISCRIMINANT;
    }
}

/**
 * Discriminant for type guards
 *
 * @private const of `OpenAiAssistantExecutionTools`
 */
const DISCRIMINANT = 'OPEN_AI_ASSISTANT_V1';

// TODO: !!!!! [✨🥚] Knowledge should work both with and without scrapers
// TODO: [🙎] In `OpenAiAssistantExecutionTools` Allow to create abstract assistants with `isCreatingNewAssistantsAllowed`
// TODO: [🧠][🧙‍♂️] Maybe there can be some wizard for those who want to use just OpenAI
// TODO: Maybe make custom OpenAiError
// TODO: [🧠][🈁] Maybe use `isDeterministic` from options
// TODO: [🧠][🌰] Allow to pass `title` for tracking purposes
