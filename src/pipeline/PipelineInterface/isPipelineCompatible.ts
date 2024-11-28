import { PipelineCompatibilityError } from '../../errors/PipelineCompatibilityError';
import { validatePipelineCompatibility, ValidatePipelineCompatibilityOptions } from './validatePipelineCompatibility';

/**
 * Test that tested pipeline is compatible with the testee pipeline interface
 *
 * @returns {boolean} whether the pipeline is compatible with the interface
 * @throws {DoesNotMakeSenseError} when expected compatibility is set to `NON_INTERSECTING` and there are no required compatibility
 * @see https://github.com/webgptorg/promptbook/discussions/171
 * @public exported from `@promptbook/core`
 */
export function isPipelineCompatible(options: ValidatePipelineCompatibilityOptions): boolean {
    try {
        validatePipelineCompatibility(options);
        return true;
    } catch (error) {
        if (!(error instanceof PipelineCompatibilityError)) {
            throw error;
        }

        return false;
    }
}
/**
 * TODO: !!!!!!! Write unit test
 */
