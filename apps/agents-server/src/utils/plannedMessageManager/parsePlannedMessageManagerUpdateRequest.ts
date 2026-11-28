import { spaceTrim } from 'spacetrim';
import { ParseError } from '../../../../../src/errors/ParseError';
import type { UpdateManagedPlannedMessageRequest } from './updateManagedPlannedMessage';

/**
 * Fields one administrator request may carry, in the order they are read.
 *
 * @private constant of `parsePlannedMessageManagerUpdateRequest`
 */
const PLANNED_MESSAGE_UPDATE_REQUEST_FIELDS = [
    'message',
    'milliseconds',
    'cronExpression',
    'startsAt',
    'endsAt',
    'maxRunCount',
] as const satisfies ReadonlyArray<keyof UpdateManagedPlannedMessageRequest>;

/**
 * Parses the untrusted body of one planned-message change request.
 *
 * Only the presence of each field is decided here — what a field is allowed to contain stays with the
 * shared planned-message service, so an administrator and an agent are held to one set of rules.
 *
 * @param rawBody - Parsed JSON body of the request.
 * @returns Requested change, carrying exactly the fields that were really sent.
 * @throws {ParseError} When the body is not an object, carries no change, or holds an invalid `isPaused`.
 *
 * @private internal admin utility of Agents Server
 */
export function parsePlannedMessageManagerUpdateRequest(rawBody: unknown): UpdateManagedPlannedMessageRequest {
    if (typeof rawBody !== 'object' || rawBody === null || Array.isArray(rawBody)) {
        throw new ParseError(
            spaceTrim(`
                Invalid planned-message change.

                - The request body must be a **JSON object** describing the change.
            `),
        );
    }

    const requestBody = rawBody as Record<string, unknown>;
    const parsedRequest: Record<string, unknown> = {};

    for (const fieldName of PLANNED_MESSAGE_UPDATE_REQUEST_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(requestBody, fieldName)) {
            parsedRequest[fieldName] = requestBody[fieldName];
        }
    }

    if (Object.prototype.hasOwnProperty.call(requestBody, 'isPaused')) {
        if (typeof requestBody.isPaused !== 'boolean') {
            throw new ParseError(
                spaceTrim(`
                    Invalid planned-message change.

                    - \`isPaused\` must be \`true\` to hold the planned message back, or \`false\` to let it go again.
                `),
            );
        }

        parsedRequest.isPaused = requestBody.isPaused;
    }

    if (Object.keys(parsedRequest).length === 0) {
        throw new ParseError(
            spaceTrim(`
                Nothing to change in this planned message.

                - Pass at least one of \`cronExpression\`, \`milliseconds\`, \`startsAt\`, \`endsAt\`, \`maxRunCount\`, \`message\`, or \`isPaused\`.
            `),
        );
    }

    return parsedRequest as UpdateManagedPlannedMessageRequest;
}
