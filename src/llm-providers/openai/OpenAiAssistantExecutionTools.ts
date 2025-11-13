import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import OpenAI from 'openai';
import spaceTrim from 'spacetrim';
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
 * @public exported from `@promptbook/openai`
 */
export class OpenAiAssistantExecutionTools extends OpenAiExecutionTools implements LlmExecutionTools {
    /* <- TODO: [🍚] `, Destroyable` */
    private readonly assistantId: string_token;
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

    public async createNewAssistant(): Promise<OpenAiAssistantExecutionTools> {
        if (!this.isCreatingNewAssistantsAllowed) {
            throw new NotAllowed(
                `Creating new assistants is not allowed. Set \`isCreatingNewAssistantsAllowed: true\` in options to enable this feature.`,
            );
        }

        const client = await this.getClient();

        /*
        TODO: !!!
        async function downloadFile(url: string, folder = './tmp'): Promise<string> {
            const filename = path.basename(url.split('?')[0]);
            const filepath = path.join(folder, filename);

            if (!fs.existsSync(folder)) fs.mkdirSync(folder);

            const res = await fetch(url);
            if (!res.ok) throw new Error(`Download error: ${url}`);
            const buffer = await res.arrayBuffer();
            fs.writeFileSync(filepath, Buffer.from(buffer));
            console.log(`📥 File downloaded: ${filename}`);

            return filepath;
        }

        async function uploadFileToOpenAI(filepath: string) {
            const file = await client.files.create({
                file: fs.createReadStream(filepath),
                purpose: 'assistants',
            });
            console.log(`⬆️  File uploaded to OpenAI: ${file.filename} (${file.id})`);
            return file;
        }

        // 🌐 URL addresses of files to upload
        const fileUrls = [
            'https://raw.githubusercontent.com/vercel/next.js/canary/packages/next/README.md',
            'https://raw.githubusercontent.com/openai/openai-cookbook/main/examples/How_to_call_the_Assistants_API_with_Node.js.ipynb',
        ];

        // 1️⃣ Download files from URL
        const localFiles = [];
        for (const url of fileUrls) {
            const filepath = await downloadFile(url);
            localFiles.push(filepath);
        }

        // 2️⃣ Upload files to OpenAI
        const uploadedFiles = [];
        for (const filepath of localFiles) {
            const file = await uploadFileToOpenAI(filepath);
            uploadedFiles.push(file.id);
        }
        */

        // 3️⃣ Create assistant with uploaded files
        const assistant = await client.beta.assistants.create({
            name: 'Next.js documentation assistant',
            description: 'Assistant that can answer questions about Next.js and working with APIs.',
            model: 'gpt-4o',
            instructions: spaceTrim(`
                Answer clearly and comprehensively.
                Quote parts from uploaded files if needed.
            `),
            // <- TODO: !!!! Generate the `instructions` from passed `agentSource` (generate outside of this class)
            tools: [{ type: 'code_interpreter' }, { type: 'file_search' }],
            // !!!! file_ids: uploadedFiles,
        });

        // TODO: !!!! Change Czech to English
        console.log(`✅ Assistant created: ${assistant.id}`);

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
