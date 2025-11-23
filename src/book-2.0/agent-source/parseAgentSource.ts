import spaceTrim from 'spacetrim';
import { normalizeTo_camelCase } from '../../utils/normalization/normalizeTo_camelCase';
import { generatePlaceholderAgentProfileImageUrl } from '../utils/generatePlaceholderAgentProfileImageUrl';
import type { AgentBasicInformation } from './AgentBasicInformation';
import { computeAgentHash } from './computeAgentHash';
import { normalizeAgentName } from './normalizeAgentName';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { parseParameters } from './parseParameters';
import type { string_book } from './string_book';
import { createDefaultAgentName } from './createDefaultAgentName';

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

    // Find PERSONA and META commitments
    let personaDescription: string | null = null;

    for (const commitment of parseResult.commitments) {
        if (commitment.type !== 'PERSONA') {
            continue;
        }

        if (personaDescription === null) {
            personaDescription = '';
        } else {
            personaDescription += `\n\n${personaDescription}`;
        }

        personaDescription += commitment.content;
    }

    const meta: Record<string, string> = {};

    for (const commitment of parseResult.commitments) {
        if (commitment.type !== 'META') {
            continue;
        }

        // Parse META commitments - format is "META TYPE content"
        const metaTypeRaw = commitment.content.split(' ')[0] || 'NONE';
        const metaType = normalizeTo_camelCase(metaTypeRaw);
        meta[metaType] = spaceTrim(commitment.content.substring(metaTypeRaw.length));
    }

    // Generate gravatar fallback if no meta image specified
    if (!meta.image) {
        meta.image = generatePlaceholderAgentProfileImageUrl(parseResult.agentName || '!!');
    }

    // Parse parameters using unified approach - both @Parameter and {parameter} notations
    // are treated as the same syntax feature with unified representation
    const parameters = parseParameters(agentSource);
    const agentHash = computeAgentHash(agentSource);

    return {
        agentName: normalizeAgentName(parseResult.agentName || createDefaultAgentName(agentSource)),
        agentHash,
        personaDescription,
        meta,
        parameters,
    };
}

/**
 * TODO: [🕛] Unite `AgentBasicInformation`, `ChatParticipant`, `LlmExecutionTools` +  `LlmToolsMetadata`
 */
