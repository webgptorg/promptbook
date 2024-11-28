import { DoesNotMakeSenseError } from '../../errors/DoesNotMakeSenseError';
import { number_percent } from '../../types/typeAliases';
import { PipelineCompatibility } from './PipelineCompatibility';


/**
 * @private within the `PipelineInterface` folder
 */
const COMPATIBILITY_LEVELS: Record<PipelineCompatibility, number_percent> = {
    IDENTICAL_INTERFACE: 1,
    IDENTICAL_NAMES: 0.8,
    INTERSECTING: 0.5,
    NON_INTERSECTING: 0,
};

/**
 * Gets lowest common compatibility among multiple compatibilities
 *
 * @thrpws {DoesNotMakeSenseError} when there are zero compatibilities
 * @see https://github.com/webgptorg/promptbook/discussions/171
 *
 * @public exported from `@promptbook/core`
 */
export function getLowestCommonCompatibility(
    ...compatibilities: ReadonlyArray<PipelineCompatibility>
): PipelineCompatibility {
    if (compatibilities.length === 0) {
        throw new DoesNotMakeSenseError('You are trying to get lowest common compatibility of zero compatibilities');
    }

    const level = compatibilities.reduce((lowestCommonCompatibility, compatibility) => {
        return Math.min(lowestCommonCompatibility, COMPATIBILITY_LEVELS[compatibility]);
    }, 1);

    return Object.keys(COMPATIBILITY_LEVELS).find(
        (key) => COMPATIBILITY_LEVELS[key as PipelineCompatibility] === level,
    ) as PipelineCompatibility;
}