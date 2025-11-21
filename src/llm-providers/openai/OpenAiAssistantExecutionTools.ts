import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import OpenAI from 'openai';
import { NotAllowed } from '../../errors/NotAllowed';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { Prompt } from '../../types/Prompt';
import type {
    string_date_iso8601,
    string_markdown,
    string_markdown_text,
    string_title,
    string_token,
} from '../../types/typeAliases';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { exportJson } from '../../utils/serialization/exportJson';
import type { OpenAiAssistantExecutionToolsOptions } from './OpenAiAssistantExecutionToolsOptions';
import { OpenAiExecutionTools } from './OpenAiExecutionTools';

/**
 * Execution Tools for calling OpenAI API Assistants
 *
 * This is useful for calling OpenAI API with a single assistant, for more wide usage use `OpenAiExecutionTools`.
 *
 * !!! Note: [🦖] There are several different things in Promptbook:
 * - `Agent` - which represents an AI Agent with its source, memories, actions, etc. Agent is a higher-level abstraction which is internally using:
 * - `LlmExecutionTools` - which wraps one or more LLM models and provides an interface to execute them
 * - `AgentLlmExecutionTools` - which is a specific implementation of `LlmExecutionTools` that wraps another LlmExecutionTools and applies agent-specific system prompts and requirements
 * - `OpenAiAssistantExecutionTools` - which is a specific implementation of `LlmExecutionTools` for OpenAI models with assistant capabilities, recommended for usage in `Agent` or `AgentLlmExecutionTools`
 *
 * @public exported from `@promptbook/openai`
 */
export class OpenAiAssistantExecutionTools extends OpenAiExecutionTools implements LlmExecutionTools {
    /* <- TODO: [🍚] `, Destroyable` */
    public readonly assistantId: string_token;
    private readonly isCreatingNewAssistantsAllowed: boolean = false;

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
    public async callChatModel(
        prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements' | 'format'>,
    ): Promise<ChatPromptResult> {
        if (this.options.isVerbose) {
            console.info('💬 OpenAI callChatModel call', { prompt });
        }

        const { content, parameters, modelRequirements /*, format*/ } = prompt;

        const client = await this.getClient();

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

        const rawPromptContent = templateParameters(content, {
            ...parameters,
            modelName: 'assistant',
            //          <- [🧠] What is the best value here
        });
        const rawRequest: OpenAI.Beta.ThreadCreateAndRunStreamParams = {
            // TODO: [👨‍👨‍👧‍👧] ...modelSettings,
            // TODO: [👨‍👨‍👧‍👧][🧠] What about system message for assistants, does it make sense - combination of OpenAI assistants with Promptbook Personas

            assistant_id: this.assistantId,
            thread: {
                messages:
                    'thread' in prompt &&
                    Array.isArray((prompt as { thread?: Array<{ role: string; content: string }> }).thread)
                        ? (
                              (prompt as { thread: Array<{ role: string; content: string }> }).thread as Array<{
                                  role: string;
                                  content: string;
                              }>
                          ).map((msg) => ({
                              role: msg.role === 'assistant' ? 'assistant' : 'user',
                              content: msg.content,
                          }))
                        : [{ role: 'user', content: rawPromptContent }],
            },

            // <- TODO: Add user identification here> user: this.options.user,
        };
        const start: string_date_iso8601 = $getCurrentDate();
        let complete: string_date_iso8601;

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }

        const stream = await client.beta.threads.createAndRunStream(rawRequest);

        stream.on('connect', () => {
            if (this.options.isVerbose) {
                console.info('connect', stream.currentEvent);
            }
        });

        /*
        stream.on('messageDelta', (messageDelta) => {
            if (
                this.options.isVerbose &&
                messageDelta &&
                messageDelta.content &&
                messageDelta.content[0] &&
                messageDelta.content[0].type === 'text'
            ) {
                console.info('messageDelta', messageDelta.content[0].text?.value);
            }

            // <- TODO: [🐚] Make streaming and running tasks working
        });
        */

        stream.on('messageCreated', (message) => {
            if (this.options.isVerbose) {
                console.info('messageCreated', message);
            }
        });

        stream.on('messageDone', (message) => {
            if (this.options.isVerbose) {
                console.info('messageDone', message);
            }
        });

