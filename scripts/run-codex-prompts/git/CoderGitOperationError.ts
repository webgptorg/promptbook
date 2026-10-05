import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';

/** Persistence failures are terminal and must never cause another paid implementation attempt. */
export class CoderGitOperationError extends NotAllowed {
    /** Creates a diagnostic that distinguishes an uncommitted result from a commit awaiting push. */
    public constructor(public readonly operation: 'commit' | 'push' | 'pull' | 'record', details: string) {
        super(
            spaceTrim(`
            Coder ${operation} failed. ${
                operation === 'push'
                    ? 'The local commit exists; it was not pushed.'
                    : 'The requested persistence step did not finish.'
            }

            ${details}

            Recover the saved work and retry the Git operation manually; do not rerun the coding agent for this error.
        `),
        );
        Object.setPrototypeOf(this, CoderGitOperationError.prototype);
    }
}
