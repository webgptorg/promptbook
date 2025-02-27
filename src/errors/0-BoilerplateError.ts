/**
 * This error indicates @@@
 *
 * @public exported from `@promptbook/core`
 */
export class BoilerplateError extends Error {
	public readonly name = "BoilerplateError";
	public constructor(message: string) {
		super(message);
		Object.setPrototypeOf(this, BoilerplateError.prototype);
	}
}

/**
 * TODO: @@@ Do not forget to add the error into `0-index.ts` ERRORS
 */