        const rawResponse = await stream.finalMessages();

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
        }

        if (rawResponse.length !== 1) {
            throw new PipelineExecutionError(`There is NOT 1 BUT ${rawResponse.length} finalMessages from OpenAI`);
        }

        if (rawResponse[0]!.content.length !== 1) {
            throw new PipelineExecutionError(
                `There is NOT 1 BUT ${rawResponse[0]!.content.length} finalMessages content from OpenAI`,
            );
        }

        if (rawResponse[0]!.content[0]?.type !== 'text') {
            throw new PipelineExecutionError(
                `There is NOT 'text' BUT ${rawResponse[0]!.content[0]?.type} finalMessages content type from OpenAI`,
            );
        }

        const resultContent = rawResponse[0]!.content[0]?.text.value;
        //                                                     <- TODO: [🧠] There are also annotations, maybe use them

        // eslint-disable-next-line prefer-const
        complete = $getCurrentDate();
        const usage = UNCERTAIN_USAGE;
        // <- TODO: [🥘] Compute real usage for assistant
        //       ?> const usage = computeOpenAiUsage(content, resultContent || '', rawResponse);

        if (resultContent === null) {
            throw new PipelineExecutionError('No response message from OpenAI');
        }

        return exportJson({
            name: 'promptResult',
            message: `Result of \`OpenAiAssistantExecutionTools.callChatModel\``,
            order: [],
            value: {
                content: resultContent,
                modelName: 'assistant',
                // <- TODO: [🥘] Detect used model in assistant
                //       ?> model: rawResponse.model || modelName,
                timing: {
                    start,
                    complete,
                },
                usage,
                rawPromptContent,
                rawRequest,
                rawResponse,
                // <- [🗯]
            },
        });
    }

    /*
    public async playground() {
        const client = await this.getClient();

        // List all assistants
        const assistants = await client.beta.assistants.list();
        console.log('!!! Assistants:', assistants);

        // Get details of a specific assistant
        const assistantId = 'asst_MO8fhZf4dGloCfXSHeLcIik0';
        const assistant = await client.beta.assistants.retrieve(assistantId);
        console.log('!!! Assistant Details:', assistant);

        // Update an assistant
        const updatedAssistant = await client.beta.assistants.update(assistantId, {
            name: assistant.name + '(M)',
            description: 'Updated description via Promptbook',
            metadata: {
                [Math.random().toString(36).substring(2, 15)]: new Date().toISOString(),
            },
        });
        console.log('!!! Updated Assistant:', updatedAssistant);

        await forEver();
    }
    */

    /**
     * Get an existing assistant tool wrapper
     */
    public getAssistant(assistantId: string_token): OpenAiAssistantExecutionTools {
        return new OpenAiAssistantExecutionTools({
            ...this.options,
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

        // <- TODO: !!!! Add also other assistant creation parameters like tools, name, description, model, ...
    }): Promise<OpenAiAssistantExecutionTools> {
        if (!this.isCreatingNewAssistantsAllowed) {
            throw new NotAllowed(
                `Creating new assistants is not allowed. Set \`isCreatingNewAssistantsAllowed: true\` in options to enable this feature.`,
            );
        }

        // await this.playground();
        const { name, instructions, knowledgeSources } = options;
        const client = await this.getClient();

        let vectorStoreId: string | undefined;

        // If knowledge sources are provided, create a vector store with them
        if (knowledgeSources && knowledgeSources.length > 0) {
            if (this.options.isVerbose) {
                console.info(`📚 Creating vector store with ${knowledgeSources.length} knowledge sources...`);
            }

            // Create a vector store
            const vectorStore = await client.beta.vectorStores.create({
                name: `${name} Knowledge Base`,
            });
            vectorStoreId = vectorStore.id;

            if (this.options.isVerbose) {
                console.info(`✅ Vector store created: ${vectorStoreId}`);
            }

            // Upload files from knowledge sources to the vector store
            const fileStreams = [];
            for (const source of knowledgeSources) {
                try {
                    // Check if it's a URL
                    if (source.startsWith('http://') || source.startsWith('https://')) {
                        // Download the file
                        const response = await fetch(source);
                        if (!response.ok) {
                            console.error(`Failed to download ${source}: ${response.statusText}`);
                            continue;
                        }
                        const buffer = await response.arrayBuffer();
                        const filename = source.split('/').pop() || 'downloaded-file';
                        const blob = new Blob([buffer]);
                        const file = new File([blob], filename);
                        fileStreams.push(file);
                    } else {
                        // Assume it's a local file path
                        // Note: This will work in Node.js environment
                        // For browser environments, this would need different handling
                        const fs = await import('fs');
                        const fileStream = fs.createReadStream(source);
                        fileStreams.push(fileStream);
                    }
                } catch (error) {
                    console.error(`Error processing knowledge source ${source}:`, error);
                }
            }

            // Batch upload files to the vector store
            if (fileStreams.length > 0) {
                try {
                    await client.beta.vectorStores.fileBatches.uploadAndPoll(vectorStoreId, {
                        files: fileStreams,
                    });

                    if (this.options.isVerbose) {
                        console.info(`✅ Uploaded ${fileStreams.length} files to vector store`);
                    }
                } catch (error) {
                    console.error('Error uploading files to vector store:', error);
                }
            }
        }

        // Create assistant with vector store attached
        const assistantConfig: OpenAI.Beta.AssistantCreateParams = {
            name,
            description: 'Assistant created via Promptbook',
            model: 'gpt-4o',
            instructions,
            tools: [/* TODO: [🧠] Maybe add { type: 'code_interpreter' }, */ { type: 'file_search' }],
        };

        // Attach vector store if created
        if (vectorStoreId) {
            assistantConfig.tool_resources = {
                file_search: {
                    vector_store_ids: [vectorStoreId],
                },
            };
        }

        const assistant = await client.beta.assistants.create(assistantConfig);

        console.log(`✅ Assistant created: ${assistant.id}`);

        // TODO: !!!! Try listing existing assistants
        // TODO: !!!! Try marking existing assistants by DISCRIMINANT
        // TODO: !!!! Allow to update and reconnect to existing assistants

        return new OpenAiAssistantExecutionTools({
            ...this.options,
            isCreatingNewAssistantsAllowed: false,
            assistantId: assistant.id,
        });
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
    }): Promise<OpenAiAssistantExecutionTools> {
        if (!this.isCreatingNewAssistantsAllowed) {
            throw new NotAllowed(
                `Updating assistants is not allowed. Set \`isCreatingNewAssistantsAllowed: true\` in options to enable this feature.`,
            );
        }

        const { assistantId, name, instructions, knowledgeSources } = options;
        const client = await this.getClient();

        let vectorStoreId: string | undefined;

        // If knowledge sources are provided, create a vector store with them
        // TODO: [🧠] Reuse vector store creation logic from createNewAssistant
        if (knowledgeSources && knowledgeSources.length > 0) {
            if (this.options.isVerbose) {
                console.info(`📚 Creating vector store for update with ${knowledgeSources.length} knowledge sources...`);
            }

            // Create a vector store
            const vectorStore = await client.beta.vectorStores.create({
                name: `${name} Knowledge Base`,
            });
            vectorStoreId = vectorStore.id;

            if (this.options.isVerbose) {
                console.info(`✅ Vector store created: ${vectorStoreId}`);
            }

            // Upload files from knowledge sources to the vector store
            const fileStreams = [];
            for (const source of knowledgeSources) {
                try {
                    // Check if it's a URL
                    if (source.startsWith('http://') || source.startsWith('https://')) {
                        // Download the file
                        const response = await fetch(source);
                        if (!response.ok) {
                            console.error(`Failed to download ${source}: ${response.statusText}`);
                            continue;
                        }
                        const buffer = await response.arrayBuffer();
                        const filename = source.split('/').pop() || 'downloaded-file';
                        const blob = new Blob([buffer]);
                        const file = new File([blob], filename);
                        fileStreams.push(file);
                    } else {
                        // Assume it's a local file path
                        // Note: This will work in Node.js environment
                        // For browser environments, this would need different handling
                        const fs = await import('fs');
                        const fileStream = fs.createReadStream(source);
                        fileStreams.push(fileStream);
                    }
                } catch (error) {
                    console.error(`Error processing knowledge source ${source}:`, error);
                }
            }

            // Batch upload files to the vector store
            if (fileStreams.length > 0) {
                try {
                    await client.beta.vectorStores.fileBatches.uploadAndPoll(vectorStoreId, {
                        files: fileStreams,
                    });

                    if (this.options.isVerbose) {
                        console.info(`✅ Uploaded ${fileStreams.length} files to vector store`);
                    }
                } catch (error) {
                    console.error('Error uploading files to vector store:', error);
                }
            }
        }

        const assistantUpdate: OpenAI.Beta.AssistantUpdateParams = {
            name,
            instructions,
            tools: [/* TODO: [🧠] Maybe add { type: 'code_interpreter' }, */ { type: 'file_search' }],
        };

        if (vectorStoreId) {
            assistantUpdate.tool_resources = {
                file_search: {
                    vector_store_ids: [vectorStoreId],
                },
            };
        }

        const assistant = await client.beta.assistants.update(assistantId, assistantUpdate);

        if (this.options.isVerbose) {
            console.log(`✅ Assistant updated: ${assistant.id}`);
        }

        return new OpenAiAssistantExecutionTools({
            ...this.options,
            isCreatingNewAssistantsAllowed: false,
            assistantId: assistant.id,
        });
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

/**
 * TODO: [🧠][🧙‍♂️] Maybe there can be some wizard for those who want to use just OpenAI
 * TODO: Maybe make custom OpenAiError
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 * TODO: [🧠][🌰] Allow to pass `title` for tracking purposes
 */
