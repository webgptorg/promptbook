import type { string_mime_type } from '../../../../../src/types/typeAliases';

/**
 * Checks if the value is valid mime-type
 *
 * @param value candidate for mime-type
 * @returns the value if it is valid mime-type
 * @throws TypeError if the value is not valid mime-type
 */
export function validateMimeType(value: unknown): string_mime_type {
    if (typeof value !== 'string') {
        throw new TypeError(`Mime-type must be string, but it is ${typeof value}`);
    }

    if (!/^[a-z]+\/(?:[a-z0-9]+[.-])*[a-z0-9]+$/i.test(value)) {
        throw new TypeError(`Invalid mime-type "${value}"`);
    }

    return value as string_mime_type;
}

/**
 * TODO: [🧠] Move to main Promptbook utils
 */
