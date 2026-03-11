import { $provideCdnForServer } from '@/src/tools/$provideCdnForServer';
import { $provideExecutionToolsForServer } from '@/src/tools/$provideExecutionToolsForServer';
import sharp from 'sharp';
import { parseAgentSource } from '../../../../../src/book-2.0/agent-source/parseAgentSource';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import type { LlmExecutionTools } from '../../../../../src/execution/LlmExecutionTools';
import { getSingleLlmExecutionTools } from '../../../../../src/llm-providers/_multiple/getSingleLlmExecutionTools';
import { computeHash } from '../../../../../src/utils/misc/computeHash';
import { getGeneratedImageCdnKey } from '../cdn/utils/getGeneratedImageCdnKey';
import { ensureGeneratedImage } from './ensureGeneratedImage';
import { getAgentDefaultAvatarPrompt } from '../../app/agents/[agentName]/images/default-avatar.png/getAgentDefaultAvatarPrompt';

/**
 * Timeout budget used when self-learning waits for a long-running avatar generation to finish.
 */
const SELF_LEARNING_AVATAR_TIMEOUT_MS = 1000 * 60 * 15;

/**
 * Lock lifetime used for distributed avatar generation.
 */
const SELF_LEARNING_AVATAR_LOCK_TTL_MS = 1000 * 60 * 20;

/**
 * One RGB color.
 */
type RgbColor = {
    readonly r: number;
    readonly g: number;
    readonly b: number;
};

/**
 * Mutable aggregation bucket used while quantizing raw image pixels.
 */
type MutableColorBucket = {
    totalR: number;
    totalG: number;
    totalB: number;
    count: number;
};

/**
 * Prepared avatar materialization handle with early stable URL and deferred finalization.
 */
export type AgentDefaultAvatarMaterialization = {
    /**
     * Stable CDN URL known before the binary exists.
     */
    readonly placeholderImageUrl: string;
    /**
     * Completes generation, uploads the image, and optionally derives stable brand colors.
     */
    readonly finalize: (options?: {
        readonly includeColors?: boolean;
    }) => Promise<{
        readonly imageUrl: string;
        readonly colors?: ReadonlyArray<string>;
    }>;
};

/**
 * Builds one deterministic filename/lock pair for a generated default avatar.
 */
function resolveAgentDefaultAvatarStorage(agentSource: string_book): {
    readonly agentName: string;
    readonly prompt: string;
    readonly internalFilename: string;
    readonly lockKey: string;
    readonly placeholderImageUrl: string;
} {
    const agentProfile = parseAgentSource(agentSource);
    const prompt = getAgentDefaultAvatarPrompt(agentProfile);
    const promptHash = computeHash(prompt);
    const internalFilename = `agent-avatar-${promptHash}.png`;
    const lockKey = `agent-avatar-${promptHash}`;
    const cdn = $provideCdnForServer();
    const cdnKey = getGeneratedImageCdnKey({
        filename: internalFilename,
        pathPrefix: cdn.pathPrefix,
    });

    return {
        agentName: agentProfile.agentName,
        prompt,
        internalFilename,
        lockKey,
        placeholderImageUrl: cdn.getItemUrl(cdnKey).href,
    };
}

/**
 * Converts one RGB color to uppercase hexadecimal notation.
 */
function toHexColor(color: RgbColor): string {
    return `#${[color.r, color.g, color.b]
        .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0').toUpperCase())
        .join('')}`;
}

/**
 * Computes normalized saturation for one RGB color.
 */
function getSaturation(color: RgbColor): number {
    const max = Math.max(color.r, color.g, color.b);
    const min = Math.min(color.r, color.g, color.b);
    if (max === 0) {
        return 0;
    }

    return (max - min) / max;
}

/**
 * Computes normalized brightness for one RGB color.
 */
function getBrightness(color: RgbColor): number {
    return (Math.max(color.r, color.g, color.b) + Math.min(color.r, color.g, color.b)) / (255 * 2);
}

/**
 * Computes Euclidean distance between two RGB colors.
 */
function getColorDistance(first: RgbColor, second: RgbColor): number {
    return Math.sqrt(
        (first.r - second.r) ** 2 + (first.g - second.g) ** 2 + (first.b - second.b) ** 2,
    );
}

/**
 * Quantizes one RGB channel into a coarse palette bucket.
 */
function toBucketComponent(value: number): number {
    return Math.max(0, Math.min(7, Math.floor(value / 32)));
}

/**
 * Scores a bucket so saturated mid-brightness colors outrank grayscale extremes.
 */
function getBucketScore(color: RgbColor, count: number): number {
    const saturation = getSaturation(color);
    const brightness = getBrightness(color);
    const brightnessWeight = 1 - Math.min(Math.abs(brightness - 0.55), 0.55);

    return count * (0.65 + saturation) * Math.max(brightnessWeight, 0.2);
}

/**
 * Builds a deterministic fallback palette when the image is nearly monochrome.
 */
