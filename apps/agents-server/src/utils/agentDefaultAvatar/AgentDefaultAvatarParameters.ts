import { PipelineExecutionError } from '../../../../../src/errors/PipelineExecutionError';
import { computeHash } from '@promptbook-local/utils';
import { spaceTrim } from 'spacetrim';
import { z } from 'zod';

/**
 * Semantic archetypes that the LLM may assign to an agent avatar.
 */
export const AGENT_DEFAULT_AVATAR_ARCHETYPES = [
    'guide',
    'builder',
    'scholar',
    'guardian',
    'creator',
    'analyst',
    'explorer',
    'operator',
] as const;

/**
 * Shared three-level scale used for kindness and strictness.
 */
export const AGENT_DEFAULT_AVATAR_LEVELS = ['low', 'medium', 'high'] as const;

/**
 * Supported energy levels for semantic avatar classification.
 */
export const AGENT_DEFAULT_AVATAR_ENERGIES = ['calm', 'steady', 'lively'] as const;

/**
 * Stored schema version for deterministic default avatar parameters.
 */
export const AGENT_DEFAULT_AVATAR_SCHEMA_VERSION = 'agent-default-avatar-parameters-v1' as const;

/**
 * Stored renderer version for deterministic default avatar rendering.
 */
export const AGENT_DEFAULT_AVATAR_RENDER_VERSION = 'agent-default-avatar-render-v1' as const;

/**
 * Number of renderer palettes available for hash-derived styling.
 */
export const AGENT_DEFAULT_AVATAR_PALETTE_COUNT = 8;

/**
 * Number of supported background-pattern variants.
 */
export const AGENT_DEFAULT_AVATAR_BACKGROUND_PATTERN_COUNT = 5;

/**
 * Number of supported silhouette variants.
 */
export const AGENT_DEFAULT_AVATAR_SILHOUETTE_COUNT = 4;

/**
 * Semantic profile returned by the LLM in stage 1 before deterministic seed enrichment.
 */
export const AgentDefaultAvatarSemanticProfileSchema = z.object({
    archetype: z.enum(AGENT_DEFAULT_AVATAR_ARCHETYPES),
    kindness: z.enum(AGENT_DEFAULT_AVATAR_LEVELS),
    strictness: z.enum(AGENT_DEFAULT_AVATAR_LEVELS),
    energy: z.enum(AGENT_DEFAULT_AVATAR_ENERGIES),
});

/**
 * Semantic avatar profile returned by the LLM.
 */
export type AgentDefaultAvatarSemanticProfile = z.infer<typeof AgentDefaultAvatarSemanticProfileSchema>;

/**
 * Stored intermediate avatar parameters used by the deterministic renderer.
 */
export const AgentDefaultAvatarParametersSchema = AgentDefaultAvatarSemanticProfileSchema.extend({
    schemaVersion: z.literal(AGENT_DEFAULT_AVATAR_SCHEMA_VERSION),
    renderVersion: z.literal(AGENT_DEFAULT_AVATAR_RENDER_VERSION),
    paletteSeed: z.number().int().min(0).max(AGENT_DEFAULT_AVATAR_PALETTE_COUNT - 1),
    backgroundSeed: z.number().int().min(0).max(AGENT_DEFAULT_AVATAR_BACKGROUND_PATTERN_COUNT - 1),
    silhouetteSeed: z.number().int().min(0).max(AGENT_DEFAULT_AVATAR_SILHOUETTE_COUNT - 1),
    detailSeed: z.number().int().min(0).max(15),
});

/**
 * Stored deterministic avatar parameters.
 */
export type AgentDefaultAvatarParameters = z.infer<typeof AgentDefaultAvatarParametersSchema>;

/**
 * JSON schema forwarded to compatible LLMs so stage 1 stays enum-bounded and machine-validated.
 */
export const AGENT_DEFAULT_AVATAR_SEMANTIC_PROFILE_JSON_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    properties: {
        archetype: {
            type: 'string',
            enum: [...AGENT_DEFAULT_AVATAR_ARCHETYPES],
            description:
                'Best matching role for the agent persona. Use guide/builder/scholar/guardian/creator/analyst/explorer/operator.',
        },
        kindness: {
            type: 'string',
            enum: [...AGENT_DEFAULT_AVATAR_LEVELS],
            description: 'How warm, empathetic, and supportive the agent persona feels.',
        },
        strictness: {
            type: 'string',
            enum: [...AGENT_DEFAULT_AVATAR_LEVELS],
            description: 'How rule-oriented, precise, and enforcing the agent persona feels.',
        },
        energy: {
            type: 'string',
            enum: [...AGENT_DEFAULT_AVATAR_ENERGIES],
            description: 'Overall pacing and intensity of the persona.',
        },
    },
    required: ['archetype', 'kindness', 'strictness', 'energy'],
} as const;

/**
 * Parameters needed to enrich the semantic LLM output into stored deterministic avatar parameters.
 */
export type CreateAgentDefaultAvatarParametersOptions = {
    /**
     * Stable hash of the resolved agent source.
     */
    readonly sourceHash: string;

    /**
     * Validated semantic profile returned by the LLM.
     */
    readonly semanticProfile: AgentDefaultAvatarSemanticProfile;
};

/**
 * Parses and validates the JSON returned by the stage-1 LLM classification call.
 *
 * @param content - Raw model output that should contain one JSON object.
 * @returns Validated semantic profile.
 */
