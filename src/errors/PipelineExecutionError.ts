import type { task_id } from '../types/string_token';
import { $randomToken } from '../utils/random/$randomToken';

/**
 * This error indicates errors during the execution of the pipeline
 *
 * @public exported from `@promptbook/core`
 */
export class PipelineExecutionError extends Error {
    public readonly name = 'PipelineExecutionError';
    public readonly id?: task_id; // <- TODO: [🐙] Change to id
    public constructor(message: string) {
        // Added id parameter
        super(message);

        // TODO: [🐙] DRY - Maybe $randomId
        this.id = `error-${$randomToken(
            8 /* <- TODO: To global config + Use Base58 to avoid similar char conflicts   */,
        )}`;

        Object.setPrototypeOf(this, PipelineExecutionError.prototype);
    }
}

// TODO: [🧠][🌂] Add id to all errors
