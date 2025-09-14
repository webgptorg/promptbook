import type { string_url_image } from '../../../types/typeAliases';
import type { AgentBasicInformation } from '../../agent-source/AgentBasicInformation';
import type { string_book } from '../../agent-source/string_book';
import { generateGravatarUrl } from '../../utils/generateGravatarUrl';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';

/**
 * Parses basic information from agent source
 *
 * There are 2 similar functions:
 * - `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
 * - `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.
 *
 * @public exported from `@promptbook/core`
 */

export function parseAgentSource(agentSource: string_book): AgentBasicInformation {
    const parseResult = parseAgentSourceWithCommitments(agentSource);

    // Find PERSONA and META IMAGE commitments
    let personaDescription: string | null = null;
    let profileImageUrl: string_url_image | undefined;

    for (const commitment of parseResult.commitments) {
        if (commitment.type === 'PERSONA' && !personaDescription) {
            personaDescription = commitment.content;
        } else if (commitment.type === 'META IMAGE' && !profileImageUrl) {
            profileImageUrl = commitment.content as string_url_image;
        }
    }

    // Generate gravatar fallback if no profile image specified
    if (!profileImageUrl) {
        profileImageUrl = generateGravatarUrl(parseResult.agentName) as string_url_image;
    }

    return {
        agentName: parseResult.agentName,
        personaDescription,
        profileImageUrl,
    };
}

/**
 * TODO: [🕛] Unite `AgentBasicInformation`, `ChatParticipant`, `LlmExecutionTools` +  `LlmToolsMetadata`
 */