export function parseAgentDefaultAvatarSemanticProfile(content: string): AgentDefaultAvatarSemanticProfile {
    let candidate: unknown;

    try {
        candidate = JSON.parse(extractJsonPayload(content));
    } catch {
        throw new PipelineExecutionError(
            spaceTrim(`
                Failed to parse deterministic avatar JSON from the stage-1 LLM output.

                Expected one valid JSON object with enum-bounded avatar traits, but received:

                \`\`\`
                ${String(content).slice(0, 1000)}
                \`\`\`
            `),
        );
    }

    const parsedResult = AgentDefaultAvatarSemanticProfileSchema.safeParse(candidate);
    if (!parsedResult.success) {
        throw new PipelineExecutionError(
            spaceTrim(`
                The stage-1 LLM output did not match the deterministic avatar schema.

                Validation issues:
                ${parsedResult.error.issues.map((issue) => `- \`${issue.path.join('.') || '(root)'}\`: ${issue.message}`).join('\n')}
            `),
        );
    }

    return parsedResult.data;
}

/**
 * Deterministically enriches the semantic LLM output with renderer seeds derived from the source hash.
 *
 * @param options - Stage-1 semantic profile plus source hash.
 * @returns Stored intermediate parameters for stage 2.
 */
export function createAgentDefaultAvatarParameters(
    options: CreateAgentDefaultAvatarParametersOptions,
): AgentDefaultAvatarParameters {
    const { sourceHash, semanticProfile } = options;
    const archetypeHash = computeHash(`${sourceHash}:${semanticProfile.archetype}`);
    const backgroundHash = computeHash(`${sourceHash}:${semanticProfile.energy}`);
    const silhouetteHash = computeHash(`${sourceHash}:${semanticProfile.strictness}`);
    const detailHash = computeHash(
        `${sourceHash}:${semanticProfile.kindness}:${semanticProfile.strictness}:${semanticProfile.energy}:${semanticProfile.archetype}`,
    );

    return AgentDefaultAvatarParametersSchema.parse({
        ...semanticProfile,
        schemaVersion: AGENT_DEFAULT_AVATAR_SCHEMA_VERSION,
        renderVersion: AGENT_DEFAULT_AVATAR_RENDER_VERSION,
        paletteSeed: readHashNibble(archetypeHash, 0) % AGENT_DEFAULT_AVATAR_PALETTE_COUNT,
        backgroundSeed: readHashNibble(backgroundHash, 3) % AGENT_DEFAULT_AVATAR_BACKGROUND_PATTERN_COUNT,
        silhouetteSeed: readHashNibble(silhouetteHash, 7) % AGENT_DEFAULT_AVATAR_SILHOUETTE_COUNT,
        detailSeed: readHashNibble(detailHash, 11),
    });
}

/**
 * Creates a stable cache fingerprint for one resolved agent source and avatar pipeline version.
 *
 * @param sourceHash - Stable hash of the resolved agent source.
 * @returns Deterministic avatar fingerprint.
 */
export function createAgentDefaultAvatarFingerprint(sourceHash: string): string {
    return computeHash(
        `${AGENT_DEFAULT_AVATAR_SCHEMA_VERSION}:${AGENT_DEFAULT_AVATAR_RENDER_VERSION}:${sourceHash}`,
    );
}

/**
 * Serializes stored avatar parameters with a stable key order so renderer hashing stays deterministic.
 *
 * @param parameters - Stored parameters to serialize.
 * @returns Stable JSON string.
 */
export function serializeAgentDefaultAvatarParameters(parameters: AgentDefaultAvatarParameters): string {
    return JSON.stringify({
        schemaVersion: parameters.schemaVersion,
        renderVersion: parameters.renderVersion,
        archetype: parameters.archetype,
        kindness: parameters.kindness,
        strictness: parameters.strictness,
        energy: parameters.energy,
        paletteSeed: parameters.paletteSeed,
        backgroundSeed: parameters.backgroundSeed,
        silhouetteSeed: parameters.silhouetteSeed,
        detailSeed: parameters.detailSeed,
    });
}

/**
 * Extracts the JSON body from raw model text, supporting fenced JSON blocks as a compatibility fallback.
 *
 * @param content - Raw model output.
 * @returns Plain JSON object text.
 */
function extractJsonPayload(content: string): string {
    const trimmedContent = content.trim();

    if (!trimmedContent.startsWith('```')) {
        return trimmedContent;
    }

    const firstNewlineIndex = trimmedContent.indexOf('\n');
    const lastFenceIndex = trimmedContent.lastIndexOf('```');

    if (firstNewlineIndex === -1 || lastFenceIndex <= firstNewlineIndex) {
        return trimmedContent;
    }

    return trimmedContent.slice(firstNewlineIndex + 1, lastFenceIndex).trim();
}

/**
 * Reads one hexadecimal nibble from a hash string, wrapping safely for any index.
 *
 * @param hash - Source hash string.
 * @param index - Nibble index.
 * @returns Numeric nibble value from `0` to `15`.
 */
function readHashNibble(hash: string, index: number): number {
    const nibble = hash[index % hash.length] ?? '0';
    const parsedNibble = Number.parseInt(nibble, 16);

    return Number.isNaN(parsedNibble) ? 0 : parsedNibble;
}
