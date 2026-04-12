import { z } from 'zod';

/**
 * Version string shared by the stage-1 schema and the stage-2 renderer.
 */
export const AGENT_DEFAULT_AVATAR_VERSION = 'pixel-avatar-v1';

/**
 * Allowed semantic trait tags emitted by the LLM stage.
 */
export const AGENT_DEFAULT_AVATAR_TRAIT_TAG_VALUES = [
    'kind',
    'strict',
    'curious',
    'calm',
    'bold',
    'protective',
    'creative',
    'analytical',
] as const;

/**
 * Allowed archetypes emitted by the LLM stage.
 */
export const AGENT_DEFAULT_AVATAR_ARCHETYPE_VALUES = [
    'mentor',
    'guardian',
    'scholar',
    'maker',
    'navigator',
    'healer',
] as const;

/**
 * Allowed palette families emitted by the LLM stage.
 */
export const AGENT_DEFAULT_AVATAR_PALETTE_FAMILY_VALUES = [
    'sunrise',
    'forest',
    'ocean',
    'ember',
    'slate',
    'orchid',
] as const;

/**
 * Allowed background patterns emitted by the LLM stage.
 */
export const AGENT_DEFAULT_AVATAR_BACKGROUND_PATTERN_VALUES = [
    'checker',
    'sunburst',
    'stripes',
    'dots',
    'circuit',
    'halo',
] as const;

/**
 * Allowed face shapes emitted by the LLM stage.
 */
export const AGENT_DEFAULT_AVATAR_FACE_SHAPE_VALUES = ['round', 'square', 'diamond'] as const;

/**
 * Allowed eye styles emitted by the LLM stage.
 */
export const AGENT_DEFAULT_AVATAR_EYE_STYLE_VALUES = ['soft', 'focused', 'wide', 'visor'] as const;

/**
 * Allowed accessories emitted by the LLM stage.
 */
export const AGENT_DEFAULT_AVATAR_ACCESSORY_VALUES = ['none', 'glasses', 'monocle', 'visor', 'badge', 'crown'] as const;

/**
 * Score validator shared by the constrained semantic sliders.
 */
const agentDefaultAvatarScoreSchema = z.number().int().min(0).max(4);

/**
 * Ordered lookup used to canonicalize `traitTags`.
 */
const AGENT_DEFAULT_AVATAR_TRAIT_TAG_ORDER = new Map(
    AGENT_DEFAULT_AVATAR_TRAIT_TAG_VALUES.map((traitTag, index) => [traitTag, index] as const),
);

/**
 * Semantic JSON shape produced by the LLM before deterministic enrichment.
 */
export const agentDefaultAvatarSemanticParametersSchema = z
    .object({
        traitTags: z
            .tuple([
                z.enum(AGENT_DEFAULT_AVATAR_TRAIT_TAG_VALUES),
                z.enum(AGENT_DEFAULT_AVATAR_TRAIT_TAG_VALUES),
            ])
            .refine(([firstTraitTag, secondTraitTag]) => firstTraitTag !== secondTraitTag, {
                message: 'traitTags must contain two distinct values',
            }),
        kindness: agentDefaultAvatarScoreSchema,
        strictness: agentDefaultAvatarScoreSchema,
        energy: agentDefaultAvatarScoreSchema,
        formality: agentDefaultAvatarScoreSchema,
        archetype: z.enum(AGENT_DEFAULT_AVATAR_ARCHETYPE_VALUES),
        paletteFamily: z.enum(AGENT_DEFAULT_AVATAR_PALETTE_FAMILY_VALUES),
        backgroundPattern: z.enum(AGENT_DEFAULT_AVATAR_BACKGROUND_PATTERN_VALUES),
        faceShape: z.enum(AGENT_DEFAULT_AVATAR_FACE_SHAPE_VALUES),
        eyeStyle: z.enum(AGENT_DEFAULT_AVATAR_EYE_STYLE_VALUES),
        accessory: z.enum(AGENT_DEFAULT_AVATAR_ACCESSORY_VALUES),
    })
    .strict();

/**
 * Semantic parameter payload emitted by the LLM stage.
 */
export type AgentDefaultAvatarSemanticParameters = z.infer<typeof agentDefaultAvatarSemanticParametersSchema>;

/**
 * Stored intermediate parameter payload used by the renderer stage.
 */
export const agentDefaultAvatarParametersSchema = agentDefaultAvatarSemanticParametersSchema.extend({
    version: z.literal(AGENT_DEFAULT_AVATAR_VERSION),
    agentFingerprint: z.string().min(1),
    seedHex: z.string().regex(/^[0-9a-f]{16}$/),
});

/**
 * Stored intermediate parameter payload used by the renderer stage.
 */
export type AgentDefaultAvatarParameters = z.infer<typeof agentDefaultAvatarParametersSchema>;

/**
 * Canonicalizes `traitTags` ordering so the same semantic meaning stores the same JSON.
 */
export function normalizeAgentDefaultAvatarSemanticParameters(
    semanticParameters: AgentDefaultAvatarSemanticParameters,
): AgentDefaultAvatarSemanticParameters {
    const [firstTraitTag, secondTraitTag] = [...semanticParameters.traitTags].sort((leftTraitTag, rightTraitTag) => {
        return (
            (AGENT_DEFAULT_AVATAR_TRAIT_TAG_ORDER.get(leftTraitTag) ?? Number.MAX_SAFE_INTEGER) -
            (AGENT_DEFAULT_AVATAR_TRAIT_TAG_ORDER.get(rightTraitTag) ?? Number.MAX_SAFE_INTEGER)
        );
    }) as AgentDefaultAvatarSemanticParameters['traitTags'];

    return {
        ...semanticParameters,
        traitTags: [firstTraitTag, secondTraitTag],
    };
}

/**
 * Builds the stored stage-1 parameter payload by enriching normalized semantic output with deterministic metadata.
 */
export function createAgentDefaultAvatarParameters(options: {
    readonly agentFingerprint: string;
    readonly semanticParameters: AgentDefaultAvatarSemanticParameters;
}): AgentDefaultAvatarParameters {
    const semanticParameters = normalizeAgentDefaultAvatarSemanticParameters(options.semanticParameters);

    return {
        version: AGENT_DEFAULT_AVATAR_VERSION,
        agentFingerprint: options.agentFingerprint,
        seedHex: options.agentFingerprint.slice(0, 16).padEnd(16, '0'),
        ...semanticParameters,
    };
}
