import moment from 'moment';
import { spaceTrim } from 'spacetrim';
import type { AgentModelRequirements } from '../../book-2.0/agent-source/AgentModelRequirements';
import type { ParsedCommitment } from '../_base/ParsedCommitment';
import { formatOptionalInstructionBlock } from '../_base/formatOptionalInstructionBlock';

/**
 * `USE` commitment types whose system-message sections are aggregated after the
 * commitment-by-commitment application step.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
 */
type AggregatedUseCommitmentType = 'USE BROWSER' | 'USE DEEPSEARCH' | 'USE SEARCH ENGINE' | 'USE TIME';

/**
 * All `USE` commitment types currently participating in final system-message aggregation.
 *
 * @private internal constant for `aggregateUseCommitmentSystemMessages`
 */
const AGGREGATED_USE_COMMITMENT_TYPES = [
    'USE BROWSER',
    'USE DEEPSEARCH',
    'USE SEARCH ENGINE',
    'USE TIME',
] as const satisfies ReadonlyArray<AggregatedUseCommitmentType>;

/**
 * Prefix used for temporary in-system-message placeholders that preserve the first-occurrence position of aggregated `USE` sections.
 *
 * @private internal constant for `appendAggregatedUseCommitmentPlaceholder`
 */
const AGGREGATED_USE_COMMITMENT_PLACEHOLDER_PREFIX = '# AGGREGATED USE COMMITMENT: ';

/**
 * Type guard for `USE` commitment types that are aggregated in the final system message.
 *
 * @param type - Commitment type to check.
 * @returns `true` when the commitment participates in `USE` system-message aggregation.
 *
 * @private internal utility of `aggregateUseCommitmentSystemMessages`
 */
function isAggregatedUseCommitmentType(type: ParsedCommitment['type']): type is AggregatedUseCommitmentType {
    return (AGGREGATED_USE_COMMITMENT_TYPES as ReadonlyArray<string>).includes(type);
}

/**
 * Creates the placeholder token used to reserve the first-occurrence position of an aggregated `USE` system-message section.
 *
 * @param type - Aggregated `USE` commitment type.
 * @returns Single-line placeholder comment stored in the interim system message.
 *
 * @private internal utility of `appendAggregatedUseCommitmentPlaceholder`
 */
function getAggregatedUseCommitmentPlaceholder(type: AggregatedUseCommitmentType): string {
    return `${AGGREGATED_USE_COMMITMENT_PLACEHOLDER_PREFIX}${type}`;
}

/**
 * Combines distinct additional instruction blocks in source order.
 *
 * @param additionalInstructions - Deduplicated instruction blocks collected from the agent source.
 * @returns Combined instruction text ready for `formatOptionalInstructionBlock`.
 *
 * @private internal utility of `createAggregatedUseCommitmentSystemMessage`
 */
function combineAdditionalInstructions(additionalInstructions: ReadonlyArray<string>): string {
    return additionalInstructions.join('\n');
}

/**
 * Creates the final aggregated system-message section for a supported `USE` commitment type.
 *
 * @param type - Aggregated `USE` commitment type.
 * @param additionalInstructions - Distinct additional instructions in source order.
 * @returns Final system-message block for the commitment type.
 *
 * @private internal utility of `aggregateUseCommitmentSystemMessages`
 */
