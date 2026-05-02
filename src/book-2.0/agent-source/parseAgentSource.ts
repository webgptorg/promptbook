import type { AgentBasicInformation } from './AgentBasicInformation';
import { computeAgentHash } from './computeAgentHash';
import { createDefaultAgentName } from './createDefaultAgentName';
import { normalizeAgentName } from './normalizeAgentName';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';
import { parseParameters } from './parseParameters';
import { ensureMetaFullname } from './parseAgentSource/ensureMetaFullname';
import { extractAgentProfileText } from './parseAgentSource/extractAgentProfileText';
import { extractInitialMessage } from './parseAgentSource/extractInitialMessage';
import { extractParsedAgentProfile } from './parseAgentSource/extractParsedAgentProfile';
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
    const resolvedAgentName = parseResult.agentName || createDefaultAgentName(agentSource);
    const personaDescription = extractAgentProfileText(parseResult.commitments);
    const initialMessage = extractInitialMessage(parseResult.commitments);
    const parsedProfile = extractParsedAgentProfile(parseResult.commitments);

    ensureMetaFullname(parsedProfile.meta, resolvedAgentName);

    return {
        agentName: normalizeAgentName(resolvedAgentName),
        agentHash: computeAgentHash(agentSource),
        permanentId: parsedProfile.meta.id,
        personaDescription,
        initialMessage,
        meta: parsedProfile.meta,
        links: parsedProfile.links,
        parameters: parseParameters(agentSource),
        capabilities: parsedProfile.capabilities,
        samples: parsedProfile.samples,
        knowledgeSources: parsedProfile.knowledgeSources,
    };
}

// TODO: [🕛] Unite `AgentBasicInformation`, `ChatParticipant`, `LlmExecutionTools` +  `LlmToolsMetadata`
