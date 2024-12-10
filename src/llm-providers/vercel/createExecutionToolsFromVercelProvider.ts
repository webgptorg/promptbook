import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import spaceTrim from 'spacetrim';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { Prompt } from '../../types/Prompt';
import type { string_date_iso8601 } from '../../types/typeAliases';
import { $getCurrentDate } from '../../utils/$getCurrentDate';
import { replaceParameters } from '../../utils/parameters/replaceParameters';
import { $asDeeplyFrozenSerializableJson } from '../../utils/serialization/$asDeeplyFrozenSerializableJson';
import type { VercelExecutionToolsOptions } from './VercelExecutionToolsOptions';

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
    } /* not else */

    if (description === undefined) {
        description = `Implementation of ${title} through Vercel`;
    } /* not else */

    if (!/Vercel/i.test(description)) {
        description = `${description} (through Vercel)`;
    } /* not else */

    return {
        title,
        description,
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

            const rawPromptContent = replaceParameters(content, { ...parameters, modelName });
            const rawRequest: Parameters<typeof model.doGenerate>[0] = {
                // <- TODO: [☂]
                inputFormat: 'messages',
                mode: {
                    type: 'regular',
                    tools: [
                        /* !!!!!! */
                    ],
                },
                prompt: [
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
                ],
            };

            const start: string_date_iso8601 = $getCurrentDate();

            if (options.isVerbose) {
                console.info(colors.bgWhite('rawRequest'), JSON.stringify(rawRequest, null, 4));
            }
            const rawResponse = await model.doGenerate(rawRequest);
            /*
            TODO: !!!!!! Handle errors
            .catch((error) => {
                if (options.isVerbose) {
                    console.info(colors.bgRed('error'), error);
                }
                throw error;
            });
            */

            if (options.isVerbose) {
                console.info(colors.bgWhite('rawResponse'), JSON.stringify(rawResponse, null, 4));
            }

            if (rawResponse.text === undefined) {
                throw new PipelineExecutionError('No response message');
            }

            const complete: string_date_iso8601 = $getCurrentDate();

            /*
            TODO: !!!!!! Usage count
            const usage = computeOpenAiUsage(content || '', resultContent || '', rawResponse);
            */
            const usage = UNCERTAIN_USAGE;

            return $asDeeplyFrozenSerializableJson('createExecutionToolsFromVercelProvider ChatPromptResult', {
                content: rawResponse.text,
                modelName,
                timing: {
                    start,
                    complete,
                },
                usage,
                rawPromptContent,
                rawRequest,
                rawResponse: {
                    /* TODO: !!!!!! UnexpectedError: createExecutionToolsFromVercelProvider ChatPromptResult.rawResponse.response.timestamp is Date */
                },
                // <- [🗯]
            });
        },
    };
}
