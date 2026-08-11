import type { string_email } from '@promptbook-local/types';
import type { Json } from '../../../database/schema';
import { parseEmailAddress } from '../../../message-providers/email/_common/utils/parseEmailAddress';
import type { MessageSendAttemptRow } from '../../../utils/messagesAdmin';

/**
 * Contact normalized for display in the messages administration table.
 */
export type MessageContact = {
    readonly fullName: string | null;
    readonly address: string;
    readonly isEmail: boolean;
};

/**
 * Status variants rendered by the messages administration table.
 */
export type MessageStatusKind = 'received' | 'pending' | 'sent' | 'failed';

/**
 * Direction-aware message status prepared for rendering.
 */
export type MessageStatusPresentation = {
    readonly kind: MessageStatusKind;
    readonly attemptCount: number;
    readonly providerName: string | null;
};

/**
 * Error fields extracted from a persisted provider response.
 */
type MessageSendAttemptError = {
    readonly name: string | null;
    readonly message: string;
    readonly stack: string | null;
};

/**
 * Converts arbitrary sender or recipient JSON into consistently renderable contacts.
 */
export function normalizeMessageContacts(value: Json): MessageContact[] {
    if (value === null || value === undefined) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.flatMap(normalizeMessageContacts);
    }

    if (typeof value === 'string') {
        return [createMessageContact(value)];
    }

    if (typeof value === 'object') {
        const address = readFirstStringProperty(value, ['fullEmail', 'email', 'address']);
        const fullName = readFirstStringProperty(value, ['fullName', 'name']);

        if (address) {
            return [createMessageContact(address, fullName)];
        }

        return [createMessageContact(JSON.stringify(value) || String(value))];
    }

    return [createMessageContact(String(value))];
}

/**
 * Resolves message status without treating received inbound messages as unsent outbound messages.
 */
export function resolveMessageStatusPresentation(
    direction: string,
    attempts: ReadonlyArray<MessageSendAttemptRow> | undefined,
): MessageStatusPresentation {
    const normalizedAttempts = attempts || [];

    if (direction === 'INBOUND') {
        return {
            kind: 'received',
            attemptCount: normalizedAttempts.length,
            providerName: null,
        };
    }

    const successfulAttempt = normalizedAttempts.find((attempt) => attempt.isSuccessful);
    if (successfulAttempt) {
        return {
            kind: 'sent',
            attemptCount: normalizedAttempts.length,
            providerName: successfulAttempt.providerName,
        };
    }

    if (normalizedAttempts.length > 0) {
        return {
            kind: 'failed',
            attemptCount: normalizedAttempts.length,
            providerName: null,
        };
    }

    return {
        kind: 'pending',
        attemptCount: 0,
        providerName: null,
    };
}

/**
 * Returns failed send attempts in chronological order for stable diagnostic output.
 */
export function getFailedMessageSendAttempts(
    attempts: ReadonlyArray<MessageSendAttemptRow> | undefined,
): MessageSendAttemptRow[] {
    return [...(attempts || [])]
        .filter((attempt) => !attempt.isSuccessful)
        .sort(compareMessageSendAttemptsChronologically);
}

/**
 * Extracts the most recent useful provider error message for the compact table view.
 */
export function resolveLatestMessageSendAttemptErrorMessage(
    attempts: ReadonlyArray<MessageSendAttemptRow> | undefined,
): string | null {
    const failedAttempts = getFailedMessageSendAttempts(attempts);

    for (let index = failedAttempts.length - 1; index >= 0; index -= 1) {
        const error = resolveMessageSendAttemptError(failedAttempts[index]!.raw);
        if (error) {
            return error.message;
        }
    }

    return null;
}

/**
 * Formats one complete persisted delivery attempt, including the readable stack and untouched raw response.
 */
