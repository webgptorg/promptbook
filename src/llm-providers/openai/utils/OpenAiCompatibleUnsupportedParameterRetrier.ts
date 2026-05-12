import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import { PipelineExecutionError } from '../../../errors/PipelineExecutionError';
import type { ModelRequirements } from '../../../types/ModelRequirements';
import type { string_model_name } from '../../../types/typeAliases';
import {
    isUnsupportedParameterError,
    parseUnsupportedParameterError,
    removeUnsupportedModelRequirement,
} from '../../_common/utils/removeUnsupportedModelRequirements';

/**
 * Tracks one failed request attempt while stripping unsupported model parameters.
 */
type UnsupportedParameterAttempt = {
    modelName: string_model_name;
    unsupportedParameter?: string;
    errorMessage: string;
    stripped: boolean;
};

/**
 * Creates one unsupported-parameter retry record.
 */
function createUnsupportedParameterAttempt(options: {
    readonly modelName: string_model_name;
    readonly unsupportedParameter?: string;
    readonly errorMessage: string;
    readonly stripped: boolean;
}): UnsupportedParameterAttempt {
    return {
        modelName: options.modelName,
        unsupportedParameter: options.unsupportedParameter,
        errorMessage: options.errorMessage,
        stripped: options.stripped,
    };
}

/**
 * Formats the retry history exactly as it is reported in thrown errors.
 */
function formatUnsupportedParameterAttemptHistory(attemptStack: ReadonlyArray<UnsupportedParameterAttempt>): string {
    return attemptStack
        .map(
            (attempt, index) =>
                `  ${index + 1}. Model: ${attempt.modelName}` +
                (attempt.unsupportedParameter ? `, Stripped: ${attempt.unsupportedParameter}` : '') +
                `, Error: ${attempt.errorMessage}` +
                (attempt.stripped ? ' (stripped and retried)' : ''),
        )
        .join('\n');
}

/**
 * Tracks unsupported-parameter retries for one OpenAI-compatible model call.
 *
 * @private helper of `OpenAiCompatibleExecutionTools`
 */
export class OpenAiCompatibleUnsupportedParameterRetrier {
    private readonly attemptStack: Array<UnsupportedParameterAttempt> = [];
    private readonly retriedUnsupportedParameters = new Set<string>();

    public constructor(private readonly isVerbose: boolean | undefined) {}

    /**
     * Resolves the next retry attempt after an unsupported-parameter failure or rethrows the final error.
     */
    public resolveRetryOrThrow<TModelRequirements extends ModelRequirements>(options: {
        readonly error: Error;
        readonly modelName: string_model_name;
        readonly currentModelRequirements: TModelRequirements;
    }): TModelRequirements {
        if (!isUnsupportedParameterError(options.error)) {
            this.throwWithAttemptHistory(options.error);
        }

        const unsupportedParameter = parseUnsupportedParameterError(options.error.message);

        if (!unsupportedParameter) {
            if (this.isVerbose) {
                console.warn(
                    colors.bgYellow('Warning'),
                    'Could not parse unsupported parameter from error:',
                    options.error.message,
                );
            }
            throw options.error;
        }

        const retryKey = `${options.modelName}-${unsupportedParameter}`;
        const attempt = createUnsupportedParameterAttempt({
            modelName: options.modelName,
            unsupportedParameter,
            errorMessage: options.error.message,
            stripped: true,
        });

        if (this.retriedUnsupportedParameters.has(retryKey)) {
            this.attemptStack.push(attempt);
            throw this.createAttemptHistoryError(options.error.message);
        }

        this.retriedUnsupportedParameters.add(retryKey);

        if (this.isVerbose) {
            console.warn(
                colors.bgYellow('Warning'),
                `Removing unsupported parameter '${unsupportedParameter}' for model '${options.modelName}' and retrying request`,
            );
        }

        this.attemptStack.push(attempt);

        return removeUnsupportedModelRequirement(
            options.currentModelRequirements,
            unsupportedParameter,
        ) as TModelRequirements;
    }

    /**
     * Rethrows the original error or wraps it with the collected retry history.
     */
    private throwWithAttemptHistory(error: Error): never {
        if (this.attemptStack.length > 0) {
            throw this.createAttemptHistoryError(error.message);
        }

        throw error;
    }

    /**
     * Creates the retry-history error message shared by all OpenAI-compatible model variants.
     */
    private createAttemptHistoryError(finalErrorMessage: string): PipelineExecutionError {
        return new PipelineExecutionError(
            spaceTrim(
                (block) => `
                    All attempts failed. Attempt history:
                    ${block(formatUnsupportedParameterAttemptHistory(this.attemptStack))}
                    Final error: ${finalErrorMessage}
                `,
            ),
        );
    }
}
