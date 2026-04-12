import { createHash } from 'crypto';
import type { AgentBasicInformation, LlmExecutionTools, Prompt } from '@promptbook-local/types';
import { spaceTrim } from 'spacetrim';
import {
    AGENT_DEFAULT_AVATAR_ACCESSORY_VALUES,
    AGENT_DEFAULT_AVATAR_ARCHETYPE_VALUES,
    AGENT_DEFAULT_AVATAR_BACKGROUND_PATTERN_VALUES,
    AGENT_DEFAULT_AVATAR_EYE_STYLE_VALUES,
    AGENT_DEFAULT_AVATAR_FACE_SHAPE_VALUES,
    AGENT_DEFAULT_AVATAR_PALETTE_FAMILY_VALUES,
    AGENT_DEFAULT_AVATAR_TRAIT_TAG_VALUES,
    type AgentDefaultAvatarParameters,
    type AgentDefaultAvatarSemanticParameters,
    agentDefaultAvatarSemanticParametersSchema,
    createAgentDefaultAvatarParameters,
} from './AgentDefaultAvatarParameters';

/**
 * Minimal LLM tool shape needed by the stage-1 classifier.
 */
type AgentDefaultAvatarGeneratorLlmTools = Pick<LlmExecutionTools, 'callChatModel'>;

/**
 * Input payload required to classify one agent into deterministic avatar parameters.
 */
export type GenerateAgentDefaultAvatarParametersOptions = {
    /**
     * Minimal LLM tools used for the stage-1 classification step.
     */
    readonly llmTools: AgentDefaultAvatarGeneratorLlmTools;

    /**
     * Resolved agent profile used to describe the avatar semantics.
     */
    readonly agent: AgentBasicInformation;

    /**
     * Canonical resolved agent source used for deterministic fingerprinting and analysis context.
     */
    readonly agentSource: string;

    /**
     * Stable hash derived from the canonical agent source.
     */
    readonly agentFingerprint: string;
};

/**
 * Ordered trait lookup used by the heuristic fallback.
 */
const AGENT_DEFAULT_AVATAR_TRAIT_ORDER = [...AGENT_DEFAULT_AVATAR_TRAIT_TAG_VALUES];

/**
 * Lower-cased keyword groups used by the heuristic fallback.
 */
const AGENT_DEFAULT_AVATAR_TRAIT_KEYWORDS: Record<
    (typeof AGENT_DEFAULT_AVATAR_TRAIT_TAG_VALUES)[number],
    ReadonlyArray<string>
> = {
    kind: ['kind', 'friendly', 'helpful', 'warm', 'empathetic', 'gentle', 'supportive', 'caring'],
    strict: ['strict', 'firm', 'discipline', 'compliance', 'policy', 'rules', 'precise', 'rigorous'],
    curious: ['curious', 'explore', 'investigate', 'discover', 'learn', 'research', 'question'],
    calm: ['calm', 'steady', 'patient', 'peaceful', 'balanced', 'mindful', 'measured'],
    bold: ['bold', 'confident', 'decisive', 'assertive', 'fearless', 'strong', 'ambitious'],
    protective: ['protect', 'safe', 'safety', 'guard', 'secure', 'shield', 'reliable', 'trustworthy'],
    creative: ['creative', 'design', 'imagine', 'invent', 'brainstorm', 'artistic', 'original'],
    analytical: ['analytical', 'logic', 'structured', 'evidence', 'systematic', 'diagnose', 'technical'],
};

/**
 * Removes persisted-only `META ID` lines before fingerprinting avatar inputs.
 */
function stripMetaIdLines(agentSource: string): string {
    return agentSource
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith('META ID '))
        .join('\n');
}

/**
 * Computes the stable fingerprint used by the stage-1 cache and the stage-2 seed.
 */
export function computeAgentDefaultAvatarFingerprint(agentSource: string): string {
    return createHash('sha256').update(stripMetaIdLines(agentSource), 'utf8').digest('hex');
}

/**
 * Extracts one compact excerpt from the full book so the LLM sees the core intent without large knowledge blocks.
 */
