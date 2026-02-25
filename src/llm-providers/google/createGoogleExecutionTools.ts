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
 * Google image generation request payload.
 */
type GoogleImageGenerationRequest = {
    readonly contents: ReadonlyArray<{
        readonly role?: 'user' | 'model';
        readonly parts: ReadonlyArray<{
            readonly text: string;
        }>;
    }>;
    readonly generationConfig?: {
        readonly responseModalities?: ReadonlyArray<'TEXT' | 'IMAGE'>;
    };
};

/**
 * Inline image payload from Google image generation response.
 */
type GoogleImageInlineData = {
    readonly mimeType?: string;
    readonly data?: string;
};

/**
 * Google image generation response part.
 */
type GoogleImageGenerationPart = {
    readonly inlineData?: GoogleImageInlineData;
    readonly inline_data?: GoogleImageInlineData;
    readonly text?: string;
};

/**
 * Google image generation response payload.
 */
type GoogleImageGenerationResponse = {
    readonly candidates?: ReadonlyArray<{
        readonly content?: {
            readonly parts?: ReadonlyArray<GoogleImageGenerationPart>;
        };
    }>;
    readonly usageMetadata?: {
        readonly promptTokenCount?: number;
        readonly candidatesTokenCount?: number;
    };
};

/**
 * Parsed Google image data payload.
 */
type GoogleImageData = {
    readonly base64: string;
    readonly contentType: string;
};

const DEFAULT_GOOGLE_GENERATIVE_AI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GOOGLE_IMAGE_RESPONSE_MODALITIES: GoogleImageGenerationRequest['generationConfig'] = {
    responseModalities: ['TEXT', 'IMAGE'],
};

/**
 * Resolve the Google API key from options or environment.
 */
function resolveGoogleApiKey(options: GoogleExecutionToolsOptions): string {
    const apiKey = options.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
        throw new PipelineExecutionError(
            'Missing Google Generative AI API key. Set GOOGLE_GENERATIVE_AI_API_KEY or pass apiKey.',
        );
    }

    return apiKey;
}

/**
 * Normalize the Google Generative AI base URL.
 */
function normalizeGoogleBaseUrl(baseUrl?: string): string {
    return (baseUrl || DEFAULT_GOOGLE_GENERATIVE_AI_BASE_URL).replace(/\/+$/u, '');
}

/**
 * Extract inline image data from a Google image generation response.
 */
function extractGoogleImageData(rawResponse: GoogleImageGenerationResponse): GoogleImageData {
    const parts = rawResponse.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part) => part.inlineData?.data || part.inline_data?.data);
    const inlineData = imagePart?.inlineData || imagePart?.inline_data;

    if (!inlineData?.data) {
        throw new PipelineExecutionError('No image data returned by Google image generation model');
    }

    return {
        base64: inlineData.data,
        contentType: inlineData.mimeType || 'image/png',
    };
}

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

                const apiKey = resolveGoogleApiKey(options);
                const baseUrl = normalizeGoogleBaseUrl(options.baseURL);
                const fetchFunction = options.fetch || fetch;
                const rawRequest: GoogleImageGenerationRequest = {
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                {
                                    text: rawPromptContent,
                                },
                            ],
                        },
                    ],
                    generationConfig: GOOGLE_IMAGE_RESPONSE_MODALITIES,
                };
                const rawResponseText = await fetchFunction(`${baseUrl}/models/${modelName}:generateContent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey,
                        ...options.headers,
                    },
                    body: JSON.stringify(rawRequest),
                })
                    .then(async (response) => {
                        const responseText = await response.text();

                        if (!response.ok) {
                            throw new PipelineExecutionError(
                                `Google image generation failed (${response.status} ${response.statusText}): ${
                                    responseText || 'No response body'
                                }`,
                            );
                        }

                        return responseText;
                    })
                    .catch((error) => {
                        if (error instanceof PipelineExecutionError) {
                            throw error;
                        }

                        const message = error instanceof Error ? error.message : 'Unknown error';
                        throw new PipelineExecutionError(`Google image generation request failed: ${message}`);
                    });

                let rawResponse: GoogleImageGenerationResponse;
                try {
                    rawResponse = JSON.parse(rawResponseText) as GoogleImageGenerationResponse;
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Unknown error';
                    throw new PipelineExecutionError(`Failed to parse Google image response: ${message}`);
                }

                const image = extractGoogleImageData(rawResponse);

                const complete: string_date_iso8601 = $getCurrentDate();

                const duration = uncertainNumber((new Date(complete).getTime() - new Date(start).getTime()) / 1000);

                const usageMetadata = rawResponse.usageMetadata;

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
                            duration,
                            input: {
                                tokensCount: uncertainNumber(usageMetadata?.promptTokenCount),
                                ...computeUsageCounts(rawPromptContent),
                            },
                            output: {
                                tokensCount: uncertainNumber(usageMetadata?.candidatesTokenCount),
                                ...computeUsageCounts(''),
                            },
                        },
                        rawPromptContent,
                        rawRequest: {
                            prompt: rawPromptContent,
                            googleRequest: rawRequest,
                        },
                        rawResponse: {
                            image,
                            googleResponse: rawResponse,
                        },
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
