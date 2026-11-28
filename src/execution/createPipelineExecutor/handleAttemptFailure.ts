import { spaceTrim } from 'spacetrim';
import type { PartialDeep, Promisable } from 'type-fest';
import { ExpectError } from '../../errors/ExpectError';
import { PipelineExecutionError } from '../../errors/PipelineExecutionError';
import type { TODO_string } from '../../utils/organization/TODO_string';
import type { PipelineExecutorResult } from '../PipelineExecutorResult';
import type { $OngoingTaskResult } from './$OngoingTaskResult';

/**
 * Stores one failed attempt, reports the expectation error, and throws the aggregated retry error after the final
 * regular attempt.
 *
 * @private function of `executeAttempts`
 */
export function handleAttemptFailure(options: {
    /**
     * Expectation error raised by the current attempt.
     */
    readonly error: ExpectError;

    /**
     * Zero-based attempt index for the current execution loop.
     */
    readonly attemptIndex: number;

    /**
     * Maximum number of attempts for the current task type.
     */
    readonly maxAttempts: number;

    /**
     * Maximum number of model execution attempts for prompt tasks.
     */
    readonly maxExecutionAttempts: number;

    /**
     * Callback invoked with partial progress updates.
     */
    onProgress(newOngoingResult: PartialDeep<PipelineExecutorResult>): Promisable<void>;

    /**
     * String identifier for the pipeline, used for error reporting.
     */
    readonly pipelineIdentification: string;

    /**
     * Mutable per-task execution state.
     */
    readonly $ongoingTaskResult: $OngoingTaskResult;
}): void {
    const {
        error,
        attemptIndex,
        maxAttempts,
        maxExecutionAttempts,
        onProgress,
        pipelineIdentification,
        $ongoingTaskResult,
    } = options;

    $ongoingTaskResult.$expectError = error;
    $ongoingTaskResult.$failedResults.push({
        attemptIndex,
        result: $ongoingTaskResult.$resultString,
        error,
    });

    onProgress({
        errors: [error],
    });

    if (attemptIndex !== maxAttempts - 1) {
        return;
    }

    throw new PipelineExecutionError(
        spaceTrim(
            (block) => `
                LLM execution failed ${maxExecutionAttempts}x

                ${block(pipelineIdentification)}

                The Prompt:
                ${block(quoteMultilineText($ongoingTaskResult.$prompt?.content || ''))}

                All Failed Attempts:
                ${block(createFailuresSummary($ongoingTaskResult.$failedResults))}
            `,
        ),
    );
}

/**
 * Renders the retry history into the aggregated final error body.
 */
function createFailuresSummary($failedResults: $OngoingTaskResult['$failedResults']): string {
    return $failedResults
        .map((failure) =>
            spaceTrim(
                (block) => `
                    Attempt ${failure.attemptIndex + 1}:
                    Error ${failure.error?.name || ''}:
                    ${block(quoteMultilineText(failure.error?.message || ''))}

                    Result:
                    ${block(
                        failure.result === null ? 'null' : quoteMultilineText(spaceTrim(failure.result as TODO_string)),
                    )}
                `,
            ),
        )
        .join('\n\n---\n\n');
}

/**
 * Formats multiline text as a quoted markdown block.
 */
function quoteMultilineText(text: string): string {
    return text
        .split(/\r?\n/)
        .map((line) => `> ${line}`)
        .join('\n');
}