function createAgentSourceExcerpt(agentSource: string, maximumCharacters = 2400): string {
    const normalizedSource = agentSource
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (normalizedSource.length <= maximumCharacters) {
        return normalizedSource;
    }

    return `${normalizedSource.slice(0, maximumCharacters).trimEnd()}\n...`;
}

/**
 * Formats the resolved profile into a concise deterministic summary for the LLM stage.
 */
function createAgentProfileSummary(agent: AgentBasicInformation): string {
    const identityLabel = agent.meta.fullname || agent.agentName;
    const summaryRows = [
        `Name: ${identityLabel}`,
        `Persona: ${agent.personaDescription || agent.meta.description || 'No persona description provided.'}`,
        `Initial message: ${agent.initialMessage || 'No initial message provided.'}`,
        `Color hint: ${agent.meta.color || 'No explicit color hint.'}`,
        `Font hint: ${agent.meta.font || 'No explicit font hint.'}`,
        `Capabilities: ${
            agent.capabilities.length > 0
                ? agent.capabilities.map((capability) => capability.label).join(', ')
                : 'No explicit capabilities.'
        }`,
        `Knowledge sources: ${agent.knowledgeSources.length}`,
        `Example conversations: ${
            agent.samples.length > 0
                ? agent.samples
                      .slice(0, 2)
                      .map((sample, index) => `${index + 1}. Q=${sample.question || 'n/a'} | A=${sample.answer}`)
                      .join(' || ')
                : 'No examples.'
        }`,
    ];

    return summaryRows.join('\n');
}

/**
 * Renders the explicit schema instructions for the stage-1 LLM prompt.
 */
function createAvatarSchemaInstructions(): string {
    return spaceTrim(
        () => `
            Return one JSON object with exactly these keys:
            - \`traitTags\`: exactly 2 distinct values from [${AGENT_DEFAULT_AVATAR_TRAIT_TAG_VALUES.join(', ')}]
            - \`kindness\`: integer 0-4
            - \`strictness\`: integer 0-4
            - \`energy\`: integer 0-4
            - \`formality\`: integer 0-4
            - \`archetype\`: one of [${AGENT_DEFAULT_AVATAR_ARCHETYPE_VALUES.join(', ')}]
            - \`paletteFamily\`: one of [${AGENT_DEFAULT_AVATAR_PALETTE_FAMILY_VALUES.join(', ')}]
            - \`backgroundPattern\`: one of [${AGENT_DEFAULT_AVATAR_BACKGROUND_PATTERN_VALUES.join(', ')}]
            - \`faceShape\`: one of [${AGENT_DEFAULT_AVATAR_FACE_SHAPE_VALUES.join(', ')}]
            - \`eyeStyle\`: one of [${AGENT_DEFAULT_AVATAR_EYE_STYLE_VALUES.join(', ')}]
            - \`accessory\`: one of [${AGENT_DEFAULT_AVATAR_ACCESSORY_VALUES.join(', ')}]

            Scoring guidance:
            - \`kindness\`: 0 means cold/abrasive, 4 means warm/supportive.
            - \`strictness\`: 0 means permissive/flexible, 4 means firm/rule-bound.
            - \`energy\`: 0 means quiet/reserved, 4 means vivid/active.
            - \`formality\`: 0 means casual/playful, 4 means formal/professional.

            Output rules:
            - Output JSON only.
            - Do not wrap the JSON in markdown fences.
            - Do not invent keys outside the schema.
            - Prefer business-friendly, mature, professional visual semantics.
        `,
    );
}

/**
 * Builds the deterministic stage-1 prompt from resolved profile and source context.
 */
function createAgentDefaultAvatarClassificationPrompt(options: {
    readonly agent: AgentBasicInformation;
    readonly agentSource: string;
    readonly agentFingerprint: string;
}): string {
    return spaceTrim(
        (block) => `
            Classify this AI agent into deterministic default-avatar parameters for a procedural pixel-art renderer.

            ${createAvatarSchemaInstructions()}

            Deterministic context:
            - Stable fingerprint: \`${options.agentFingerprint}\`
            - The final image renderer is deterministic and pixel-art only.
            - Choose parameters that reflect the agent's personality and operating style.

            Agent profile summary:
            \`\`\`text
            ${block(createAgentProfileSummary(options.agent))}
            \`\`\`

            Agent book excerpt:
            \`\`\`book
            ${block(createAgentSourceExcerpt(options.agentSource))}
            \`\`\`
        `,
    );
}

