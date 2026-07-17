import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { spaceTrim } from 'spacetrim';
import type { ManGoOnboardingTestMessage } from './manGoOnboardingAgentRuntime';

/**
 * Reads one string property from an unknown manGo onboarding JSON body.
 *
 * @param body - Unknown request body.
 * @param propertyName - Required property name.
 * @returns String property value.
 */
export function readManGoOnboardingStringProperty(body: unknown, propertyName: string): string {
    if (!body || typeof body !== 'object' || typeof (body as Record<string, unknown>)[propertyName] !== 'string') {
        throw new NotAllowed(
            spaceTrim(`
                Request body must include string property \`${propertyName}\`.
            `),
        );
    }

    return (body as Record<string, string>)[propertyName];
}

/**
 * Reads one string-array property from an unknown manGo onboarding JSON body.
 *
 * @param body - Unknown request body.
 * @param propertyName - Required property name.
 * @returns String array property value.
 */
export function readManGoOnboardingStringArrayProperty(body: unknown, propertyName: string): readonly string[] {
    if (!body || typeof body !== 'object') {
        throw new NotAllowed(
            spaceTrim(`
                Request body must include array property \`${propertyName}\`.
            `),
        );
    }

    const value = (body as Record<string, unknown>)[propertyName];

    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
        throw new NotAllowed(
            spaceTrim(`
                Request body property \`${propertyName}\` must be an array of strings.
            `),
        );
    }

    return value;
}

/**
 * Reads and validates test messages from an unknown manGo onboarding JSON body.
 *
 * @param body - Unknown request body.
 * @returns Test messages.
 */
export function readManGoOnboardingTestMessages(body: unknown): readonly ManGoOnboardingTestMessage[] {
    if (!body || typeof body !== 'object' || !Array.isArray((body as Record<string, unknown>).messages)) {
        throw new NotAllowed(
            spaceTrim(`
                Request body must include array property \`messages\`.
            `),
        );
    }

    return ((body as Record<string, unknown>).messages as unknown[]).map(readManGoOnboardingTestMessage);
}

/**
 * Reads one test message object from an unknown JSON item.
 *
 * @param message - Unknown message item.
 * @returns Test message.
 *
 * @private internal utility of manGo onboarding API request parsing
 */
function readManGoOnboardingTestMessage(message: unknown): ManGoOnboardingTestMessage {
    if (!message || typeof message !== 'object') {
        throw new NotAllowed(
            spaceTrim(`
                Every \`messages\` item must be an object.
            `),
        );
    }

    const role = (message as Record<string, unknown>).role;
    const content = (message as Record<string, unknown>).content;

    if ((role !== 'user' && role !== 'agent') || typeof content !== 'string') {
        throw new NotAllowed(
            spaceTrim(`
                Every \`messages\` item must include \`role\` and string \`content\`.
            `),
        );
    }

    return { role, content };
}
