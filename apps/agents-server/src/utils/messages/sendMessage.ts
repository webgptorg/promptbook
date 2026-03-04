import type { really_any } from '../../../../../src/_packages/types.index';
import { EMAIL_PROVIDERS } from '../../message-providers';
import type { MessageProvider } from '../../message-providers/interfaces/MessageProvider';
import type { OutboundEmail } from '../../message-providers/email/_common/Email';
import { createMessage } from './createMessage';
import { sendMessageAttempt } from './sendMessageAttempt';

/**
 * Provider descriptor used by `sendMessage`.
 */
export type SendMessageProvider = {
    providerName: string;
    provider: MessageProvider;
};

/**
 * Optional overrides for `sendMessage`.
 */
export type SendMessageOptions = {
    providers?: ReadonlyArray<SendMessageProvider>;
};

/**
 * Normalized one-attempt result returned from `sendMessage`.
 */
export type SendMessageAttemptSummary = {
    attemptId: number;
    providerName: string;
    isSuccessful: boolean;
    raw: really_any;
};

/**
 * Aggregate send result for one message.
 */
export type SendMessageResult = {
    messageId: number;
    status: 'sent' | 'failed' | 'no-provider' | 'stored-only';
    attempts: Array<SendMessageAttemptSummary>;
};

/**
 * Delivery error thrown when all providers fail for an outbound email.
 */
export class SendMessageDeliveryError extends Error {
    public readonly result: SendMessageResult;

    public constructor(result: SendMessageResult) {
        super('Failed to send email via any provider');
        this.name = 'SendMessageDeliveryError';
        this.result = result;
    }
}

/**
 * Type guard for `SendMessageDeliveryError`.
 */
export function isSendMessageDeliveryError(error: unknown): error is SendMessageDeliveryError {
    return error instanceof SendMessageDeliveryError;
}

/**
 * Persists a message and, for outbound emails, creates send attempts until one provider succeeds.
 */
export async function sendMessage(message: OutboundEmail, options?: SendMessageOptions): Promise<SendMessageResult> {
    const insertedMessage = await createMessage(message);
    const baseResult: SendMessageResult = {
        messageId: insertedMessage.id,
        status: 'stored-only',
        attempts: [],
    };

    if (message.direction !== 'OUTBOUND' || message.channel !== 'EMAIL') {
        return baseResult;
    }

    const providers = resolveProviders(options?.providers);
    if (providers.length === 0) {
        console.warn('No email providers configured');
        return {
            ...baseResult,
            status: 'no-provider',
        };
    }

    for (const { providerName, provider } of providers) {
        const attempt = await sendMessageAttempt({
            messageId: insertedMessage.id,
            providerName,
            provider,
            message,
        });

        baseResult.attempts.push(attempt);

        if (attempt.isSuccessful) {
            return {
                ...baseResult,
                status: 'sent',
            };
        }
    }

    const failureResult: SendMessageResult = {
        ...baseResult,
        status: 'failed',
    };
    throw new SendMessageDeliveryError(failureResult);
}

/**
 * Resolves provider list from explicit options or environment-registered defaults.
 */
function resolveProviders(overrides?: ReadonlyArray<SendMessageProvider>): Array<SendMessageProvider> {
    if (overrides && overrides.length > 0) {
        return [...overrides];
    }

    return Object.entries(EMAIL_PROVIDERS).map(([providerName, provider]) => ({
        providerName,
        provider,
    }));
}
