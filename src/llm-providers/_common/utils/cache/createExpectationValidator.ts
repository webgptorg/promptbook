import { ExpectError } from '../../../../errors/ExpectError';
import { isValidJsonString } from '../../../../formats/json/utils/isValidJsonString';
import { extractJsonBlock } from '../../../../postprocessing/utils/extractJsonBlock';
import type { Expectations } from '../../../../pipeline/PipelineJson/Expectations';
import type { Prompt } from '../../../../types/Prompt';
import type { PromptResult } from '../../../../execution/PromptResult';
import { checkExpectations } from '../../../../execution/utils/checkExpectations';
import type { CacheValidationResult } from './CacheValidationResult';

/**
 * Creates a validation function that checks if LLM results meet expectations and format requirements.
 * This function can be used with cacheLlmTools to prevent caching of results that don't meet criteria.
 *
 * @returns A validation function that can be used with CacheLlmToolsOptions.validateForCaching
 * @public exported from `@promptbook/core`
 */
export function createExpectationValidator(): (prompt: Prompt, result: PromptResult) => CacheValidationResult {
    return (prompt: Prompt, result: PromptResult): CacheValidationResult => {
        const resultContent = result.content;

        if (!resultContent) {
            return {
                shouldCache: false,
                suppressionReason: 'Result content is null or undefined',
            };
        }

        // Only validate string content - embedding vectors don't need expectation validation
        if (typeof resultContent !== 'string') {
            return {
                shouldCache: true, // Cache embedding vectors without validation
            };
        }

        try {
            // Check format requirements
            if (prompt.format) {
                if (prompt.format === 'JSON') {
                    if (!isValidJsonString(resultContent)) {
                        // Try to extract JSON block as a fallback
                        try {
                            extractJsonBlock(resultContent);
                        } catch (error) {
                            return {
                                shouldCache: false,
                                expectationError: new ExpectError('Expected valid JSON string'),
                                suppressionReason: 'Result does not contain valid JSON format',
                            };
                        }
                    }
                } else {
                    return {
                        shouldCache: false,
                        suppressionReason: `Unknown format "${prompt.format}" - cannot validate`,
                    };
                }
            }

            // Check expectations (length, word count, etc.)
            if (prompt.expectations) {
                try {
                    checkExpectations(prompt.expectations as Expectations, resultContent);
                } catch (error) {
                    if (error instanceof ExpectError) {
                        return {
                            shouldCache: false,
                            expectationError: error,
                            suppressionReason: `Expectations not met: ${error.message}`,
                        };
                    }
                    throw error; // Re-throw non-ExpectError errors
                }
            }

            // All validations passed
            return {
                shouldCache: true,
            };
        } catch (error) {
            // Unexpected error during validation
            return {
                shouldCache: false,
                suppressionReason: `Validation error: ${error}`,
            };
        }
    };
}

/**
 * TODO: [🧠] Consider adding more validation options:
 * - Custom validation functions
 * - Regex pattern matching
 * - Content quality checks
 * - Language detection
 * TODO: [🧠] Consider making this configurable with options for different validation strategies
 */
