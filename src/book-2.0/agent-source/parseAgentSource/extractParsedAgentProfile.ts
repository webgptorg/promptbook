import type { ParsedCommitment } from '../../../commitments/_base/ParsedCommitment';
import { applyMetaCommitment } from './applyMetaCommitment';
import { consumeConversationSampleCommitment } from './consumeConversationSampleCommitment';
import { createCapabilitiesFromCommitment } from './createCapabilitiesFromCommitment';
import type { ParseAgentSourceState } from './ParseAgentSourceState';
import type { ParsedAgentProfile } from './ParsedAgentProfile';

/**
 * Collects capability, sample, meta, link, and knowledge-source data from commitments.
 *
 * @private internal utility of `parseAgentSource`
 */
export function extractParsedAgentProfile(commitments: ReadonlyArray<ParsedCommitment>): ParsedAgentProfile {
    const state: ParseAgentSourceState = {
        meta: {},
        links: [],
        capabilities: [],
        samples: [],
        knowledgeSources: [],
        pendingUserMessage: null,
        knownKnowledgeSourceUrls: new Set<string>(),
    };

    for (const commitment of commitments) {
        processParsedCommitment(state, commitment);
    }

    return {
        meta: state.meta,
        links: state.links,
        capabilities: state.capabilities,
        samples: state.samples,
        knowledgeSources: state.knowledgeSources,
    };
}

/**
 * Processes one parsed commitment through the sample, capability, and meta stages.
 */
function processParsedCommitment(state: ParseAgentSourceState, commitment: ParsedCommitment): void {
    if (consumeConversationSampleCommitment(state, commitment)) {
        return;
    }

    const capabilities = createCapabilitiesFromCommitment(state, commitment);
    if (capabilities.length > 0) {
        state.capabilities.push(...capabilities);
        return;
    }

    applyMetaCommitment(state, commitment);
}
