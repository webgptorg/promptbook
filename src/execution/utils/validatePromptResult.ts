import { spaceTrim } from 'spacetrim';
import type { FormatCommand } from '../../commands/FORMAT/FormatCommand';
import { ExpectError } from '../../errors/ExpectError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { isValidJsonString } from '../../formats/json/utils/isValidJsonString';
import type { Expectations } from '../../pipeline/PipelineJson/Expectations';
import { extractJsonBlock } from '../../postprocessing/utils/extractJsonBlock';
import type { string_postprocessing_function_name } from '../../types/typeAliases';
import { keepUnused } from '../../utils/organization/keepUnused';
import { checkExpectations } from './checkExpectations';

/**
 * Options for validating a prompt result
 */
export type ValidatePromptResultOptions = {
    /**
     * The result string to validate
     */
    resultString: string;

    /**
     * Expectations for the result (word count, sentence count, etc.)
     */
    expectations?: Expectations;

    /**
     * Expected format of the result (e.g., 'JSON')
     */
    format?: FormatCommand['format'];

    /**
     * List of postprocessing function names that should be applied
     * Note: This is for validation purposes only - postprocessing should be done before calling this function
     */
    postprocessingFunctionNames?: ReadonlyArray<string_postprocessing_function_name>;
};

/**
 * Result of prompt result validation
 */
export type ValidatePromptResultResult = {
    /**
     * Whether the result is valid (passes all expectations and format checks)
     */
    isValid: boolean;

    /**
     * The processed result string (may be modified if format extraction was needed)
     */
    processedResultString: string;

    /**
     * Error that occurred during validation, if any
     */
    error?: ExpectError;
};

/**
 * Validates a prompt result against expectations and format requirements.
 * This function provides a common abstraction for result validation that can be used
 * by both execution logic and caching logic to ensure consistency.
 *
 * Note: [🔂] This function is idempotent.
 *
 * @param options - The validation options including result string, expectations, and format
 * @returns Validation result with processed string and validity status
 * @private internal function of `createPipelineExecutor` and `cacheLlmTools`
 */
export function validatePromptResult(options: ValidatePromptResultOptions): ValidatePromptResultResult {
    const { resultString, expectations, format } = options;

    let processedResultString = resultString;
    let validationError: ExpectError | undefined;

    try {
        // TODO: [💝] Unite object for expecting amount and format
        if (format) {
            if (format === 'JSON') {
                if (!isValidJsonString(processedResultString)) {
                    // TODO: [🏢] Do more universally via `FormatParser`

                    try {
                        processedResultString = extractJsonBlock(processedResultString);
                    } catch (error) {
                        keepUnused(
                            error,
                            // <- Note: This error is not important
                            //          ONLY important thing is the information that `resultString` does not contain valid JSON block
                        );

                        throw new ExpectError(
                            spaceTrim(
                                (block) => `
                                    Expected valid JSON string

                                    The expected JSON text:
                                    ${block(processedResultString)}
                                `,
                            ),
                        );
                    }
                }
            } else {
                throw new UnexpectedError(`Unknown format "${format}"`);
            }
        }

        // TODO: [💝] Unite object for expecting amount and format
        if (expectations) {
            checkExpectations(expectations, processedResultString);
        }

        return {
            isValid: true,
            processedResultString,
        };
    } catch (error) {
        if (error instanceof ExpectError) {
            validationError = error;
        } else {
            // Re-throw non-ExpectError errors (like UnexpectedError)
            throw error;
        }

        return {
            isValid: false,
            processedResultString,
            error: validationError,
        };
    }
}
