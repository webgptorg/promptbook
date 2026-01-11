import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { LlmExecutionToolsConstructor } from '../../execution/LlmExecutionToolsConstructor';
import type { ImagePromptResult } from '../../execution/PromptResult';
import { computeUsageCounts } from '../../execution/utils/computeUsageCounts';
import { uncertainNumber } from '../../execution/utils/uncertainNumber';
import type { Prompt } from '../../types/Prompt';
import type { string_date_iso8601, string_name } from '../../types/typeAliases';
import { $isRunningInJest } from '../../utils/environment/$isRunningInJest';
import { $getCurrentDate } from '../../utils/misc/$getCurrentDate';
import { templateParameters } from '../../utils/parameters/templateParameters';
import { exportJson } from '../../utils/serialization/exportJson';
import { createExecutionToolsFromVercelProvider } from '../vercel/createExecutionToolsFromVercelProvider';
import type { GoogleExecutionToolsOptions } from './GoogleExecutionToolsOptions';
import { GOOGLE_MODELS } from './google-models';

/**
 * Profile for Google Gemini provider
 */
const GOOGLE_PROVIDER_PROFILE: ChatParticipant = {
    name: 'GOOGLE' as string_name,
    fullname: 'Google Gemini',
    color: '#4285f4',
} as const;

/**
 * Execution Tools for calling Google Gemini API.
 *
 * @public exported from `@promptbook/google`
 */
export const createGoogleExecutionTools = Object.assign(
    (options: GoogleExecutionToolsOptions): LlmExecutionTools => {
        if ($isRunningInJest()) {
            // Note: [🔘]
            throw new Error('GoogleExecutionTools are not supported in Jest environment');
        }

        // Note: [🔘] There is a compatibility when using import from '@ai-sdk/google'
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createGoogleGenerativeAI } = require('@ai-sdk/google');

        const googleGeminiVercelProvider = createGoogleGenerativeAI({
            ...options,
            /// apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        });

        const baseTools = createExecutionToolsFromVercelProvider({
            title: 'Google',
            description: 'Implementation of Google models',
            vercelProvider: googleGeminiVercelProvider,
            availableModels: GOOGLE_MODELS,
            ...options,
        });

        return {
            ...baseTools,
            profile: GOOGLE_PROVIDER_PROFILE,

            async callImageGenerationModel(
                prompt: Pick<Prompt, 'content' | 'parameters' | 'modelRequirements'>,
            ): Promise<ImagePromptResult> {
                const { content, parameters, modelRequirements } = prompt;

                // TODO: [☂] Use here more modelRequirements
                if (modelRequirements.modelVariant !== 'IMAGE_GENERATION') {
                    throw new PipelineExecutionError('Use callImageGenerationModel only for IMAGE_GENERATION variant');
                }

                const modelName = modelRequirements.modelName || 'gemini-3-pro-image-preview';

                const rawPromptContent = templateParameters(content, { ...parameters, modelName });

                const start: string_date_iso8601 = $getCurrentDate();

                const experimental_imageModel = googleGeminiVercelProvider.image(modelName);

                // TODO: Prompt: !!!!! Move generating images as resopnsibility into the `createExecutionToolsFromVercelProvider`
                const { image } = await experimental_imageModel.generateImage({
                    prompt: rawPromptContent,
                    // size: modelRequirements.size, // <- TODO: Mapping of sizes
                    // aspect_ratio: '1:1', // <- TODO: Mapping of aspect ratios
                });

                const complete: string_date_iso8601 = $getCurrentDate();

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawResponse: any = { image };

                return exportJson({
                    name: 'promptResult',
                    message: `Result of \`GoogleExecutionTools.callImageGenerationModel\``,
                    order: [],
                    value: {
                        content: `data:${image.contentType};base64,${image.base64}`,
                        modelName,
                        timing: {
                            start,
                            complete,
                        },
                        usage: {
                            price: uncertainNumber(),
                            input: {
                                tokensCount: uncertainNumber(0),
                                ...computeUsageCounts(rawPromptContent),
                            },
                            output: {
                                tokensCount: uncertainNumber(0),
                                ...computeUsageCounts(''),
                            },
                        },
                        rawPromptContent,
                        rawRequest: {
                            prompt: rawPromptContent,
                        },
                        rawResponse,
                    },
                });
            },
        };
    },
    {
        packageName: '@promptbook/google',
        className: 'GoogleExecutionTools',
    },
) satisfies LlmExecutionToolsConstructor;

/**
 * TODO: !!!!! Rename to `createGoogleLlmExecutionTools`, `...GoogleLlmExecutionTools`
 * TODO: [🎶] Naming "constructor" vs "creator" vs "factory"
 */
