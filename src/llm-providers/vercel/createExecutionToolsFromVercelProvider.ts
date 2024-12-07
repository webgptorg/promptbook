import type { createOpenAI } from '@ai-sdk/openai'; // <- TODO: This shoud be installed just as dev dependency in the `@promptbook/vercel` package, because it is only used as a type
import colors from 'colors'; // <- TODO: [🔶] Make system to put color and style to both node and browser
import { UNCERTAIN_USAGE } from '../../_packages/core.index';
import { replaceParameters } from '../../_packages/utils.index';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { ChatPromptResult } from '../../execution/PromptResult';
import { Prompt } from '../../types/Prompt';
import { string_date_iso8601 } from '../../types/typeAliases';
import { $getCurrentDate } from '../../utils/$getCurrentDate';
import { keepUnused } from '../../utils/organization/keepUnused';
import { $asDeeplyFrozenSerializableJson } from '../../utils/serialization/$asDeeplyFrozenSerializableJson';

type ProviderV1 = ReturnType<typeof createOpenAI>;
// <- TODO: Is there some way to get the type of the provider directly, NOT this stupid way via inferring the return type from a specific vercel provider⁉

/**
 * !!!!!!
 *
 * @public exported from `@promptbook/vercel`
 */
export function createExecutionToolsFromVercelProvider(
    vercelProvider: ProviderV1,
    options: CommonToolsOptions = {},
): LlmExecutionTools {
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

            const modelName = 'gpt-4';
            const model = await vercelProvider.chat(modelName, {
                user: options.userId?.toString() || undefined,
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
