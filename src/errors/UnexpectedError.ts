import { spaceTrim } from 'spacetrim';

/**
 * This error type indicates that the error should not happen and its last check before crashing with some other error
 * 
 * @public exported from `@promptbook/core`
 */
export class UnexpectedError extends Error {
    public readonly name = 'UnexpectedError';
    public constructor(message: string) {
        super(
            spaceTrim(
                (block) => `
                    ${block(message)}

                    Note: This error should not happen.
                    It's probbably a bug in the pipeline collection

                    Please report issue:
                    https://github.com/webgptorg/promptbook/issues

                    Or contact us on me@pavolhejny.com

                `,
            ),
        );
        Object.setPrototypeOf(this, UnexpectedError.prototype);
    }
}
