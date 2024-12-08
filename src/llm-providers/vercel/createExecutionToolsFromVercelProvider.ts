import type { createGoogleGenerativeAI } from '@ai-sdk/google'; // <- TODO: This shoud be installed just as dev dependency in the `@promptbook/vercel` package, because it is only used as a type
import type { createOpenAI } from '@ai-sdk/openai'; // <- TODO: This shoud be installed just as dev dependency in the `@promptbook/vercel` package, because it is only used as a type
import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import { UNCERTAIN_USAGE } from '../../execution/utils/usage-constants';
import type { Prompt } from '../../types/Prompt';
import type { string_date_iso8601 } from '../../types/typeAliases';
import { $getCurrentDate } from '../../utils/$getCurrentDate';
import { keepUnused } from '../../utils/organization/keepUnused';
import { replaceParameters } from '../../utils/parameters/replaceParameters';
import { $asDeeplyFrozenSerializableJson } from '../../utils/serialization/$asDeeplyFrozenSerializableJson';
import { VercelExecutionToolsOptions } from './VercelExecutionToolsOptions';

export type VercelProviderV1 = ReturnType<typeof createOpenAI> | ReturnType<typeof createGoogleGenerativeAI>;
// <- TODO: Is there some way to get the type of the provider directly, NOT this stupid way via inferring the return type from a specific vercel provider⁉

/**
 * !!!!!!
 *
 * @public exported from `@promptbook/vercel`
 */
export function createExecutionToolsFromVercelProvider(
    vercelProvider: VercelProviderV1,
    options: VercelExecutionToolsOptions = {},
): LlmExecutionTools {
    const { userId, additionalChatSettings = {} } = options;
    keepUnused(vercelProvider);

    return {
        title: '!!!',
        description: `!!! (through Vercel)`,
        checkConfiguration() {
            // TODO: !!!!!!
            return Promise.resolve();
        },

        async listModels() {
            return [
                /* TODO: !!!!! */
            ];
        },

        async callChatModel(
            prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
        ): Promise<ChatPromptResult> {
            const { content, parameters, modelRequirements } = prompt;

            if (modelRequirements.modelVariant !== 'CHAT') {
                throw new PipelineExecutionError('Use callChatModel only for CHAT variant');
            }

            const modelName = modelRequirements.modelName || 'gpt-4'; //<- TODO: !!!!!! 'gpt-4';
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