/**
 * Parses one JSON object from the LLM response content.
 */
function parseAvatarSemanticParametersResponse(content: string): unknown {
    const trimmedContent = content.trim();
    const unfencedContent = trimmedContent.startsWith('```')
        ? trimmedContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
        : trimmedContent;

    return JSON.parse(unfencedContent);
}

/**
 * Picks one deterministic item from a finite array using the stable fingerprint.
 */
function pickFingerprintValue<T>(values: ReadonlyArray<T>, agentFingerprint: string, offset: number): T {
    const index = parseInt(agentFingerprint.slice(offset, offset + 2) || '00', 16) % values.length;
    return values[index] as T;
}

/**
 * Computes a small bounded score from keyword hits.
 */
function computeKeywordScore(profileText: string, keywords: ReadonlyArray<string>): number {
    const hits = keywords.reduce((count, keyword) => {
        return count + (profileText.includes(keyword) ? 1 : 0);
    }, 0);

    return Math.min(4, Math.max(0, hits));
}

/**
 * Creates a deterministic heuristic fallback when the LLM stage is unavailable or malformed.
 */
function createFallbackSemanticParameters(options: {
    readonly agent: AgentBasicInformation;
    readonly agentFingerprint: string;
}): AgentDefaultAvatarSemanticParameters {
    const profileText = [
        options.agent.agentName,
        options.agent.meta.fullname,
        options.agent.personaDescription,
        options.agent.meta.description,
        options.agent.initialMessage,
        options.agent.capabilities.map((capability) => capability.label).join(' '),
    ]
        .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
        .join(' ')
        .toLowerCase();

    const scoredTraits = AGENT_DEFAULT_AVATAR_TRAIT_ORDER.map((traitTag) => ({
        traitTag,
        score: computeKeywordScore(profileText, AGENT_DEFAULT_AVATAR_TRAIT_KEYWORDS[traitTag]),
    })).sort((leftTrait, rightTrait) => {
        if (rightTrait.score !== leftTrait.score) {
            return rightTrait.score - leftTrait.score;
        }

        return AGENT_DEFAULT_AVATAR_TRAIT_ORDER.indexOf(leftTrait.traitTag) -
            AGENT_DEFAULT_AVATAR_TRAIT_ORDER.indexOf(rightTrait.traitTag);
    });
    const highestScoredTrait = scoredTraits[0];

    const firstTraitTag =
        highestScoredTrait && highestScoredTrait.score > 0
            ? highestScoredTrait.traitTag
            : pickFingerprintValue(AGENT_DEFAULT_AVATAR_TRAIT_ORDER, options.agentFingerprint, 0);
    const secondTraitTag =
        scoredTraits.find((trait) => trait.traitTag !== firstTraitTag && trait.score > 0)?.traitTag ||
        AGENT_DEFAULT_AVATAR_TRAIT_ORDER.find((traitTag) => traitTag !== firstTraitTag) ||
        'calm';

    const kindness = Math.max(
        computeKeywordScore(profileText, AGENT_DEFAULT_AVATAR_TRAIT_KEYWORDS.kind),
        firstTraitTag === 'kind' || secondTraitTag === 'kind' ? 3 : 0,
    );
    const strictness = Math.max(
        computeKeywordScore(profileText, AGENT_DEFAULT_AVATAR_TRAIT_KEYWORDS.strict),
        firstTraitTag === 'strict' || secondTraitTag === 'strict' ? 3 : 0,
    );
    const energy = Math.max(
        1,
        computeKeywordScore(profileText, [
            ...AGENT_DEFAULT_AVATAR_TRAIT_KEYWORDS.bold,
            ...AGENT_DEFAULT_AVATAR_TRAIT_KEYWORDS.curious,
            ...AGENT_DEFAULT_AVATAR_TRAIT_KEYWORDS.creative,
        ]),
    );
    const formality = Math.max(
        strictness,
        computeKeywordScore(profileText, ['formal', 'professional', 'expert', 'executive', 'serious']),
    );

    const leadingTraitTag = firstTraitTag;
    const archetypeByTraitTag: Record<
        (typeof AGENT_DEFAULT_AVATAR_TRAIT_TAG_VALUES)[number],
        AgentDefaultAvatarSemanticParameters['archetype']
    > = {
        kind: 'mentor',
        strict: 'guardian',
        curious: 'navigator',
        calm: 'healer',
        bold: 'maker',
        protective: 'guardian',
        creative: 'maker',
        analytical: 'scholar',
    };
    const paletteFamilyByTraitTag: Record<
        (typeof AGENT_DEFAULT_AVATAR_TRAIT_TAG_VALUES)[number],
        AgentDefaultAvatarSemanticParameters['paletteFamily']
    > = {
        kind: 'sunrise',
        strict: 'slate',
        curious: 'ocean',
        calm: 'forest',
        bold: 'ember',
        protective: 'forest',
        creative: 'orchid',
        analytical: 'slate',
    };
    const backgroundPatternByTraitTag: Record<
        (typeof AGENT_DEFAULT_AVATAR_TRAIT_TAG_VALUES)[number],
        AgentDefaultAvatarSemanticParameters['backgroundPattern']
    > = {
        kind: 'halo',
        strict: 'checker',
        curious: 'sunburst',
        calm: 'dots',
        bold: 'stripes',
        protective: 'circuit',
        creative: 'sunburst',
        analytical: 'circuit',
    };

    return {
        traitTags: [firstTraitTag, secondTraitTag],
        kindness,
        strictness,
        energy,
        formality,
        archetype: archetypeByTraitTag[leadingTraitTag],
        paletteFamily: paletteFamilyByTraitTag[leadingTraitTag],
        backgroundPattern: backgroundPatternByTraitTag[leadingTraitTag],
        faceShape: strictness >= 3 ? 'square' : kindness >= 3 ? 'round' : 'diamond',
        eyeStyle: strictness >= 4 ? 'focused' : leadingTraitTag === 'analytical' ? 'visor' : energy >= 3 ? 'wide' : 'soft',
        accessory:
            formality >= 4
                ? 'badge'
                : leadingTraitTag === 'strict'
                  ? 'crown'
                  : leadingTraitTag === 'analytical'
                    ? 'visor'
                    : leadingTraitTag === 'curious'
                      ? 'monocle'
                      : 'glasses',
    };
}

