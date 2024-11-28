import type { PipelineJson } from '../PipelineJson/PipelineJson';
import { getPipelineInterface } from './getPipelineInterface';
import { isInterfaceCompatible } from './isInterfaceCompatible';
import { isPipelineInterfacesEqual } from './isPipelineInterfacesEqual';
import type { PipelineInterface } from './PipelineInterface';

/**
 * Options for `isPipelineCompatible` function
 *
 * @see https://github.com/webgptorg/promptbook/discussions/171
 */
export type isPipelineCompatibleOptions = {
    /**
     * @@@
     */
    testee: PipelineJson;

    /**
     * @@@
     */
    tester: PipelineInterface;
};

/**
 * Test that tested pipeline is compatible with the testee pipeline interface
 *
 * @see https://github.com/webgptorg/promptbook/discussions/171
 *
 * @public exported from `@promptbook/core`
 */
export function isPipelineCompatible(options: isPipelineCompatibleOptions): boolean {
    const { testee, tester } = options;

    return isInterfaceCompatible({
        testee: getPipelineInterface(testee),
        tester,
    });
}
/**
 * TODO: !!!!!! Write unit test
 */
