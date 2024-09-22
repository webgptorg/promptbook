import colors from 'colors';
import OpenAI from 'openai';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { ModelRequirements } from '../../types/ModelRequirements';
import type { Prompt } from '../../types/Prompt';
import type { string_date_iso8601 } from '../../types/typeAliases';
import type { string_markdown } from '../../types/typeAliases';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_title } from '../../types/typeAliases';
import type { string_token } from '../../types/typeAliases';
import { getCurrentIsoDate } from '../../utils/getCurrentIsoDate';
import { replaceParameters } from '../../utils/parameters/replaceParameters';
import { $asDeeplyFrozenSerializableJson } from '../../utils/serialization/$asDeeplyFrozenSerializableJson';
import type { OpenAiAssistantExecutionToolsOptions } from './OpenAiAssistantExecutionToolsOptions';
import { OpenAiExecutionTools } from './OpenAiExecutionTools';

/**
 * Execution Tools for calling OpenAI API Assistants
 *
 * This is usefull for calling OpenAI API with a single assistant, for more wide usage use `OpenAiExecutionTools`.
 *
 * @public exported from `@promptbook/openai`
 */
export class OpenAiAssistantExecutionTools extends OpenAiExecutionTools implements LlmExecutionTools {
    private readonly assistantId?: string_token;

    /**
     * Creates OpenAI Execution Tools.
     *
     * @param options which are relevant are directly passed to the OpenAI client
     */
    public constructor(options: OpenAiAssistantExecutionToolsOptions) {
        super(options);
        this.assistantId = options.assistantId;
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
            max_tokens: modelRequirements.maxTokens,
            //                                   <- TODO: [🌾] Make some global max cap for maxTokens

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

        const rawPromptContent = replaceParameters(content, {
            ...parameters,
            modelName: 'assistant',
            //          <- [🧠] What is the best value here
        });
        const rawRequest: OpenAI.Beta.ThreadCreateAndRunStreamParams = {
            // [👨‍👨‍👧‍👧] ...modelSettings,

            assistant_id: 'asst_CJCZzFCbBL0f2D4OWMXVTdBB',
            //             <- Note: This is not a private information, just ID of the assistant which is accessible only with correct API key
            thread: {
                messages: [
                    // TODO: !!!!!! Unhardcode
                    // TODO: !!!!!! Allow threads to be passed
                    { role: 'user', content: 'What is the meaning of life? I want breathtaking speech.' },
                ],
            },

            // !!!!!! user: this.options.user,
        };
        const start: string_date_iso8601 = getCurrentIsoDate();
        let complete: string_date_iso8601;

        if (this.options.isVerbose) {
            console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
        }

        console.log('!!!!!! OpenAI client', client);

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

            // TODO: !!!!!! report progress
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
        //                                                     <- TODO: !!!!!! There are also annotations, maybe use them

        // eslint-disable-next-line prefer-const
        complete = getCurrentIsoDate();
        const usage = UNCERTAIN_USAGE;
        // TODO: !!!!!!> = computeOpenAiUsage(content, resultContent || '', rawResponse);

        if (resultContent === null) {
            throw new PipelineExecutionError('No response message from OpenAI');
        }

        return $asDeeplyFrozenSerializableJson('OpenAiAssistantExecutionTools ChatPromptResult', {
            content: resultContent,
            modelName: 'assistant',
            //          <- TODO: !!!!!! Can we detect really used model: rawResponse.model || modelName,
            timing: {
                start,
                complete,
            },
            usage,
            rawPromptContent,
            rawRequest,
            rawResponse,
            // <- [🗯]
        });
    }
}

/**
 * TODO: !!!!!! DO not use colors - can be used in browser
 * TODO: [🧠][🧙‍♂️] Maybe there can be some wizzard for thoose who want to use just OpenAI
 * TODO: Maybe make custom OpenAiError
 * TODO: [🧠][🈁] Maybe use `isDeterministic` from options
 * TODO: [🧠][🌰] Allow to pass `title` for tracking purposes
 */
