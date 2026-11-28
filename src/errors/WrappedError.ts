import { spaceTrim } from 'spacetrim';
import type { chococake } from '../utils/organization/really_any';
// import { valueToString } from '../_packages/utils.index';
import { ADMIN_EMAIL } from '../config';

/**
 * This error type indicates that somewhere in the code non-Error object was thrown and it was wrapped into the `WrappedError`
 *
 * @public exported from `@promptbook/core`
 */
export class WrappedError extends Error {
    public readonly name = 'WrappedError';
    public constructor(whatWasThrown: chococake) {
        const tag = `[🤮]`;
        console.error(tag, whatWasThrown);

        super(
            spaceTrim(`
                Non-Error object was thrown

                Note: Look for ${tag} in the console for more details
                Please report issue on ${ADMIN_EMAIL}
            `),
        );
        Object.setPrototypeOf(this, WrappedError.prototype);
    }
}