function createAggregatedUseCommitmentSystemMessage(
    type: AggregatedUseCommitmentType,
    additionalInstructions: ReadonlyArray<string>,
): string {
    const combinedAdditionalInstructions = combineAdditionalInstructions(additionalInstructions);

    switch (type) {
        case 'USE TIME':
            return spaceTrim(
                (block) => `
                    ## Time and date context

                    -   It is ${moment().format('MMMM YYYY')} now.
                    -   If you need more precise current time information, use the tool \`get_current_time\`.
                    ${block(formatOptionalInstructionBlock('Time instructions', combinedAdditionalInstructions))}
                `,
            );

        case 'USE BROWSER':
            return spaceTrim(
                (block) => `
                    ## Browser

                    -   Use \`fetch_url_content\` to retrieve content from specific URLs (webpages or documents) using scrapers.
                    -   Use \`run_browser\` for real interactive browser automation (navigation, clicks, typing, waiting, scrolling).
                    -   When you need to know information from a specific website or document, use the tools provided.
                    ${block(formatOptionalInstructionBlock('Browser instructions', combinedAdditionalInstructions))}
                `,
            );

        case 'USE SEARCH ENGINE':
            return spaceTrim(
                (block) => `
                    ## Web Search

                    -   Use \`web_search\` to find up-to-date information or facts.
                    -   When you need to know some information from the internet, use the search tool provided.
                    -   Do not make up information when you can search for it.
                    -   Do not tell the user you cannot search for information, YOU CAN.
                    ${block(formatOptionalInstructionBlock('Search instructions', combinedAdditionalInstructions))}
                `,
            );

        case 'USE DEEPSEARCH':
            return spaceTrim(
                (block) => `
                    ## Deep Research

                    -   Use \`deep_search\` for broader research tasks that need multi-step investigation, comparison, or synthesis across multiple sources.
                    -   Prefer it over quick search when the user asks for a well-grounded brief, report, or deeper investigation.
                    -   Do not pretend you cannot research current information when this tool is available.
                    ${block(formatOptionalInstructionBlock('DeepSearch instructions', combinedAdditionalInstructions))}
                `,
            );
    }
}

/**
 * Adds the placeholder for an aggregated `USE` system-message section only once, preserving the section position from the first occurrence.
 *
 * @param requirements - Current model requirements.
 * @param type - Aggregated `USE` commitment type being applied.
 * @returns Requirements with the placeholder inserted when it was not already present.
 *
 * @private internal utility of `USE` commitments
 */
export function appendAggregatedUseCommitmentPlaceholder(
    requirements: AgentModelRequirements,
    type: AggregatedUseCommitmentType,
): AgentModelRequirements {
    const placeholder = getAggregatedUseCommitmentPlaceholder(type);

    if (requirements.systemMessage.includes(placeholder)) {
        return requirements;
    }

    const systemMessage = requirements.systemMessage.trim()
        ? `${requirements.systemMessage}\n\n${placeholder}`
        : placeholder;

    return {
        ...requirements,
        systemMessage,
    };
}

/**
 * Replaces temporary `USE` placeholders with one aggregated system-message block per commitment type.
 *
 * Distinct additional-instruction blocks are merged in stable source order while the hard-coded section is emitted only once.
 *
 * @param requirements - Model requirements produced by commitment-by-commitment application.
 * @param commitments - Filtered commitments in their original source order.
 * @returns Requirements with aggregated `USE` system-message sections.
 *
 * @private internal utility of `createAgentModelRequirementsWithCommitments`
 */
export function aggregateUseCommitmentSystemMessages(
    requirements: AgentModelRequirements,
    commitments: ReadonlyArray<ParsedCommitment>,
): AgentModelRequirements {
    const additionalInstructionsByType = new Map<AggregatedUseCommitmentType, string[]>();

    for (const commitment of commitments) {
        if (!isAggregatedUseCommitmentType(commitment.type)) {
            continue;
        }

        let additionalInstructions = additionalInstructionsByType.get(commitment.type);
        if (!additionalInstructions) {
            additionalInstructions = [];
            additionalInstructionsByType.set(commitment.type, additionalInstructions);
        }

        const normalizedContent = spaceTrim(commitment.content);

        if (normalizedContent && !additionalInstructions.includes(normalizedContent)) {
            additionalInstructions.push(normalizedContent);
        }
    }

    let systemMessage = requirements.systemMessage;

    for (const [type, additionalInstructions] of additionalInstructionsByType) {
        const placeholder = getAggregatedUseCommitmentPlaceholder(type);

        if (!systemMessage.includes(placeholder)) {
            continue;
        }

        systemMessage = systemMessage.replace(
            placeholder,
            createAggregatedUseCommitmentSystemMessage(type, additionalInstructions),
        );
    }

    return {
        ...requirements,
        systemMessage,
    };
}
