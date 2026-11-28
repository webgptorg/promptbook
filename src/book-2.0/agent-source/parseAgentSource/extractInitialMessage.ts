import type { ParsedCommitment } from '../../../commitments/_base/ParsedCommitment';

/**
 * Resolves the last INITIAL MESSAGE commitment, which is the public initial-message value.
 *
 * @private internal utility of `parseAgentSource`
 */
export function extractInitialMessage(commitments: ReadonlyArray<ParsedCommitment>): string | null {
    let initialMessage: string | null = null;

    for (const commitment of commitments) {
        if (commitment.type === 'INITIAL MESSAGE') {
            initialMessage = commitment.content;
        }
    }

    return initialMessage;
}
