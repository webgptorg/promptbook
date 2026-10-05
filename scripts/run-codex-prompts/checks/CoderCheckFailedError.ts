import { NotAllowed } from '../../../src/errors/NotAllowed';

/** A real check failure after the bounded feedback policy, which must not start another round of retries. */
export class CoderCheckFailedError extends NotAllowed {
    /** Creates a check failure with the selected command's diagnostic output. */
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, CoderCheckFailedError.prototype);
    }
}
