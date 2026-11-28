import type { really_any } from '../../../../../src/_packages/types.index';
import { serializeError } from '../../../../../src/errors/utils/serializeError';
import { assertsError } from '../../../../../src/errors/assertsError';
import type { MessageProvider } from '../../message-providers/interfaces/MessageProvider';
import type { OutboundEmail } from '../../message-providers/email/_common/Email';
import { createMessageSendAttempt } from './createMessageSendAttempt';

/**
 * Input for executing one delivery attempt.
 */
export type SendMessageAttemptOptions = {
    messageId: number;
    providerName: string;
    provider: MessageProvider;
    message: OutboundEmail;
};

/**
 * Result of one delivery attempt.
 */
export type SendMessageAttemptResult = {
    attemptId: number;
    providerName: string;
    isSuccessful: boolean;
    raw: really_any;
};

/**
 * Executes one provider send attempt and persists the outcome to `MessageSendAttempt`.
 */
export async function sendMessageAttempt(options: SendMessageAttemptOptions): Promise<SendMessageAttemptResult> {
    let isSuccessful = false;
    let raw: really_any = null;

    try {
        raw = await options.provider.send(options.message);
        isSuccessful = true;
    } catch (error) {
        assertsError(error);
        raw = { error: serializeError(error) };
    }

    const persistedAttempt = await createMessageSendAttempt({
        messageId: options.messageId,
        providerName: options.providerName,
        isSuccessful,
        raw,
    });

    return {
        attemptId: persistedAttempt.id,
        providerName: options.providerName,
        isSuccessful,
        raw,
    };
}
