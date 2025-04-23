import spaceTrim from 'spacetrim';

/**
 * Converts a JavaScript Object Notation (JSON) string into an object.
 *
 * Note: This is wrapper around JSON.parse() with better error and type handling
 *
 * @public exported from `@promptbook/utils`
 */
export function jsonParse<T>(value: string) {
    if (value === undefined) {
        throw new Error(`Can not parse JSON from undefined value.`);
    } else if (typeof value !== 'string') {
        console.error('Can not parse JSON from non-string value.', { text: value });
        throw new Error(
            spaceTrim(
                `
                    Can not parse JSON from non-string value.

                    The value type: ${typeof value}
                    See more in console.
                `,
            ),
        );
    }

    try {
        return JSON.parse(value) as T;
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }

        throw new Error(
            spaceTrim(
                (block) => `
                    ${block((error as Error).message)}
            
                    The JSON text:
                    ${block(value)}
                `,
            ),
        );
    }
}

/**
 * TODO: !!!! Use this ACRY instead of `JSON.parse`
 * TODO: !!!! Use in Promptbook.studio
 */
