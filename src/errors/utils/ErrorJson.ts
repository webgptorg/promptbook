import { task_id } from '../../types/typeAliases';
import type { ALL_ERRORS } from '../0-index'; // <- TODO: [🤛] This should be this automatically repared to type import, but its not

/**
 * Represents a serialized error or custom Promptbook error
 *
 * Note: [🚉] This is fully serializable as JSON
 */
export type ErrorJson = {
    /**
     * The unique identifier of the error
     */
    readonly id?: task_id; // <- TODO: [🐙] Change to id

    /**
     * The type of the error
     */
    readonly name: keyof typeof ALL_ERRORS;

    /**
     * The message of the error
     */
    readonly message: string;

    /**
     * The stack trace of the error
     */
    readonly stack?: string;
};
