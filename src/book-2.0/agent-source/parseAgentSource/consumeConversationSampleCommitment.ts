import type { ParsedCommitment } from '../../../commitments/_base/ParsedCommitment';
import type { ParseAgentSourceState } from './ParseAgentSourceState';

/**
 * Updates sample-conversation state for communication commitments.
 *
 * @private internal utility of `parseAgentSource`
 */
export function consumeConversationSampleCommitment(
    state: ParseAgentSourceState,
    commitment: ParsedCommitment,
): boolean {
    switch (commitment.type) {
        case 'INITIAL MESSAGE':
            state.samples.push({ question: null, answer: commitment.content });
            return true;
        case 'USER MESSAGE':
            state.pendingUserMessage = commitment.content;
            return true;
        case 'INTERNAL MESSAGE':
            // INTERNAL MESSAGE stores trace payloads and is intentionally ignored in basic profile samples.
            return true;
        case 'AGENT MESSAGE':
            if (state.pendingUserMessage !== null) {
                state.samples.push({ question: state.pendingUserMessage, answer: commitment.content });
                state.pendingUserMessage = null;
            }
            return true;
        default:
            return false;
    }
}
