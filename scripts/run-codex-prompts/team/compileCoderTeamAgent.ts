import { createAgentModelRequirements } from '../../../src/book-2.0/agent-source/createAgentModelRequirements';
import { filterCommitmentsForAgentModelRequirements } from '../../../src/book-2.0/agent-source/createAgentModelRequirementsWithCommitments/filterCommitmentsForAgentModelRequirements';
import { parseAgentSource } from '../../../src/book-2.0/agent-source/parseAgentSource';
import { parseAgentSourceWithCommitments } from '../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import { parseTeamCommitmentContent } from '../../../src/book-2.0/agent-source/parseTeamCommitment';
import type { ResolvedLocalAgentSource } from '../../../src/cli/cli-commands/common/resolveLocalAgentSource';
import { ParseError } from '../../../src/errors/ParseError';
import { spaceTrim } from '../../../src/utils/organization/spaceTrim';
import { formatAgentModelRequirementsForRunner } from '../../run-agent-messages/messages/createAgentRunnerSystemMessage';
import type { CoderTeamAgent } from './CoderTeamAgent';

/** Compiles the same TEAM schemas as Agents Server without registering process-global tool implementations. */
export async function compileCoderTeamAgent(source: ResolvedLocalAgentSource): Promise<CoderTeamAgent> {
    const commitments = filterCommitmentsForAgentModelRequirements(
        parseAgentSourceWithCommitments(source.agentSource).commitments,
    );
    for (const commitment of commitments.filter(({ type }) => type === 'TEAM')) {
        // Prose may span lines before a reference; validate URLs, not each prose line independently.
        const references = commitment.content.match(/https?:\/\/[^\s]+/gi) || [];
        if (!references.length || references.some((reference) => !parseTeamCommitmentContent(reference).length)) {
            throw new ParseError(spaceTrim(`Unresolved TEAM in \`${source.agentUrl}\`: ${commitment.content}`));
        }
    }
    const requirements = await createAgentModelRequirements(source.agentSource, undefined, undefined, undefined, {
        agentReferenceResolver: source.agentReferenceResolver,
        isTeamToolRegistrationDisabled: true,
    });
    const profile = parseAgentSource(source.agentSource);
    const teammates = (requirements._metadata?.teammates || []) as ReadonlyArray<{
        url: string;
        label: string;
        instructions?: string;
        toolName: string;
    }>;
    return {
        url: source.agentUrl,
        name: profile.meta.fullname || profile.agentName,
        systemMessage: formatAgentModelRequirementsForRunner(requirements),
        teammates: teammates.map(({ toolName, ...teammate }) => {
            const tool = requirements.tools?.find(({ name }) => name === toolName);
            if (!tool) throw new ParseError(spaceTrim(`TEAM tool \`${toolName}\` was not compiled.`));
            return { ...teammate, tool };
        }),
        resolveTeammate: async (url, signal) => compileCoderTeamAgent(await source.resolveAgentSource(url, signal)),
    };
}
