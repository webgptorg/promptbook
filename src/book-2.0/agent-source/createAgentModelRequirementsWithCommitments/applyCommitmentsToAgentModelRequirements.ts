import type { BookCommitment } from '../../../commitments/_base/BookCommitment';
import type { ParsedCommitment } from '../../../commitments/_base/ParsedCommitment';
import { getCommitmentDefinition } from '../../../commitments/_common/getCommitmentDefinition';
import type { chococake } from '../../../utils/organization/really_any';
import type { AgentModelRequirements } from '../AgentModelRequirements';
import type { CreateAgentModelRequirementsOptions } from '../CreateAgentModelRequirementsOptions';
import { parseTeamCommitmentContent } from '../parseTeamCommitment';
import type { TeammateProfile } from '../TeammateProfileResolver';

/**
 * Commitment types whose content may contain compact agent references that must be resolved before applying the commitment.
 *
 * @private internal constant of `applyCommitmentsToAgentModelRequirements`
 */
const COMMITMENTS_WITH_AGENT_REFERENCES = new Set<BookCommitment>(['FROM', 'IMPORT', 'IMPORTS', 'TEAM']);

/**
 * Applies parsed commitments one by one while keeping the per-commitment steps focused and easy to follow.
 *
 * @param requirements - Current requirements snapshot.
 * @param commitments - Commitments already filtered for DELETE-like invalidations.
 * @param options - Optional reference and teammate resolvers.
 * @returns Requirements after all applicable commitments are processed.
 *
 * @private function of `createAgentModelRequirementsWithCommitments`
 */
export async function applyCommitmentsToAgentModelRequirements(
    requirements: AgentModelRequirements,
    commitments: ReadonlyArray<ParsedCommitment>,
    options?: CreateAgentModelRequirementsOptions,
): Promise<AgentModelRequirements> {
    for (const [index, commitment] of commitments.entries()) {
        if (shouldSkipCommitmentApplication(commitment, index, commitments.length)) {
            continue;
        }

        const commitmentContent = await resolveCommitmentContent(commitment, options?.agentReferenceResolver);
        requirements = await preResolveTeammateProfilesForTeamCommitment(
            requirements,
            commitment,
            commitmentContent,
            options,
        );
        requirements = applyCommitmentDefinitionSafely(requirements, commitment, commitmentContent);
    }

    return requirements;
}

/**
 * Resolves compact agent references for commitment types that support them.
 *
 * @param commitment - Commitment currently being applied.
 * @param agentReferenceResolver - Optional resolver for compact agent references.
 * @returns Original or resolved commitment content.
 *
 * @private internal utility of `applyCommitmentsToAgentModelRequirements`
 */
async function resolveCommitmentContent(
    commitment: ParsedCommitment,
    agentReferenceResolver?: CreateAgentModelRequirementsOptions['agentReferenceResolver'],
): Promise<string> {
    if (!agentReferenceResolver || !isAgentReferenceCommitment(commitment.type)) {
        return commitment.content;
    }

    try {
        return await agentReferenceResolver.resolveCommitmentContent(commitment.type, commitment.content);
    } catch (error) {
        console.warn(
            `Failed to resolve commitment references for ${commitment.type}, falling back to safe defaults:`,
            error,
        );
        return getSafeReferenceCommitmentFallback(commitment.type, commitment.content);
    }
}

/**
 * Returns a safe fallback content when a resolver fails to transform a reference commitment.
 *
 * @param commitmentType - Commitment being resolved.
 * @param originalContent - Original unresolved commitment content.
 * @returns Fallback content that keeps requirement creation resilient.
 *
 * @private internal utility of `applyCommitmentsToAgentModelRequirements`
 */
function getSafeReferenceCommitmentFallback(commitmentType: BookCommitment, originalContent: string): string {
    if (commitmentType === 'FROM') {
        return 'VOID';
    }

    if (commitmentType === 'IMPORT' || commitmentType === 'IMPORTS' || commitmentType === 'TEAM') {
        return '';
    }

    return originalContent;
}

/**
 * Checks whether the commitment content may need agent-reference resolution before application.
 *
 * @param commitmentType - Commitment type to check.
 * @returns `true` when the commitment can contain compact agent references.
 *
 * @private internal utility of `resolveCommitmentContent`
 */