export function formatMessageSendAttemptLog(attempt: MessageSendAttemptRow): string {
    const normalizedRaw = parseStoredJsonValue(attempt.raw);
    const error = resolveMessageSendAttemptError(normalizedRaw);
    const errorLines = error
        ? [
              '',
              'Error:',
              ...(error.name ? [`Name: ${error.name}`] : []),
              `Message: ${error.message}`,
              ...(error.stack ? ['Stack:', error.stack] : []),
          ]
        : [];

    return [
        `Attempt ID: ${attempt.id}`,
        `Time: ${attempt.createdAt || '-'}`,
        `Provider: ${attempt.providerName || '-'}`,
        `Successful: ${attempt.isSuccessful ? 'yes' : 'no'}`,
        ...errorLines,
        '',
        'Raw provider response:',
        formatJsonForLog(normalizedRaw),
    ].join('\n');
}

/**
 * Parses one contact string with the shared email parser and retains non-email identifiers verbatim.
 */
function createMessageContact(value: string, preferredFullName: string | null = null): MessageContact {
    const normalizedValue = value.trim();

    try {
        const parsedAddress = parseEmailAddress(normalizedValue as string_email);
        return {
            fullName: preferredFullName || parsedAddress.fullName,
            address: parsedAddress.fullEmail,
            isEmail: true,
        };
    } catch {
        return {
            fullName: preferredFullName,
            address: normalizedValue,
            isEmail: false,
        };
    }
}

/**
 * Reads the first non-empty string property from one JSON object.
 */
function readFirstStringProperty(
    value: Record<string, Json | undefined>,
    propertyNames: ReadonlyArray<string>,
): string | null {
    for (const propertyName of propertyNames) {
        const propertyValue = value[propertyName];
        if (typeof propertyValue === 'string' && propertyValue.trim()) {
            return propertyValue.trim();
        }
    }

    return null;
}

/**
 * Orders send attempts by their persisted timestamp and then by id.
 */
function compareMessageSendAttemptsChronologically(
    firstAttempt: MessageSendAttemptRow,
    secondAttempt: MessageSendAttemptRow,
): number {
    const timestampComparison = (firstAttempt.createdAt || '').localeCompare(secondAttempt.createdAt || '');
    return timestampComparison || firstAttempt.id - secondAttempt.id;
}

/**
 * Extracts standard serialized-error fields from legacy and current attempt payloads.
 */
function resolveMessageSendAttemptError(raw: unknown): MessageSendAttemptError | null {
    const normalizedRaw = parseStoredJsonValue(raw);
    if (typeof normalizedRaw === 'string') {
        return normalizedRaw.trim()
            ? {
                  name: null,
                  message: normalizedRaw,
                  stack: null,
              }
            : null;
    }

    if (!isJsonObject(normalizedRaw)) {
        return null;
    }

    const errorValue = parseStoredJsonValue(normalizedRaw.error ?? normalizedRaw);
    if (typeof errorValue === 'string') {
        return errorValue.trim()
            ? {
                  name: null,
                  message: errorValue,
                  stack: null,
              }
            : null;
    }

    if (!isJsonObject(errorValue) || typeof errorValue.message !== 'string' || !errorValue.message.trim()) {
        return null;
    }

    return {
        name: typeof errorValue.name === 'string' && errorValue.name.trim() ? errorValue.name.trim() : null,
        message: errorValue.message.trim(),
        stack: typeof errorValue.stack === 'string' && errorValue.stack.trim() ? errorValue.stack.trim() : null,
    };
}

/**
 * Parses JSON text emitted by legacy database adapters while leaving ordinary strings untouched.
 */
function parseStoredJsonValue(value: unknown): unknown {
    if (typeof value !== 'string') {
        return value;
    }

    try {
        return JSON.parse(value) as unknown;
    } catch {
        return value;
    }
}

/**
 * Formats a persisted JSON value for a preformatted diagnostic block.
 */
function formatJsonForLog(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    const formattedValue = JSON.stringify(value, null, 2);
    return formattedValue === undefined ? String(value) : formattedValue;
}

/**
 * Checks whether an unknown value is a non-array object with string keys.
 */
function isJsonObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
