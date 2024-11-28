import { DoesNotMakeSenseError } from '../../errors/DoesNotMakeSenseError';
import { NotYetImplementedError } from '../../errors/NotYetImplementedError';
import { PipelineCompatibility } from './PipelineCompatibility';
import type { PipelineInterface } from './PipelineInterface';

/**
 * Options for `getCompatibility` function
 *
 * @private within the `PipelineInterface` folder
 */
export type GetCompatibilityOptions = {
    /**
     * Pipelines or pipeline interfaces to compare
     *
     * Note: This is symmetric operation, so the order of pipelines or interfaces does not matter
     */
    subjects: ReadonlyArray</* TODO: [😵] PipelineJson |*/ PipelineInterface>;

    /**
     * Which parameters to compare
     *
     * @default 'allParameters'
     */
    whichParameters: 'allParameters' | 'inputParameters' | 'outputParameters';
};

/**
 * Gets level of compatibility between two pipelines or pipeline interfaces
 *
 * @throws {DoesNotMakeSenseError} when there are zero or one pipeline(s)
 * @see https://github.com/webgptorg/promptbook/discussions/171
 *
 * @public exported from `@promptbook/core`
 */
export function getCompatibility(
    options: GetCompatibilityOptions,
    // <- TODO: ...pipelineInterfaces: ReadonlyArray<PipelineInterface>
): PipelineCompatibility {
    const { subjects, whichParameters = 'allParameters' } = options;

    if (subjects.length === 0) {
        throw new DoesNotMakeSenseError('Get compatibility of zero pipelines just does not make sense');
    }

    if (subjects.length === 1) {
        throw new DoesNotMakeSenseError(
            'Get compatibility between one pipeline just does not make sense, technically it will be always identical',
        );
    }

    if (subjects.length !== 2) {
        throw new NotYetImplementedError('We can only compare two pipeline interfaces at the moment');
    }

    const [subject1, subject2] = subjects;


    for(const parameterKeys of whichParameters==='allParameters'?['inputParameters', 'outputParameters']: [whichParameters]){
        for (const parameter of subject1[parameterKeys as 'inputParameters' | 'outputParameters']) {
            const { name,  } = parameter;

            if (isInput) {
                // pipelineInterface.inputParameters.push(parameter as TODO_any);
            }

            if (isOutput) {
                // pipelineInterface.outputParameters.push(parameter as TODO_any);
            }
        }

    }
}
/**
 * TODO: !!!!!! Write unit test
 * TODO: [😵]
 */
