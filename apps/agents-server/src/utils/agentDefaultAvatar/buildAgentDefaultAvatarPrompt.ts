import type { AgentBasicInformation } from '@promptbook-local/types';
import { spaceTrim } from 'spacetrim';

/**
 * Input needed to build the stage-1 semantic avatar prompt.
 */
export type BuildAgentDefaultAvatarPromptOptions = {
    /**
     * Resolved agent profile used as the semantic source of truth.
     */
    readonly agentProfile: AgentBasicInformation;

    /**
     * Fully resolved book/source for the current agent.
     */
    readonly resolvedAgentSource: string;
};

/**
 * Builds the stage-1 prompt that classifies an agent into compact deterministic avatar traits.
 *
 * @param options - Resolved profile and source context.
 * @returns Prompt instructing the LLM to return only enum-bounded semantic JSON.
 */
export function buildAgentDefaultAvatarPrompt(options: BuildAgentDefaultAvatarPromptOptions): string {
    const { agentProfile, resolvedAgentSource } = options;

    const promptPayload = {
        agentName: agentProfile.agentName || null,
        fullname: agentProfile.meta.fullname || null,
        description: agentProfile.meta.description || null,
        personaDescription: agentProfile.personaDescription || null,
        metaColor: agentProfile.meta.color || null,
        metaFont: agentProfile.meta.font || null,
    };

    const excerptPayload = {
        bookExcerpt: createAgentSourceExcerpt(resolvedAgentSource),
    };

    return spaceTrim(
        (block) => `
            Classify the following AI agent for a deterministic procedural pixel-art avatar pipeline.

            Return only the JSON object required by the provided schema.

            Decision rules:
            -   \`kindness\` is \`high\` for warm, empathetic, caring, encouraging, or service-oriented personas; \`low\` for harsh or adversarial ones; otherwise \`medium\`.
            -   \`strictness\` is \`high\` for rule-heavy, compliance-heavy, enforcing, safety-policing, or highly precise personas; \`low\` for relaxed, playful, improvisational ones; otherwise \`medium\`.
            -   \`energy\` is \`lively\` for enthusiastic, fast, animated personas; \`calm\` for soothing, patient, quiet personas; otherwise \`steady\`.
            -   \`archetype\` must be the single best fit from \`guide\`, \`builder\`, \`scholar\`, \`guardian\`, \`creator\`, \`analyst\`, \`explorer\`, or \`operator\`.
            -   Prefer stable persona identity over incidental examples, specific tools, or one-off wording.

            Agent profile:
            \`\`\`json
            ${block(JSON.stringify(promptPayload, null, 2))}
            \`\`\`

            Relevant book excerpt:
            \`\`\`json
            ${block(JSON.stringify(excerptPayload, null, 2))}
            \`\`\`
        `,
    );
}

/**
 * Trims long agent sources into a stable excerpt that keeps both the start and end of the book.
 *
 * @param resolvedAgentSource - Full resolved source for the agent.
 * @returns Stable excerpt suitable for prompt context.
 */
function createAgentSourceExcerpt(resolvedAgentSource: string): string {
    const trimmedSource = resolvedAgentSource.trim();

    if (trimmedSource.length <= 3600) {
        return trimmedSource;
    }

    return `${trimmedSource.slice(0, 2400)}\n\n...[truncated for avatar analysis]...\n\n${trimmedSource.slice(-1200)}`;
}
