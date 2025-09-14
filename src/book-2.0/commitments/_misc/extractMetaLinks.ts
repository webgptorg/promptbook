import type { string_book } from '../../agent-source/string_book';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';

/**
 * Extracts META LINK commitments from agent source
 * Returns an array of all META LINK URLs found in the agent source
 *
 * @private
 */

export function extractMetaLinks(agentSource: string_book): string[] {
    const parseResult = parseAgentSourceWithCommitments(agentSource);

    const metaLinks: string[] = [];

    for (const commitment of parseResult.commitments) {
        if (commitment.type === 'META LINK') {
            const link = commitment.content.trim();
            if (link) {
                metaLinks.push(link);
            }
        }
    }

    return metaLinks;
}
