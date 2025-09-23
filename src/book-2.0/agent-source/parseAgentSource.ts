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

    // Find PERSONA commitment
    let personaDescription: string | null = null;

    // Initialize meta object to collect all META commitments
    const meta: { [key: string]: string | undefined } = {};

    for (const commitment of parseResult.commitments) {
        if (commitment.type === 'PERSONA' && !personaDescription) {
            personaDescription = commitment.content;
        } else if (commitment.type.startsWith('META ')) {
            // Extract the meta type by removing 'META ' prefix and converting to lowercase
            const metaType = commitment.type.substring(5).toLowerCase();
            meta[metaType] = commitment.content;
        }
    }

    // Handle special case for meta.image: always provide fallback if not specified
    if (!meta.image) {
        meta.image = generatePlaceholderAgentProfileImageUrl(parseResult.agentName || '!!');
    }

    // Parse parameters using unified approach - both @Parameter and {parameter} notations
    // are treated as the same syntax feature with unified representation
    const parameters = parseParameters(agentSource);

    return {
        agentName: parseResult.agentName,
        personaDescription,
        meta,
        parameters,
    };
}

/**
 * TODO: [🕛] Unite `AgentBasicInformation`, `ChatParticipant`, `LlmExecutionTools` +  `LlmToolsMetadata`
 */
