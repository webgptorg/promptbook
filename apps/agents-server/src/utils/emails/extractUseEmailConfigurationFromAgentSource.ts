import { parseAgentSourceWithCommitments } from '../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { parseUseEmailCommitmentContent } from '../../../../../src/commitments/USE_EMAIL/parseUseEmailCommitmentContent';

/**
 * USE EMAIL configuration extracted from an agent source.
 */
export type UseEmailConfiguration = {
    isEnabled: boolean;
    senderEmail?: string;
};

/**
 * Extracts USE EMAIL settings from agent source.
 */
export function extractUseEmailConfigurationFromAgentSource(agentSource: string_book): UseEmailConfiguration {
    const parseResult = parseAgentSourceWithCommitments(agentSource);
    let senderEmail: string | undefined;
    let isEnabled = false;

    for (const commitment of parseResult.commitments) {
        if (commitment.type !== 'USE EMAIL') {
            continue;
        }

        isEnabled = true;

        if (senderEmail) {
            continue;
        }

        const parsedCommitment = parseUseEmailCommitmentContent(commitment.content);
        if (parsedCommitment.senderEmail) {
            senderEmail = parsedCommitment.senderEmail;
        }
    }

    return {
        isEnabled,
        ...(senderEmail ? { senderEmail } : {}),
    };
}