function isAgentReferenceCommitment(commitmentType: ParsedCommitment['type']): boolean {
    return COMMITMENTS_WITH_AGENT_REFERENCES.has(commitmentType);
}

/**
 * Determines whether a commitment should be skipped before resolution or application.
 *
 * @param commitment - Commitment under consideration.
 * @param commitmentIndex - Zero-based position among filtered commitments.
 * @param commitmentCount - Total number of filtered commitments.
 * @returns `true` when the commitment should not be applied.
 *
 * @private internal utility of `applyCommitmentsToAgentModelRequirements`
 */
function shouldSkipCommitmentApplication(
    commitment: ParsedCommitment,
    commitmentIndex: number,
    commitmentCount: number,
): boolean {
    return commitment.type === 'CLOSED' && commitmentIndex !== commitmentCount - 1;
}

/**
 * Pre-resolves teammate profiles for TEAM commitments so the TEAM commitment definition can reuse richer metadata.
 *
 * @param requirements - Current requirements snapshot.
 * @param commitment - Commitment currently being prepared.
 * @param commitmentContent - Already resolved TEAM commitment content.
 * @param options - Optional teammate profile resolvers.
 * @returns Requirements with pre-resolved teammate profiles stored in metadata when possible.
 *
 * @private internal utility of `applyCommitmentsToAgentModelRequirements`
 */
async function preResolveTeammateProfilesForTeamCommitment(
    requirements: AgentModelRequirements,
    commitment: ParsedCommitment,
    commitmentContent: string,
    options?: CreateAgentModelRequirementsOptions,
): Promise<AgentModelRequirements> {
    const profileResolver = options?.teammateProfileResolver ?? options?.agentReferenceResolver;
    if (commitment.type !== 'TEAM' || !profileResolver?.resolveTeammateProfile) {
        return requirements;
    }

    try {
        const parsedTeammates = parseTeamCommitmentContent(commitmentContent, { strict: false });
        const preResolvedTeammateProfiles = clonePreResolvedTeammateProfiles(requirements._metadata);

        for (const teammate of parsedTeammates) {
            if (preResolvedTeammateProfiles[teammate.url]) {
                continue;
            }

            const profile = await profileResolver.resolveTeammateProfile(teammate.url);
            if (profile) {
                preResolvedTeammateProfiles[teammate.url] = profile;
            }
        }

        return {
            ...requirements,
            _metadata: {
                ...requirements._metadata,
                preResolvedTeammateProfiles,
            },
        };
    } catch (error) {
        console.warn('Failed to pre-resolve teammate profiles for TEAM commitment:', error);
        return requirements;
    }
}

/**
 * Clones the metadata bucket used to cache teammate profiles resolved ahead of TEAM commitment application.
 *
 * @param metadata - Current requirements metadata.
 * @returns Mutable copy of the cached teammate profile map.
 *
 * @private internal utility of `preResolveTeammateProfilesForTeamCommitment`
 */
function clonePreResolvedTeammateProfiles(metadata?: Record<string, chococake>): Record<string, TeammateProfile> {
    return {
        ...((metadata?.preResolvedTeammateProfiles as Record<string, TeammateProfile> | undefined) ?? {}),
    };
}

/**
 * Applies the registered commitment definition while isolating the failure handling from the main loop.
 *
 * @param requirements - Current requirements snapshot.
 * @param commitment - Commitment whose definition should be applied.
 * @param commitmentContent - Final content passed into the definition.
 * @returns Updated requirements, or the original requirements when the commitment fails.
 *
 * @private internal utility of `applyCommitmentsToAgentModelRequirements`
 */
function applyCommitmentDefinitionSafely(
    requirements: AgentModelRequirements,
    commitment: ParsedCommitment,
    commitmentContent: string,
): AgentModelRequirements {
    const definition = getCommitmentDefinition(commitment.type);
    if (!definition) {
        return requirements;
    }

    try {
        return definition.applyToAgentModelRequirements(requirements, commitmentContent);
    } catch (error) {
        console.warn(`Failed to apply commitment ${commitment.type}:`, error);
        return requirements;
    }
}
