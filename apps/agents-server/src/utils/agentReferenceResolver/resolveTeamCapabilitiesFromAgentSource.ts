import type { AgentReferenceResolver } from '../../../../../src/book-2.0/agent-source/AgentReferenceResolver';
import type { AgentCapability } from '../../../../../src/book-2.0/agent-source/AgentBasicInformation';
import { parseAgentSourceWithCommitments } from '../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import { parseTeamCommitmentContent, type TeamTeammate } from '../../../../../src/book-2.0/agent-source/parseTeamCommitment';
import {
    createPseudoUserTeammateLabel,
    resolvePseudoAgentKindFromUrl,
} from '../../../../../src/book-2.0/agent-source/pseudoAgentReferences';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import {
    consumeAgentReferenceResolutionIssues,
    type AgentReferenceResolutionIssue,
} from './AgentReferenceResolutionIssue';

/**
 * Converts a TEAM teammate descriptor into an agent capability.
 *
 * @param teammate - Parsed teammate entry from TEAM commitment.
 * @returns Team capability descriptor for profile payloads.
 */
function createTeamCapability(teammate: TeamTeammate): AgentCapability {
    return {
        type: 'team',
        label: teammate.label,
        iconName: 'Users',
        agentUrl: teammate.url,
    };
}

/**
 * Resolves TEAM teammate label for pseudo-user entries.
 *
 * @param teammate - Parsed teammate entry.
 * @param teamContent - Resolved TEAM commitment content.
 * @returns Teammate label suitable for UI capabilities.
 */
function resolveTeamCapabilityLabel(teammate: TeamTeammate, teamContent: string): string {
    if (resolvePseudoAgentKindFromUrl(teammate.url) !== 'USER') {
        return teammate.label;
    }

    return createPseudoUserTeammateLabel(teamContent);
}

/**
 * Converts unresolved TEAM references into visible warning capabilities.
 *
 * @param issue - Resolution issue captured by the shared resolver.
 * @returns Capability chip descriptor representing a missing teammate.
 */
function createMissingTeamCapability(issue: AgentReferenceResolutionIssue): AgentCapability {
    return {
        type: 'team',
        label: `${issue.reference} (not found)`,
        iconName: 'ShieldAlert',
    };
}

/**
 * Resolves TEAM commitments (including compact references) and maps them to capabilities.
 *
 * This is intentionally lightweight and avoids creating full model requirements,
 * because profile endpoints only need TEAM capability data.
 *
 * @param agentSource - Raw agent source to inspect.
 * @param agentReferenceResolver - Optional resolver for compact references like `{Agent}` and `@Agent`.
 * @returns TEAM capabilities resolved from the provided agent source.
 */
export async function resolveTeamCapabilitiesFromAgentSource(
    agentSource: string_book,
    agentReferenceResolver?: AgentReferenceResolver,
): Promise<Array<AgentCapability>> {
    const parsedAgentSource = parseAgentSourceWithCommitments(agentSource);
    const resolvedCapabilities: Array<AgentCapability> = [];
    const seenUrls = new Set<string>();
    const seenMissingReferences = new Set<string>();

    for (const commitment of parsedAgentSource.commitments) {
        if (commitment.type !== 'TEAM') {
            continue;
        }

        let commitmentContent = commitment.content;
        if (agentReferenceResolver) {
            try {
                commitmentContent = await agentReferenceResolver.resolveCommitmentContent('TEAM', commitmentContent);
            } catch (error) {
                console.warn('[AgentReferenceResolver] Failed to resolve TEAM commitment references:', error);
            } finally {
                const resolutionIssues = consumeAgentReferenceResolutionIssues(agentReferenceResolver).filter(
                    (issue) => issue.commitmentType === 'TEAM',
                );

                for (const issue of resolutionIssues) {
                    const normalizedReference = issue.reference.trim().toLowerCase();
                    if (!normalizedReference || seenMissingReferences.has(normalizedReference)) {
                        continue;
                    }

                    seenMissingReferences.add(normalizedReference);
                    resolvedCapabilities.push(createMissingTeamCapability(issue));
                }
            }
        }

        const teammates = parseTeamCommitmentContent(commitmentContent);
        for (const teammate of teammates) {
            if (seenUrls.has(teammate.url)) {
                continue;
            }

            seenUrls.add(teammate.url);
            resolvedCapabilities.push(
                createTeamCapability({
                    ...teammate,
                    label: resolveTeamCapabilityLabel(teammate, commitmentContent),
                }),
            );
        }
    }

    return resolvedCapabilities;
}
