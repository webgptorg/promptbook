import { spaceTrim } from 'spacetrim';
import type { string_semantic_version } from '../types/typeAliases';
import { PROMPTBOOK_VERSION } from '../version';

/**
 * This error type indicates that the version of the pipeline is not matching the expected version
 */
export class VersionMismatchError extends Error {
    public readonly name = 'UnexpectedError';
    public constructor(message: string, expectedVersion: string_semantic_version) {
        super(
            spaceTrim(
                (block) => `
                    ${block(message)}

                    This error indicates that there is error with compatibility

                    Expected version:
                    ${expectedVersion}

                    Current version:
                    ${PROMPTBOOK_VERSION}

                `,
            ),
        );
        Object.setPrototypeOf(this, VersionMismatchError.prototype);
    }
}
