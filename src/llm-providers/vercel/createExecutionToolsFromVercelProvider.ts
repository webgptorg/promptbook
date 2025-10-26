import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import spaceTrim from 'spacetrim';
import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import type { Usage } from '../../execution/Usage';
import { computeUsageCounts } from '../../execution/utils/computeUsageCounts';
import { uncertainNumber } from '../../execution/utils/uncertainNumber';
import { UNCERTAIN_ZERO_VALUE } from '../../execution/utils/usage-constants';
import type { Prompt } from '../../types/Prompt';
import type { string_date_iso8601, string_name } from '../../types/typeAliases';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { asSerializable } from '../../utils/serialization/asSerializable';
import { exportJson } from '../../utils/serialization/exportJson';
import type { VercelExecutionToolsOptions } from './VercelExecutionToolsOptions';
import { TODO_any } from '../../_packages/types.index';

/**
 * Profile for Vercel AI adapter
 */
const VERCEL_PROVIDER_PROFILE: ChatParticipant = {
    name: 'VERCEL' as string_name,
    fullname: 'Vercel AI',
    color: '#000000',
} as const;

/**
 * Adapter which creates Promptbook execution tools from Vercel provider
 *
 * @public exported from `@promptbook/vercel`
 */
export function createExecutionToolsFromVercelProvider(options: VercelExecutionToolsOptions): LlmExecutionTools {
    let { title, description } = options;
    const { vercelProvider, availableModels, userId, additionalChatSettings = {} } = options;

    if (!/Vercel/i.test(title)) {
        title = `${title} (through Vercel)`;
        // <- TODO: [🧈] Maybe standartize the suffix
    } /* not else */

    if (description === undefined) {
        description = `Implementation of ${title} through Vercel`;
    } /* not else */

    if (!/Vercel/i.test(description)) {
        description = `${description} (through Vercel)`;
        // <- TODO: [🧈] Maybe standartize the suffix
    } /* not else */

    return {
        title,
        description,
        profile: VERCEL_PROVIDER_PROFILE,
        checkConfiguration() {
            // Note: There is no way how to check configuration of Vercel provider
            return Promise.resolve();
        },

        async listModels() {
            return availableModels;
        },

        async callChatModel(
            prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
        ): Promise<ChatPromptResult> {
            const { content, parameters, modelRequirements } = prompt;

            if (modelRequirements.modelVariant !== 'CHAT') {
                throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
            }

            const modelName =
                modelRequirements.modelName ||
                availableModels.find(({ modelVariant }) => modelVariant === 'CHAT')?.modelName;

            if (!modelName) {
                throw new PipelineExecutionError(
                    spaceTrim(`
                        Can not determine which model to use.

                        You need to provide at least one of:
                        1) In \`createExecutionToolsFromVercelProvider\` options, provide \`availableModels\` with at least one model
                        2) In \`prompt.modelRequirements\`, provide \`modelName\` with the name of the model to use

                    `),
                );
            }

            const model = await vercelProvider.chat(modelName, {
                user: userId?.toString() || undefined,
                ...additionalChatSettings,
            });

            const rawPromptContent = templateParameters(content, { ...parameters, modelName });

            // Support for passing a chat thread (multi-message conversation)
            let promptMessages: Array<TODO_any>;
            if ('thread' in prompt && Array.isArray((prompt as TODO_any).thread)) {
                promptMessages = (prompt as TODO_any).thread.map((msg: TODO_any) => ({
                    role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user',
                    content: [
                        {
                            type: 'text',
                            text: msg.content,
                        },
                    ],
                }));
            } else {
                promptMessages = [
                    ...(modelRequirements.systemMessage === undefined
                        ? []
                        : ([
                              {
                                  role: 'system',
                                  content: modelRequirements.systemMessage,
                              },
                          ] as const)),
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: rawPromptContent,
                            },
                        ],
                    },
                ];
            }

            const rawRequest: Parameters<typeof model.doGenerate>[0] = {
                // <- TODO: [☂]
                inputFormat: 'messages',
                mode: {
                    type: 'regular',
                    tools: [
                        /* <- TODO: Pass the tools */
                    ],
                },
                prompt: promptMessages,
            };

            const start: string_date_iso8601 = $getCurrentDate();

            if (options.isVerbose) {
                console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
            }
            const rawResponse = await (async () => await model.doGenerate(rawRequest))().catch((error) => {
                // <- Note: This weird structure is here to catch errors in both sync and async `doGenerate`
                if (options.isVerbose) {
                    console.info(colors.bgRed('error'), error);
                }
                throw error;
            });

            await model.doGenerate(rawRequest);

            if (options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
            }

            if (rawResponse.text === undefined) {
                throw new PipelineExecutionError('No response message');
            }

            const complete: string_date_iso8601 = $getCurrentDate();

            const usage: Usage = {
                price: UNCERTAIN_ZERO_VALUE, //  <- TODO: [🕘] Price count
                input: {
                    tokensCount: uncertainNumber(rawResponse.usage.promptTokens),
                    ...computeUsageCounts(
                        rawPromptContent,
                        // <- TODO: [🕘][🙀] What about system message
                    ),
                },
                output: {
                    tokensCount: uncertainNumber(rawResponse.usage.completionTokens),
                    ...computeUsageCounts(rawResponse.text),
                },
            };

            return exportJson({
                name: 'promptResult',
                message: `Result of \`createExecutionToolsFromVercelProvider.callChatModel\``,
                value: {
                    content: rawResponse.text,
                    modelName,
                    timing: {
                        start,
                        complete,
                    },
                    usage,
                    rawPromptContent,
                    rawRequest,
                    rawResponse: asSerializable(rawResponse),
                    // <- [🗯]
                },
            });
        },
    };
}
