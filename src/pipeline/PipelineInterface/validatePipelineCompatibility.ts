import { DoesNotMakeSenseError } from '../../errors/DoesNotMakeSenseError';
import type { PipelineJson } from '../PipelineJson/PipelineJson';
import { getCompatibility, GetCompatibilityOptions } from './getCompatibility';
import { getPipelineInterface } from './getPipelineInterface';
import { PipelineCompatibility } from './PipelineCompatibility';
import type { PipelineInterface } from './PipelineInterface';

/**
 * Options for `validatePipelineCompatibility` and `isPipelineCompatible` function
 *
 * @private within the `PipelineInterface` folder
 */
export type ValidatePipelineCompatibilityOptions = Pick<GetCompatibilityOptions, 'whichParameters'> & {
    /**
     * @@@
     */
    testee: PipelineJson;

    /**
     * @@@
     */
    tester: PipelineInterface;

    /**
     * @@@
     */
    expectedCompatibility?: PipelineCompatibility;
};

/**
 * Test that tested pipeline is compatible with the testee pipeline interface
 *
 * @throws {PipelineCompatibilityError} when pipeline is not compatible with the interface
 * @throws {DoesNotMakeSenseError} when expected compatibility is set to `NON_INTERSECTING` and there are no required compatibility
 * @see https://github.com/webgptorg/promptbook/discussions/171
 * @public exported from `@promptbook/core`
 */
export function validatePipelineCompatibility(options: ValidatePipelineCompatibilityOptions): void {
    const { testee, tester, expectedCompatibility, whichParameters } = options;

    if (expectedCompatibility === 'NON_INTERSECTING') {
        // TODO: [🧠] Maybe in future make
        throw new DoesNotMakeSenseError('You are trying to validate compatibility without any required compatibility');
    }

    const compatibility = getCompatibility({
        subjects: [getPipelineInterface(testee), tester],
        whichParameters,
    });
}
