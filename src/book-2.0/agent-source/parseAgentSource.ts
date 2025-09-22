import type { string_url_image } from '../../types/typeAliases';
import { generatePlaceholderAgentProfileImageUrl } from '../utils/generatePlaceholderAgentProfileImageUrl';
import type { AgentBasicInformation } from './AgentBasicInformation';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { parseParameters } from './parseParameters';
import type { string_book } from './string_book';

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

    // Find PERSONA and all META commitments
    let personaDescription: string | null = null;
    const meta: { [key: string]: string | undefined } = {};

    for (const commitment of parseResult.commitments) {
        if (commitment.type === 'PERSONA' && !personaDescription) {
            personaDescription = commitment.content;
        } else if (commitment.type.startsWith('META ')) {
            // Extract META type (e.g., 'META IMAGE' -> 'image')
            const metaType = commitment.type.substring(5).toLowerCase();
            if (metaType && commitment.content.trim()) {
                meta[metaType] = commitment.content.trim();
            }
        }
    }

    // Generate gravatar fallback if no profile image specified
    let profileImageUrl: string_url_image;
    if (meta.image) {
        profileImageUrl = meta.image as string_url_image;
    } else {
        profileImageUrl = generatePlaceholderAgentProfileImageUrl(parseResult.agentName || '!!');
    }

    // Parse parameters using unified approach - both @Parameter and {parameter} notations
    // are treated as the same syntax feature with unified representation
    const parameters = parseParameters(agentSource);

    return {
        agentName: parseResult.agentName,
        personaDescription,
        profileImageUrl, // Keep for backward compatibility
        meta,
        parameters,
    };
}

/**
 * TODO: [🕛] Unite `AgentBasicInformation`, `ChatParticipant`, `LlmExecutionTools` +  `LlmToolsMetadata`
 */