/**
 * Calls the LLM stage and returns deterministic stored parameters.
 */
export async function generateAgentDefaultAvatarParameters(
    options: GenerateAgentDefaultAvatarParametersOptions,
): Promise<AgentDefaultAvatarParameters> {
    const prompt: Prompt = {
        title: `Classify default avatar parameters for ${options.agent.agentName}`,
        content: createAgentDefaultAvatarClassificationPrompt(options),
        parameters: {},
        modelRequirements: {
            modelVariant: 'CHAT',
            temperature: 0,
            maxTokens: 400,
        },
    };

    try {
        if (!options.llmTools.callChatModel) {
            throw new Error('Chat model execution is not available for default avatar classification');
        }

        const result = await options.llmTools.callChatModel(prompt);
        const semanticParameters = agentDefaultAvatarSemanticParametersSchema.parse(
            parseAvatarSemanticParametersResponse(result.content),
        );

        return createAgentDefaultAvatarParameters({
            agentFingerprint: options.agentFingerprint,
            semanticParameters,
        });
    } catch (error) {
        console.warn(
            `Falling back to heuristic default avatar parameters for "${options.agent.agentName}": ${
                error instanceof Error ? error.message : String(error)
            }`,
        );

        return createAgentDefaultAvatarParameters({
            agentFingerprint: options.agentFingerprint,
            semanticParameters: createFallbackSemanticParameters(options),
        });
    }
}
