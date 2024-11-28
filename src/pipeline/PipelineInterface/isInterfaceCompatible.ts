import type { PipelineJson } from '../PipelineJson/PipelineJson';
import { getPipelineInterface } from './getPipelineInterface';
import { isPipelineInterfacesEqual } from './isPipelineInterfacesEqual';
import type { PipelineInterface } from './PipelineInterface';

/**
 * Options for `isInterfaceCompatible` function
 *
 * @see https://github.com/webgptorg/promptbook/discussions/171
 */
export type isInterfaceCompatibleOptions = {
    /**
     * @@@
     */
    testee: PipelineInterface;

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
export function isInterfaceCompatible(options: isInterfaceCompatibleOptions): boolean {
    const { testee, tester } = options;


    for (const key of ['inputParameters', 'outputParameters'] as Array<keyof PipelineInterface>) {

      
    
    }
    
}
/**
 * TODO: !!!!!! Write unit test
 */
