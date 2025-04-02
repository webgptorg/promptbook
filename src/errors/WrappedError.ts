import { spaceTrim } from 'spacetrim';
import { really_any } from '../_packages/types.index';
import { valueToString } from '../_packages/utils.index';
import { ADMIN_EMAIL } from '../config';

/**
 * This error type indicates that somewhere in the code non-Error object was thrown and it was wrapped into the `WrappedError`
 *
 * @public exported from `@promptbook/core`
 */
export class WrappedError extends Error {
    public readonly name = 'WrappedError';
    public constructor(whatWasThrown: really_any) {
        const tag = `[🤮]`;
        console.error(tag, whatWasThrown);

        super(
            spaceTrim(
                (block) => `
                    ${block(valueToString(whatWasThrown))}

                    Note: Look for ${tag} in the console for more details
                    Note: \`WrappedError\` indicates that somewhere in the code non-Error object was thrown and it was wrapped

                    Please report issue on ${ADMIN_EMAIL}

                `,
            ),
        );
        Object.setPrototypeOf(this, WrappedError.prototype);
    }
}
