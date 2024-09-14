import spaceTrim from 'spacetrim';
import { RESERVED_PARAMETER_NAMES } from '../../../config';
import { ParseError } from '../../../errors/ParseError';
import type { string_parameter_name, string_reserved_parameter_name } from '../../../types/typeAliases';
import { normalizeTo_camelCase } from '../../normalization/normalizeTo_camelCase';
import { removeDiacritics } from '../../normalization/removeDiacritics';
import { removeEmojis } from '../../removeEmojis';
import { removeQuotes } from '../../removeQuotes';

/**
 * Function `validateParameterName` will @@@
 *
 * @param parameterName @@@
 * @returns @@@
 * @throws {ParseError} @@@
 * @private within the repository
 */
export function validateParameterName(parameterName: string): string_parameter_name {
    const rawParameterName = parameterName;

    for (const [start, end] of [
        ['`', '`'],
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
        ['<', '>'],
    ]) {
        if (
            parameterName.substring(0, 1) === start &&
            parameterName.substring(parameterName.length - 1, parameterName.length) === end
            // <- TODO: More universal that 1 character
        ) {
            parameterName = parameterName.substring(1, parameterName.length - 1);
            // <- TODO: More universal that 1 character
        }
    }

    // TODO: [🐠] Following try-catch block should be part of common validators logic
    try {
        /*
        Note: We don't need to check for spaces because we are going to normalize the parameter name to camelCase
        if (parameterName.includes(' ')) {
            throw new ParseError(`Parameter name cannot contain spaces`);
        }
        */

        if (parameterName.includes('.')) {
            throw new ParseError(`Parameter name cannot contain dots`);
        }

        if (parameterName.includes('/') || parameterName.includes('\\')) {
            throw new ParseError(`Parameter name cannot contain slashes`);
        }

        if (
            parameterName.includes('(') ||
            parameterName.includes(')') ||
            parameterName.includes('{') ||
            parameterName.includes('}') ||
            parameterName.includes('[') ||
            parameterName.includes(']')
        ) {
            throw new ParseError(`Parameter name cannot contain braces`);
        }

        parameterName = removeDiacritics(parameterName);
        parameterName = removeEmojis(parameterName);
        parameterName = removeQuotes(parameterName);
        parameterName = normalizeTo_camelCase(parameterName);

        if (parameterName === '') {
            throw new ParseError(`Parameter name cannot be empty`);
        }

        if (RESERVED_PARAMETER_NAMES.includes(parameterName as string_reserved_parameter_name)) {
            throw new ParseError(`{${parameterName}} is a reserved parameter name`);
        }
    } catch (error) {
        if (!(error instanceof ParseError)) {
            throw error;
        }

        throw new ParseError(
            spaceTrim(
                (block) => `
                    ${block((error as ParseError).message)}

                    Tried to validate parameter name:
                    ${block(rawParameterName)}
                `,
            ),
        );
    }

    return parameterName;
}
