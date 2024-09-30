import { spaceTrim } from 'spacetrim';

/**
 * This error type indicates that some tools are missing for pipeline execution or preparation
 *
 * @public exported from `@promptbook/core`
 */
export class MissingToolsError extends Error {
    public readonly name = 'MissingToolsError';
    public constructor(message: string) {
        super(
            spaceTrim(
                (block) => `
                    ${block(message)}

                    Note: You have probbably forgot to provide some tools for pipeline execution or preparation

                `,
            ),
        );
        Object.setPrototypeOf(this, MissingToolsError.prototype);
    }
}
