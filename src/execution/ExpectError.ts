/**
 * This error occurs when some expectation is not met in the execution of the pipeline
 */
export class ExpectError extends Error {
    public readonly name = 'ExpectError';
    public constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, ExpectError.prototype);
    }
}

/**
 * TODO: [🧠] Should be this exported from the library
 */