function createPaletteFallback(color: RgbColor): Array<string> {
    const lighter = {
        r: Math.min(255, color.r + 36),
        g: Math.min(255, color.g + 36),
        b: Math.min(255, color.b + 36),
    };
    const darker = {
        r: Math.max(0, color.r - 44),
        g: Math.max(0, color.g - 44),
        b: Math.max(0, color.b - 44),
    };

    return [toHexColor(color), toHexColor(lighter), toHexColor(darker)];
}

/**
 * Extracts a compact stable 2-3 color palette from a generated avatar image.
 */
async function deriveStableAvatarColors(imageUrl: string): Promise<ReadonlyArray<string>> {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
        throw new Error(`Failed to fetch generated avatar for color derivation: ${imageResponse.status}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const { data, info } = await sharp(imageBuffer)
        .resize(48, 48, { fit: 'cover' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const buckets = new Map<string, MutableColorBucket>();
    const channelCount = info.channels;

    for (let index = 0; index < data.length; index += channelCount) {
        const r = data[index] ?? 0;
        const g = data[index + 1] ?? 0;
        const b = data[index + 2] ?? 0;
        const color = { r, g, b };
        const saturation = getSaturation(color);
        const brightness = getBrightness(color);

        if (saturation < 0.08 && (brightness < 0.06 || brightness > 0.97)) {
            continue;
        }

        const bucketKey = `${toBucketComponent(r)}-${toBucketComponent(g)}-${toBucketComponent(b)}`;
        const bucket = buckets.get(bucketKey) || {
            totalR: 0,
            totalG: 0,
            totalB: 0,
            count: 0,
        };

        bucket.totalR += r;
        bucket.totalG += g;
        bucket.totalB += b;
        bucket.count += 1;
        buckets.set(bucketKey, bucket);
    }

    const rankedColors = [...buckets.values()]
        .map((bucket) => ({
            color: {
                r: bucket.totalR / bucket.count,
                g: bucket.totalG / bucket.count,
                b: bucket.totalB / bucket.count,
            },
            count: bucket.count,
        }))
        .sort((first, second) => getBucketScore(second.color, second.count) - getBucketScore(first.color, first.count));

    if (rankedColors.length === 0) {
        return ['#64748B', '#94A3B8'];
    }

    const selectedColors: Array<RgbColor> = [];

    for (const candidate of rankedColors) {
        if (selectedColors.length >= 3) {
            break;
        }

        if (selectedColors.some((selectedColor) => getColorDistance(selectedColor, candidate.color) < 48)) {
            continue;
        }

        selectedColors.push(candidate.color);
    }

    if (selectedColors.length < 2) {
        return createPaletteFallback(selectedColors[0] || rankedColors[0]!.color).slice(0, 2);
    }

    return selectedColors.slice(0, 3).map(toHexColor);
}

/**
 * Creates the uploaded avatar image if it does not already exist and returns a stable materialization handle.
 */
export async function prepareAgentDefaultAvatarMaterialization(
    agentSource: string_book,
): Promise<AgentDefaultAvatarMaterialization> {
    const { agentName, prompt, internalFilename, lockKey, placeholderImageUrl } =
        resolveAgentDefaultAvatarStorage(agentSource);

    return {
        placeholderImageUrl,
        finalize: async (options = {}) => {
            const imageRecord = await ensureGeneratedImage({
                filename: internalFilename,
                prompt,
                lockKey,
                timeoutMs: SELF_LEARNING_AVATAR_TIMEOUT_MS,
                lockTtlMs: SELF_LEARNING_AVATAR_LOCK_TTL_MS,
                createImage: async () => {
                    const executionTools = await $provideExecutionToolsForServer();
                    const llmTools = getSingleLlmExecutionTools(executionTools.llm) as LlmExecutionTools;

                    if (!llmTools.callImageGenerationModel) {
                        throw new Error('Image generation is not supported by the current LLM configuration');
                    }

                    const imageResult = await llmTools.callImageGenerationModel({
                        title: `Generate default avatar for ${agentName}`,
                        content: prompt,
                        parameters: {},
                        modelRequirements: {
                            modelVariant: 'IMAGE_GENERATION',
                            modelName: 'dall-e-3',
                            size: '1024x1792',
                            quality: 'hd',
                            style: 'natural',
                        },
                    });

                    if (!imageResult.content) {
                        throw new Error('Failed to generate image: no content returned');
                    }

                    const imageResponse = await fetch(imageResult.content);
                    if (!imageResponse.ok) {
                        throw new Error(`Failed to download generated image: ${imageResponse.status}`);
                    }

                    const imageBuffer = await imageResponse.arrayBuffer();
                    const buffer = Buffer.from(imageBuffer);
                    const cdn = $provideCdnForServer();
                    const cdnKey = getGeneratedImageCdnKey({
                        filename: internalFilename,
                        pathPrefix: cdn.pathPrefix,
                    });
                    await cdn.setItem(cdnKey, {
                        type: 'image/png',
                        data: buffer,
                    });

                    const cdnUrl = cdn.getItemUrl(cdnKey);
                    return {
                        cdnUrl: cdnUrl.href,
                        cdnKey,
                    };
                },
            });

            return {
                imageUrl: imageRecord.cdnUrl,
                colors: options.includeColors ? await deriveStableAvatarColors(imageRecord.cdnUrl) : undefined,
            };
        },
    };
}
