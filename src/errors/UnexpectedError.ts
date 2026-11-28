import { spaceTrim } from 'spacetrim';
import { ADMIN_EMAIL } from '../config';
import { getErrorReportUrl } from './utils/getErrorReportUrl';

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
                    It's probably a bug in the pipeline collection

                    Please report issue:
                    ${block(getErrorReportUrl(new Error(message)).href)}

                    Or contact us on ${ADMIN_EMAIL}

                `,
            ),
        );
        Object.setPrototypeOf(this, UnexpectedError.prototype);
    }
}
