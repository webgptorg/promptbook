import type { PostprocessingFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import type { Expectations } from '../../types/PipelineJson/Expectations';
/**
 * Gets the expectations and creates a fake text that meets the expectations
 *
 * Note: You can provide postprocessing functions to modify the text before checking the expectations
 *       The result will be the text BEFORE the postprocessing
 *
 * @private internal util for MockedFackedLlmExecutionTools
 */
export declare function $fakeTextToExpectations(expectations: Expectations, postprocessing?: Array<PostprocessingFunction>): Promise<string>;
/**
 * TODO: [💝] Unite object for expecting amount and format - use here also a format
 */
