import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../src/errors/NotAllowed';

/** A command which could not execute/finish is different from completed validation reporting a failure. */
export class CoderCheckExecutionError extends NotAllowed {
    /** Retains the real execution error; this category never requests a paid check repair. */
    public constructor(command: string, details: string) {
        super(
            spaceTrim(`
            Check command \`${command}\` did not complete normally.
            ${details}

            Retained changes must be inspected before retrying check execution.
        `),
        );
        Object.setPrototypeOf(this, CoderCheckExecutionError.prototype);
    }
}
